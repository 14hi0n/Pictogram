export interface PostSettings {
	customDescription: string;
	/** Шаблон подписи: пусто = подпись не добавляется. Переменные: {{desc}}, {{tags}}, {{tags:N}}, {{author}} ({{author:name}}/{{author:url}}), {{source}} ({{source:url}}) */
	captionTemplate: string;
	includeCharacterTags: boolean;
	includeCopyrightTags: boolean;
	disableLinks: boolean;
	/** Теги явно исключённые пользователем внутри включённой категории */
	excludedTags: string[];
	/**
	 * 'auto'   - excludedTags was derived from the caption template tag limit (initial state)
	 * 'manual' - user has explicitly toggled tags; template limit no longer applies on re-open
	 * Omitted/undefined is treated as 'auto'.
	 */
	tagSelectionMode?: 'auto' | 'manual';
	/**
	 * 'channel_default' - use the target channel's captionTemplate at render time
	 * 'custom'          - use item.settings.captionTemplate as an explicit override
	 * Omitted/undefined → infer from captionTemplate content (backward compat)
	 */
	captionTemplateMode?: 'channel_default' | 'custom';
}

export const defaultPostSettings: PostSettings = {
	customDescription: '',
	captionTemplate: '',
	includeCharacterTags: true,
	includeCopyrightTags: true,
	disableLinks: false,
	excludedTags: [],
};
