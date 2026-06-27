import { MediaItem } from '@/models/MediaItem';

export interface ProviderMediaTarget {
	/** DOM element used for panel positioning (the artwork img). */
	element: HTMLElement;
	/** Full-resolution URL for this specific image page. */
	mediaUrl: string;
	/** Zero-based page index within the artwork. */
	index: number;
}

export interface BaseProvider {
	getDomain(): string;
	collectMediaItem(): MediaItem;
	matches?(url: URL): boolean;
	findAnchorElement?(): Element | null;
	findMediaTargets?(): ProviderMediaTarget[];
}
