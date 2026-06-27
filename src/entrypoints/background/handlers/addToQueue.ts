import { PostQueueItem } from '@/models/PostQueueItem';
import { PostQueueManager } from '@/services/PostQueueManager';
import { UserSettingsManager } from '@/services/UserSettingsManager';
import { defaultPostSettings } from '@/models/PostSettings';
import { TagItem } from '@/models/TagItem';
import { parseTagsLimit } from '@/utils/telegram/templateVariables';
import { AddToQueueMsg, SendResponse } from '../types';

const queueManager = new PostQueueManager();
const settingsManager = new UserSettingsManager();

/**
 * Обрабатывает добавление медиа в очередь постов.
 * Создаёт PostQueueItem с дефолтными настройками активного канала.
 *
 * @param message - Сообщение с данными медиа (mediaUrl, mediaType, pageUrl, sourceUrl, hashtags)
 * @param sendResponse - Callback для ответа content script
 */
export async function handleAddToQueue(message: AddToQueueMsg, sendResponse: SendResponse): Promise<void> {
	try {
		const { mediaUrl, mediaType, pageUrl, sourceUrl, hashtags, title, authorName, authorUrl, customDescription, additionalMediaUrls, mediaCandidates } = message.data;

		// Collect all URLs: primary + any additional pages (multi-image artworks)
		const allUrls: string[] = [mediaUrl, ...(Array.isArray(additionalMediaUrls) ? additionalMediaUrls : [])];

		// Берём дефолтные настройки из активного канала
		const activeChannel = await settingsManager.getActiveChannel();
		const channelDefaults = activeChannel?.defaults ?? { ...defaultPostSettings };

		// Derive initial excluded tags from the channel template's {{tags:N}} modifier.
		// If {{tags:N}} found, enable only the first N tags; otherwise enable all.
		const allDetectedTags = (hashtags as TagItem[] || []).flatMap((g) => g.tags);
		const channelTemplate = channelDefaults.captionTemplate || '';
		const tagsLimit = parseTagsLimit(channelTemplate);
		const initialExcludedTags = tagsLimit !== null ? allDetectedTags.slice(tagsLimit) : [];

		const seen = new Set<string>();
		for (const url of allUrls) {
			if (!url || seen.has(url)) continue;
			seen.add(url);

			const item: PostQueueItem = {
				id: crypto.randomUUID(),
				mediaUrl: url,
				mediaType,
				pageUrl: pageUrl ?? '',
				sourceUrl,
				hashtags: hashtags || [],
				targetChannelID: activeChannel?.chatID ?? null,
				settings: {
					...channelDefaults,
					// New items always use the channel's template at render time.
					// captionTemplate is blank; rendering reads from channel.defaults.
					captionTemplate: '',
					captionTemplateMode: 'channel_default',
					customDescription: customDescription || '',
					excludedTags: [...initialExcludedTags],
					tagSelectionMode: 'auto',
				},
				enabled: true,
				addedAt: Date.now(),
				title: title || undefined,
				authorName: authorName || undefined,
				authorUrl: authorUrl || undefined,
				// mediaCandidates apply to the primary URL only; additional Pixiv pages use URL-based source inference
				mediaCandidates: url === mediaUrl && mediaCandidates?.length ? mediaCandidates : undefined,
			};

			await queueManager.addItem(item);
		}

		// Обновляем бейдж (показывает количество в очереди)
		const count = await queueManager.getCount();
		await updateBadge(count);

		sendResponse({ ok: true });
	} catch (error: any) {
		console.error('[addToQueue]', error);
		sendResponse({ ok: false, error: error.message });
	}
}

/**
 * Обновляет бейдж иконки расширения с количеством элементов в очереди.
 * При 0 — очищает бейдж.
 */
async function updateBadge(count: number): Promise<void> {
	chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
	chrome.action.setBadgeBackgroundColor({ color: '#0088cc' });
}
