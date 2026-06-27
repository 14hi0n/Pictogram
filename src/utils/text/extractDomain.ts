/**
 * Extracts the domain from a given URL.
 *
 * @param {string} url - The URL from which to extract the domain.
 * @returns {string} The extracted domain or an empty sting if not found.
 *
 * @example
 * const url = 'https://www.example.com/path/to/page';
 * const domain = extractDomain(url);
 * // Returns: 'example.com'
 */
export function extractDomain(url: string): string | null {
	const domainRegex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/;
	const matches = url.match(domainRegex);

	return matches ? matches[1] : null;
}
