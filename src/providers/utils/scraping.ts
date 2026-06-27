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
