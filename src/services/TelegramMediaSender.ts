import { TELEGRAM_API_URL } from '@/constants';
import { MediaType } from '@/models/MediaType';
import { PostQueueItem } from '@/models/PostQueueItem';
import { PostQueueGroupItem } from '@/models/PostQueueGroupItem';
import { UserSettingsManager } from './UserSettingsManager';
import { buildCaption, PostMeta } from '@/utils/telegram/buildCaption';
import { Channel } from '@/models/Channel';
import { PostSettings, defaultPostSettings } from '@/models/PostSettings';
import { TagItem } from '@/models/TagItem';
import { MediaCandidate, MediaCandidateType, MediaSource } from '@/models/MediaCandidate';
import { MediaResolver } from './MediaResolver';

function resolveItemTemplate(settings: PostSettings, channelDefaultTemplate: string): string {
	if (settings.captionTemplateMode === 'custom') return settings.captionTemplate ?? '';
	if (settings.captionTemplateMode === 'channel_default') return channelDefaultTemplate;
	// Backward compat: undefined → infer from captionTemplate content
	return settings.captionTemplate?.trim() ? settings.captionTemplate : channelDefaultTemplate;
}

/**
 * Сервис отправки медиа в Telegram через Bot API.
 * Поддерживает одиночные фото/видео и групповые отправки (2-10 элементов).
 */
export class TelegramMediaSender {
	private settings = new UserSettingsManager();
	private resolver = new MediaResolver();

	/**
	 * Отправляет один элемент очереди в Telegram.
	 * Использует sendPhoto/sendVideo/sendAnimation в зависимости от типа медиа.
	 *
	 * @param item - Элемент очереди для отправки
	 */
	async sendQueueItem(item: PostQueueItem): Promise<void> {
		const channel = await this.resolveChannel(item.targetChannelID);

		const template = resolveItemTemplate(item.settings, channel.defaults.captionTemplate);
		const meta: PostMeta = { title: item.title, authorName: item.authorName, authorUrl: item.authorUrl };
		const caption = template.trim()
			? buildCaption(item.hashtags, item.sourceUrl, { ...item.settings, captionTemplate: template }, meta)
			: '';

		const candidates = this.buildCandidates(item.mediaCandidates, item.mediaUrl, item.mediaType);
		const resolved = await this.resolver.resolve(candidates);
		const resolvedMediaType = this.resolveMediaType(resolved.contentType, item.mediaType);

		await this.sendSingleMedia(channel.botToken, channel.chatID, resolved.url, resolvedMediaType, caption);
	}

	/**
	 * Отправляет несколько элементов очереди.
	 * Если элементы идут в один канал — отправляет как группу (sendMediaGroup).
	 * Иначе — каждый по отдельности.
	 *
	 * @param items - Элементы для отправки (должны быть enabled)
	 */
	async sendQueueItems(items: PostQueueItem[]): Promise<void> {
		if (items.length === 0) return;
		if (items.length === 1) {
			await this.sendQueueItem(items[0]);
			return;
		}

		// Группируем по целевому каналу
		const byChannel = new Map<string, PostQueueItem[]>();

		for (const item of items) {
			const channel = await this.resolveChannel(item.targetChannelID);
			const key = channel.chatID;

			if (!byChannel.has(key)) {
				byChannel.set(key, []);
			}
			byChannel.get(key)!.push(item);
		}

		for (const [, group] of byChannel) {
			if (group.length === 1) {
				await this.sendQueueItem(group[0]);
			} else {
				// Разбиваем на пачки по 10 (лимит Telegram)
				for (let i = 0; i < group.length; i += 10) {
					await this.sendMediaGroup(group.slice(i, i + 10));
				}
			}
		}
	}

	/**
	 * Быстрая отправка медиа напрямую из content script.
	 * Использует активный канал и дефолтные настройки.
	 *
	 * @param mediaUrl - URL медиафайла
	 * @param mediaType - Тип медиа
	 * @param sourceUrl - URL источника
	 * @param mediaCandidates - Приоритизированный список кандидатов (опционально)
	 */
	async quickSend(
		mediaUrl: string,
		mediaType: MediaType,
		sourceUrl: string,
		hashtags: TagItem[] = [],
		meta: PostMeta = {},
		mediaCandidates?: MediaCandidate[],
	): Promise<void> {
		const channel = await this.settings.getActiveChannel();

		if (!channel) {
			throw new Error('Активный канал не выбран. Добавьте канал в настройках.');
		}

		const template = channel.defaults.captionTemplate;
		const caption = template.trim()
			// excludedTags: [] — quick send has no per-item tag exclusions; use detected tags as-is
			? buildCaption(hashtags, sourceUrl, { ...defaultPostSettings, ...channel.defaults, excludedTags: [] }, meta)
			: '';

		const candidates = this.buildCandidates(mediaCandidates, mediaUrl, mediaType);
		const resolved = await this.resolver.resolve(candidates);
		const resolvedMediaType = this.resolveMediaType(resolved.contentType, mediaType);

		await this.sendSingleMedia(channel.botToken, channel.chatID, resolved.url, resolvedMediaType, caption);
	}

	/**
	 * Отправляет группу постов как Telegram media group (альбом).
	 * Поддерживает только photo/video. Подпись — только на первый элемент.
	 * При >10 элементах разбивает на несколько групп.
	 */
	async sendGroupQueueItem(item: PostQueueGroupItem): Promise<void> {
		const channel = await this.resolveChannel(item.targetChannelID);

		const compatible = item.members.filter(
			(m) => m.mediaType === MediaType.Photo || m.mediaType === MediaType.Video
		);

		if (compatible.length === 0) {
			throw new Error('Нет совместимых медиа (поддерживаются только фото и видео)');
		}

		if (compatible.length > 10) {
			throw new Error(
				`Группа содержит ${compatible.length} медиа, Telegram ограничивает до 10. ` +
				'Разгруппируйте и создайте группы по ≤10.'
			);
		}

		// Use originalItems for candidate lookup (GroupMember has no mediaCandidates field)
		const origById = new Map(item.originalItems.map(o => [o.id, o]));

		// Resolve all URLs upfront so a bad URL fails fast before any Telegram API calls
		const resolvedMembers = await Promise.all(
			compatible.map(async member => {
				const orig = origById.get(member.id);
				const candidates = this.buildCandidates(orig?.mediaCandidates, member.mediaUrl, member.mediaType);
				const resolved = await this.resolver.resolve(candidates);
				const resolvedMediaType = this.resolveMediaType(resolved.contentType, member.mediaType);
				return { ...member, mediaUrl: resolved.url, mediaType: resolvedMediaType };
			})
		);

		// Собираем все уникальные источники в порядке элементов
		const sourceUrls = resolvedMembers
			.map((m) => m.sourceUrl)
			.filter((url, idx, arr) => url.trim() && arr.indexOf(url) === idx);

		const template = resolveItemTemplate(item.settings, channel.defaults.captionTemplate);
		const caption = template.trim()
			? buildCaption(item.hashtags, sourceUrls, { ...item.settings, captionTemplate: template })
			: '';

		if (resolvedMembers.length === 1) {
			await this.sendSingleMedia(
				channel.botToken, channel.chatID,
				resolvedMembers[0].mediaUrl, resolvedMembers[0].mediaType, caption
			);
			return;
		}

		const media = resolvedMembers.map((m, idx) => ({
			type: m.mediaType === MediaType.Photo ? 'photo' : 'video',
			media: m.mediaUrl,
			...(idx === 0 && caption ? { caption, parse_mode: 'HTML' } : {}),
		}));

		await this.apiRequest(channel.botToken, 'sendMediaGroup', {
			chat_id: channel.chatID,
			media: JSON.stringify(media),
		});
	}

	// ──────────────────────────────────────────────────────────────────────────
	// Приватные методы
	// ──────────────────────────────────────────────────────────────────────────

	/**
	 * Определяет канал по ID или возвращает активный.
	 */
	private async resolveChannel(targetChannelID: string | null): Promise<Channel> {
		const settings = await this.settings.getSettings();

		if (targetChannelID) {
			const channel = settings.channels.find((c) => c.chatID === targetChannelID);
			if (channel) return channel;
		}

		const active = await this.settings.getActiveChannel();
		if (!active) {
			throw new Error('Активный канал не выбран. Добавьте канал в настройках.');
		}

		return active;
	}

	/**
	 * Constructs a candidate list for the resolver.
	 * If the caller already provides candidates, they are used as-is.
	 * Otherwise a single fallback candidate is derived from the raw mediaUrl,
	 * with source inferred from the URL host (pximg.net → pixiv, cdn.donmai.us → danbooru).
	 */
	private buildCandidates(
		candidates: MediaCandidate[] | undefined,
		mediaUrl: string,
		mediaType: MediaType,
	): MediaCandidate[] {
		if (candidates?.length) return candidates;

		const type: MediaCandidateType =
			mediaType === MediaType.Video ? 'video' :
			mediaType === MediaType.Animation ? 'gif' : 'photo';

		// Infer source from URL for backward-compat items added before mediaCandidates was introduced
		let source: MediaSource = 'generic';
		if (mediaUrl.includes('pximg.net')) source = 'pixiv';
		else if (mediaUrl.includes('cdn.donmai.us')) source = 'danbooru';
		else if (mediaUrl.includes('static.zerochan.net')) source = 'zerochan';

		return [{ url: mediaUrl, type, source, priority: 1 }];
	}

	/**
	 * Picks the MediaType to use when sending, upgrading/downgrading based on what the
	 * resolved URL actually is (e.g. original ZIP replaced by sample WebM).
	 */
	private resolveMediaType(contentType: string | undefined, original: MediaType): MediaType {
		if (contentType?.startsWith('video/')) return MediaType.Video;
		if (contentType?.startsWith('image/gif')) return MediaType.Animation;
		return original;
	}

	// Extensions Telegram Bot API can handle via URL.
	// ZIP (.zip, ugoira), Flash (.swf), and unknown extensions are rejected before the API call.
	private static readonly SUPPORTED_EXTENSIONS = new Set([
		'jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'avi',
	]);

	private assertMediaUrlSupported(url: string): void {
		const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
		if (!TelegramMediaSender.SUPPORTED_EXTENSIONS.has(ext)) {
			throw new Error(
				`Telegram не смог загрузить файл. URL не похож на прямую ссылку на изображение` +
				(ext ? ` (расширение: .${ext})` : '') +
				'. Возможно, это ugoira (.zip) или другой неподдерживаемый формат.'
			);
		}
	}

	/**
	 * Отправляет одно медиа подходящим методом Bot API.
	 */
	private async sendSingleMedia(
		botToken: string,
		chatId: string,
		mediaUrl: string,
		mediaType: MediaType,
		caption: string
	): Promise<void> {
		this.assertMediaUrlSupported(mediaUrl);

		const methodMap: Partial<Record<MediaType, string>> = {
			[MediaType.Photo]: 'sendPhoto',
			[MediaType.Video]: 'sendVideo',
			[MediaType.Animation]: 'sendAnimation',
			[MediaType.Document]: 'sendDocument',
		};

		// Для неизвестных типов отправляем как фото
		const method = methodMap[mediaType] ?? 'sendPhoto';

		// Ключ медиа зависит от метода (sendPhoto → photo, sendVideo → video и тд)
		const mediaKey = method.replace('send', '').toLowerCase();

		const body: Record<string, string> = {
			chat_id: chatId,
			[mediaKey]: mediaUrl,
			parse_mode: 'HTML',
		};

		if (caption) {
			body.caption = caption;
		}

		await this.apiRequest(botToken, method, body);
	}

	/**
	 * Отправляет группу медиа через sendMediaGroup (2-10 элементов).
	 * Telegram sendMediaGroup поддерживает только photo и video.
	 * Animation (GIF) и Document отправляются отдельно через sendQueueItem.
	 * Подпись добавляется только к первому элементу совместимой группы.
	 */
	private async sendMediaGroup(items: PostQueueItem[]): Promise<void> {
		// Telegram sendMediaGroup accepts only photo and video
		const compatible = items.filter(
			(i) => i.mediaType === MediaType.Photo || i.mediaType === MediaType.Video
		);
		const incompatible = items.filter(
			(i) => i.mediaType !== MediaType.Photo && i.mediaType !== MediaType.Video
		);

		// Send unsupported types (Animation, Document) individually — do not silently drop them
		for (const item of incompatible) {
			await this.sendQueueItem(item);
		}

		if (compatible.length === 0) return;

		// Single compatible item — use regular send instead of album
		if (compatible.length === 1) {
			await this.sendQueueItem(compatible[0]);
			return;
		}

		const channel = await this.resolveChannel(compatible[0].targetChannelID);

		const template = resolveItemTemplate(compatible[0].settings, channel.defaults.captionTemplate);
		const firstMeta: PostMeta = { title: compatible[0].title, authorName: compatible[0].authorName, authorUrl: compatible[0].authorUrl };
		const firstCaption = template.trim()
			? buildCaption(compatible[0].hashtags, compatible[0].sourceUrl, { ...compatible[0].settings, captionTemplate: template }, firstMeta)
			: '';

		// Resolve all URLs before building the media array
		const resolvedCompatible = await Promise.all(
			compatible.map(async item => {
				const candidates = this.buildCandidates(item.mediaCandidates, item.mediaUrl, item.mediaType);
				const resolved = await this.resolver.resolve(candidates);
				const resolvedMediaType = this.resolveMediaType(resolved.contentType, item.mediaType);
				return { ...item, mediaUrl: resolved.url, mediaType: resolvedMediaType };
			})
		);

		const media = resolvedCompatible.map((item, index) => ({
			type: item.mediaType === MediaType.Photo ? 'photo' : 'video',
			media: item.mediaUrl,
			...(index === 0 && firstCaption ? { caption: firstCaption, parse_mode: 'HTML' } : {}),
		}));

		await this.apiRequest(channel.botToken, 'sendMediaGroup', {
			chat_id: channel.chatID,
			media: JSON.stringify(media),
		});
	}

	/**
	 * Выполняет запрос к Telegram Bot API.
	 *
	 * @param botToken - Токен бота
	 * @param method - Метод API (sendPhoto, sendVideo и тд)
	 * @param body - Тело запроса
	 */
	private async apiRequest(botToken: string, method: string, body: Record<string, string>): Promise<void> {
		const url = `${TELEGRAM_API_URL}${botToken}/${method}`;

		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			let rawBody = '';
			let description = response.statusText;
			try {
				rawBody = await response.text();
				const parsed = JSON.parse(rawBody) as Record<string, unknown>;
				if (typeof parsed?.description === 'string') description = parsed.description;
			} catch { /* rawBody captured, description stays as statusText */ }
			throw new Error(
				`Telegram API error (${response.status}): ${description}` +
				(rawBody ? ` | body: ${rawBody}` : '')
			);
		}

		const data = await response.json() as Record<string, unknown>;
		if (!data.ok) {
			throw new Error(`Telegram API: ${typeof data.description === 'string' ? data.description : 'Неизвестная ошибка'}`);
		}
	}
}
