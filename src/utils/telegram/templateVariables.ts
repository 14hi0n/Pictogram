export interface TemplateVariables {
	hasDesc: boolean;
	/** True when the template uses {{tags}} or {{tags:N}} (selected tags). */
	hasTags: boolean;
	/** True when the template uses {{all_tags}} or {{all_tags:N}} (deprecated; backward compat only). */
	hasAllTags: boolean;
	hasSource: boolean;
	hasAuthor: boolean;
}

/**
 * Builds a regex matching {{name}} or {{name:modifier}}, capturing the modifier value.
 * Shared shape for all variable detection/parsing below.
 */
function variableRegex(name: string): RegExp {
	return new RegExp(`\\{\\{${name}(?::([^}]*))?\\}\\}`, 'i');
}

/**
 * Regexes mirror the replacements in buildCaption.ts renderTemplate.
 *
 * {{tags}}            - selected tags (all enabled by default)
 * {{tags:N}}          - selected tags (first N enabled by default; N must be a positive integer)
 * {{tags:invalid}}    - treated as {{tags}} (no crash, fallback to all tags)
 * {{all_tags}}        - deprecated alias for {{tags}}; detected for UI backward compat
 * {{author}}          - author name wrapped in a link to author_url; {{author:name}} / {{author:url}} modifiers
 * {{source}}          - link to source labeled «источник»; {{source:url}} modifier returns the bare URL(s)
 */
const RE_TAGS = variableRegex('tags');
const RE_ALL_TAGS = /\{\{all_?tags(?::[^}]*)?\}\}/i;
const RE_DESC = /\{\{desc(?:ription)?\}\}/i;
const RE_SOURCE = variableRegex('source');
const RE_AUTHOR = variableRegex('author');

export function getTemplateVariables(template: string): TemplateVariables {
	if (!template?.trim()) {
		return {
			hasDesc: false, hasTags: false, hasAllTags: false,
			hasSource: false, hasAuthor: false,
		};
	}
	return {
		hasDesc:    RE_DESC.test(template),
		hasTags:    RE_TAGS.test(template),
		hasAllTags: RE_ALL_TAGS.test(template),
		hasSource:  RE_SOURCE.test(template),
		hasAuthor:  RE_AUTHOR.test(template),
	};
}

/**
 * Returns the modifier value of the first {{name:modifier}} match, lowercased and trimmed,
 * or null if the variable has no modifier (or isn't present at all).
 */
export function parseModifier(template: string, name: string): string | null {
	const m = variableRegex(name).exec(template);
	const mod = m?.[1]?.trim();
	return mod ? mod.toLowerCase() : null;
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
	const mod = parseModifier(template, 'tags');
	if (mod === null) return null;
	const n = parseInt(mod, 10);
	return Number.isInteger(n) && n > 0 ? n : null;
}

export const DEFAULT_TEMPLATE = '{{desc}}\n\n{{tags}}\n\n{{source}}';
