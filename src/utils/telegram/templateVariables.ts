export interface TemplateVariables {
	hasDesc: boolean;
	/** True when the template uses {{tags}} or {{tags:N}} (selected tags). */
	hasTags: boolean;
	/** True when the template uses {{all_tags}} or {{all_tags:N}} (deprecated; backward compat only). */
	hasAllTags: boolean;
	hasSource: boolean;
	hasAuthor: boolean;
	hasAuthorUrl: boolean;
}

/**
 * Regexes mirror the replacements in buildCaption.ts renderTemplate.
 *
 * {{tags}}            — selected tags (all enabled by default)
 * {{tags:N}}          — selected tags (first N enabled by default; N must be a positive integer)
 * {{tags:invalid}}    — treated as {{tags}} (no crash, fallback to all tags)
 * {{all_tags}}        — deprecated alias for {{tags}}; detected for UI backward compat
 */
const RE_TAGS = /\{\{tags(?::[^}]*)?\}\}/i;
const RE_ALL_TAGS = /\{\{all_?tags(?::[^}]*)?\}\}/i;
const RE_DESC = /\{\{desc(?:ription)?\}\}/i;
const RE_SOURCE = /\{\{source(?:_url)?\}\}/i;
const RE_AUTHOR_URL = /\{\{author_url\}\}/i;
const RE_AUTHOR = /\{\{author\}\}/i;

export function getTemplateVariables(template: string): TemplateVariables {
	if (!template?.trim()) {
		return {
			hasDesc: false, hasTags: false, hasAllTags: false,
			hasSource: false, hasAuthor: false, hasAuthorUrl: false,
		};
	}
	return {
		hasDesc:      RE_DESC.test(template),
		hasTags:      RE_TAGS.test(template),
		hasAllTags:   RE_ALL_TAGS.test(template),
		hasSource:    RE_SOURCE.test(template),
		hasAuthor:    RE_AUTHOR.test(template),
		hasAuthorUrl: RE_AUTHOR_URL.test(template),
	};
}

/**
 * Returns the first valid positive-integer tag limit from a {{tags:N}} modifier,
 * or null if none found (meaning all tags are enabled by default).
 *
 * {{tags:3}}   → 3
 * {{tags}}     → null
 * {{tags:abc}} → null  (invalid → all tags)
 * {{tags:0}}   → null  (non-positive → all tags)
 */
export function parseTagsLimit(template: string): number | null {
	const m = /\{\{tags:([^}]*)\}\}/i.exec(template);
	if (!m) return null;
	const n = parseInt(m[1].trim(), 10);
	return Number.isInteger(n) && n > 0 ? n : null;
}

export const DEFAULT_TEMPLATE = '{{desc}}\n\n{{tags}}\n\n{{source}}';
