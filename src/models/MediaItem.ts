import { MediaType } from './MediaType';
import { TagItem } from './TagItem';
import { MediaCandidate } from './MediaCandidate';

/**
 * Медиа-элемент, собранный провайдером со страницы.
 * Поле element опциональное - не сериализуется при передаче между контекстами.
 */
export interface MediaItem {
	/** DOM-элемент (только в контексте content script, не передаётся в messages) */
	element?: HTMLElement;
	mediaUrl: string;
	mediaType: MediaType;
	pageUrl: string;
	extension: string;
	tagName: string;
	sourceUrl: string;
	hashtags: TagItem[] | null;
	/** Provider-supplied metadata — serialised in messages, stored on PostQueueItem */
	title?: string;
	authorName?: string;
	authorUrl?: string;
	customDescription?: string;
	/** Extra image URLs for multi-image works (pages 2..N). Page 1 is in mediaUrl. */
	additionalMediaUrls?: string[];
	/** Prioritised candidate URLs for MediaResolver. Falls back to [{url: mediaUrl}] if absent. */
	mediaCandidates?: MediaCandidate[];
}
