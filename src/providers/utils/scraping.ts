import { TagSelector, MediaElement } from '@/types';
import { TagItem } from '@/models/TagItem';
import { formatToHashtag } from '../../utils/text';

export function getHashtags(tagSelectors: TagSelector[]): TagItem[] {
	const hashtagGroup: TagItem[] = [];

	for (const { selector, label } of tagSelectors) {
		const elements = document.querySelectorAll<HTMLElement>(selector);
		if (elements.length === 0) continue;

		const tags = Array.from(elements)
			.map(el => formatToHashtag(el.textContent || ''))
			.filter(Boolean);

		hashtagGroup.push({ label: label || '', tags });
	}

	return hashtagGroup;
}

export function getMediaUrlByMediaElement(mediaElement: MediaElement): string {
	if ('src' in mediaElement && mediaElement.src) {
		return mediaElement.src;
	}

	const src = mediaElement.querySelector('[src]')?.getAttribute('src');
	if (!src) throw new Error('Media url not found');

	return src;
}

/**
 * Returns the first element matching any selector in the list, or null if none found.
 * Tries each selector in order — use for single-element lookups with desktop/mobile fallbacks.
 */
export function queryFallback<T extends Element>(selectors: string[]): T | null {
	for (const sel of selectors) {
		try {
			const el = document.querySelector<T>(sel);
			if (el) return el;
		} catch {}
	}
	return null;
}

/**
 * Returns all elements matched by the first selector in the list that yields any results.
 * Use for multi-element lookups (e.g. tag lists) where mobile and desktop use different attributes.
 */
export function queryAllFallback<T extends Element>(selectors: string[]): T[] {
	for (const sel of selectors) {
		try {
			const els = document.querySelectorAll<T>(sel);
			if (els.length > 0) return Array.from(els);
		} catch {}
	}
	return [];
}
