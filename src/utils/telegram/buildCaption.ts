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
 * {{author}} ({{author:name}} / {{author:url}}), {{source}} ({{source:url}}).
 *
 * {{all_tags}} / {{all_tags:N}} - deprecated; rendered as {{tags}} for backward compat.
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
		// User explicitly edited tag selection - respect their excludedTags as-is.
		const excluded = new Set(settings.excludedTags);
		selectedTags = allTags.filter((t) => !excluded.has(t));
	} else {
		// Auto mode: apply {{tags:N}} limit from the template if present.
		// No limit → all tags; excludedTags in auto mode is UI init state only
		// and may be stale if the channel template modifier was later removed.
		const limit = parseTagsLimit(template);
		if (limit !== null) {
			selectedTags = allTags.slice(0, limit);
		} else {
			selectedTags = allTags;
		}
	}

	const urls = normalizeUrls(sourceUrl);

	let result = template.replace(/\{\{desc(?:ription)?\}\}/gi, settings.customDescription.trim());
	result = substituteVar(result, 'author', (mod) => resolveAuthor(mod, meta));
	result = substituteVar(result, 'source', (mod) => resolveSource(mod, urls));

	return result
		// {{tags}} and {{tags:N}}: render effective selected tags
		.replace(/\{\{tags(?::[^}]*)?\}\}/gi, selectedTags.join(' '))
		// {{all_tags}} / {{all_tags:N}}: deprecated - render selected tags for backward compat
		.replace(/\{\{all_?tags(?::[^}]*)?\}\}/gi, selectedTags.join(' '))
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

// ── Модификаторы ──────────────────────────────────────────────────────────────

/**
 * Заменяет {{name}} / {{name:modifier}} в шаблоне, передавая значение модификатора
 * (или null, если он не указан) в resolver. Единая точка для переменных, чья
 * substring-замена зависит от модификатора конкретного совпадения.
 */
function substituteVar(
	template: string,
	name: string,
	resolve: (modifier: string | null) => string,
): string {
	const re = new RegExp(`\\{\\{${name}(?::([^}]*))?\\}\\}`, 'gi');
	return template.replace(re, (_match, mod?: string) => resolve(mod ? mod.trim().toLowerCase() : null));
}

function resolveAuthor(modifier: string | null, meta: PostMeta): string {
	const name = meta.authorName?.trim() ?? '';
	const url  = meta.authorUrl?.trim() ?? '';
	if (modifier === 'name') return name;
	if (modifier === 'url')  return url;
	if (name && url) return `<a href="${url}">${name}</a>`;
	return name || url;
}

function resolveSource(modifier: string | null, urls: string[]): string {
	if (urls.length === 0) return '';
	if (modifier === 'url') return urls.join(' | ');
	return buildSourceLinks(urls);
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
