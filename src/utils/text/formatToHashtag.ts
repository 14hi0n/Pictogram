/**
 * Formats the sting into a hashtag.
 *
 * @param {string} text - The input string.
 * @returns {string} The hashtag string.
 *
 */
export function formatToHashtag(text: string): string {
	return (
		'#' +
		text
			.replace(/\(.*?\)/gu, '')
			.replace(/[^\p{L}\p{N}\s]|_/gu, '')
			.trim()
			.replace(/\s+/gu, '_')
			.toLowerCase()
	);
}
