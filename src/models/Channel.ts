import { PostSettings, defaultPostSettings } from './PostSettings';

export interface Channel {
	name: string;
	chatID: string;
	botToken: string;
	defaults: PostSettings;
}

export function createChannel(partial: Pick<Channel, 'chatID' | 'name' | 'botToken'>): Channel {
	return { ...partial, defaults: { ...defaultPostSettings } };
}

/**
 * Нормализует PostSettings из хранилища.
 * Обрабатывает все старые форматы: disableTags (bool), tagFilter (string), extraTags.
 */
function normalizePostSettings(raw: any): PostSettings {
	if (!raw) return { ...defaultPostSettings };

	const result: PostSettings = {
		customDescription: raw.customDescription ?? '',
		captionTemplate: raw.captionTemplate ?? '',
		includeCharacterTags: true,
		includeCopyrightTags: true,
		disableLinks: raw.disableLinks ?? false,
		excludedTags: Array.isArray(raw.excludedTags) ? raw.excludedTags : [],
	};

	// Старый формат: disableTags: boolean → выключаем оба типа тегов
	if (typeof raw.disableTags === 'boolean') {
		result.includeCharacterTags = !raw.disableTags;
		result.includeCopyrightTags = !raw.disableTags;
	}

	// Предыдущий формат: tagFilter: 'all'|'character'|'copyright'|'none'
	if (typeof raw.tagFilter === 'string') {
		result.includeCharacterTags = raw.tagFilter === 'all' || raw.tagFilter === 'character';
		result.includeCopyrightTags = raw.tagFilter === 'all' || raw.tagFilter === 'copyright';
	}

	// Новый формат: явные булевы поля (перекрывают миграцию выше)
	if (typeof raw.includeCharacterTags === 'boolean') result.includeCharacterTags = raw.includeCharacterTags;
	if (typeof raw.includeCopyrightTags === 'boolean') result.includeCopyrightTags = raw.includeCopyrightTags;

	return result;
}

export function normalizeChannel(raw: any): Channel {
	return {
		chatID: raw.chatID,
		name: raw.name,
		botToken: raw.botToken,
		defaults: normalizePostSettings(raw.defaults),
	};
}
