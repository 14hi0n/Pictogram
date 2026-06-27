/**
 * A named group of hashtags collected by a provider.
 *
 * Template variable {{tags}} flattens all groups regardless of label.
 *
 * The label "copyright" is reserved for auto-mode: when `includeCharacterTags` /
 * `includeCopyrightTags` settings are enabled the copyright group is handled separately.
 * New providers that do not need this split can use any other label.
 */
export interface TagItem {
	readonly label: string;
	readonly tags: string[];
}
