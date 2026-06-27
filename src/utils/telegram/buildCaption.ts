import { TagItem } from '@/models/TagItem';
import { PostSettings } from '@/models/PostSettings';
import { parseTagsLimit } from '@/utils/telegram/templateVariables';

export interface PostMeta {
	title?: string;
	authorName?: string;
	authorUrl?: string;
}

/**
 * Формирует HTML-подпись для Telegram-поста.
 *
 * Шаблонные переменные: {{desc}}, {{tags}}, {{tags:N}},
 * {{author}}, {{author_url}}, {{source}}.
 *
 * {{all_tags}} / {{all_tags:N}} — deprecated; rendered as {{tags}} for backward compat.
 *
 * {{tags:N}} initial tag selection is applied at queue creation time (addToQueue.ts),
 * so at render time both {{tags}} and {{tags:N}} simply render the non-excluded tags.
 *
 * @param hashtags  - Сгруппированные теги поста
 * @param sourceUrl - Ссылка на источник; строка или массив (для групп)
 * @param settings  - Настройки поста
 * @param meta      - Провайдерные мета-данные (title, authorName, authorUrl)
 */
export function buildCaption(
	hashtags: TagItem[],
	sourceUrl: string | string[],
	settings: PostSettings,
	meta: PostMeta = {},
): string {
	if (settings.captionTemplate?.trim()) {
		return renderTemplate(settings.captionTemplate, hashtags, sourceUrl, settings, meta);
	}

	// ── Авто-режим ────────────────────────────────────────────────────────────
	const parts: string[] = [];
	const excluded = new Set(settings.excludedTags);

	if (settings.customDescription.trim()) {
		parts.push(settings.customDescription.trim());
	}

	if (settings.includeCharacterTags) {
		const tags = hashtags
			.filter((g) => g.label !== 'copyright')
			.flatMap((g) => g.tags)
			.filter((t) => !excluded.has(t));
		if (tags.length > 0) parts.push(tags.join(' '));
	}

	if (settings.includeCopyrightTags) {
		const group = hashtags.find((g) => g.label === 'copyright');
		if (group) {
			const tags = group.tags.filter((t) => !excluded.has(t));
			if (tags.length > 0) parts.push(tags.join(' '));
		}
	}

	if (!settings.disableLinks) {
		const links = buildSourceLinks(normalizeUrls(sourceUrl));
		if (links) parts.push(links);
	}

	return parts.join('\n').trim();
}

// ── Шаблонный режим ───────────────────────────────────────────────────────────

function renderTemplate(
	template: string,
	hashtags: TagItem[],
	sourceUrl: string | string[],
	settings: PostSettings,
	meta: PostMeta,
): string {
	const allTags = hashtags.flatMap((g) => g.tags);
	const isManual = settings.tagSelectionMode === 'manual';

	let selectedTags: string[];
	if (isManual) {
		// User explicitly edited tag selection — respect their excludedTags as-is.
		const excluded = new Set(settings.excludedTags);
		selectedTags = allTags.filter((t) => !excluded.has(t));
	} else {
		// Auto mode: apply {{tags:N}} limit from the template if present.
		// This covers quick send (no excludedTags pre-init) and fresh queue items.
		const limit = parseTagsLimit(template);
		if (limit !== null) {
			selectedTags = allTags.slice(0, limit);
		} else {
			const excluded = new Set(settings.excludedTags);
			selectedTags = allTags.filter((t) => !excluded.has(t));
		}
	}

	const sourceLinks = buildSourceLinks(normalizeUrls(sourceUrl));

	return template
		.replace(/\{\{desc(?:ription)?\}\}/gi, settings.customDescription.trim())
		.replace(/\{\{author_url\}\}/gi, meta.authorUrl ?? '')
		.replace(/\{\{author\}\}/gi, meta.authorName ?? '')
		// {{tags}} and {{tags:N}}: render effective selected tags
		.replace(/\{\{tags(?::[^}]*)?\}\}/gi, selectedTags.join(' '))
		// {{all_tags}} / {{all_tags:N}}: deprecated — render selected tags for backward compat
		.replace(/\{\{all_?tags(?::[^}]*)?\}\}/gi, selectedTags.join(' '))
		.replace(/\{\{source(?:_url)?\}\}/gi, sourceLinks)
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

// ── Вспомогательные ──────────────────────────────────────────────────────────

function normalizeUrls(sourceUrl: string | string[]): string[] {
	const arr = Array.isArray(sourceUrl) ? sourceUrl : [sourceUrl];
	// Дедупликация с сохранением порядка
	return arr.filter((u, i, a) => u.trim() && a.indexOf(u) === i);
}

function buildSourceLinks(urls: string[]): string {
	if (urls.length === 0) return '';
	if (urls.length === 1) return `<a href="${urls[0]}">источник</a>`;
	return urls.map((u, i) => `<a href="${u}">источник ${i + 1}</a>`).join(' | ');
}
