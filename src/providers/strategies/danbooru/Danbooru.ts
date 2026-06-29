import { MediaElement, TagSelector } from '@/types';
import { StaticProvider } from '@/providers/interfaces/StaticProvider';
import { MediaItem } from '@/models/MediaItem';
import { MediaType } from '@/models/MediaType';
import { MediaCandidate, MediaCandidateType } from '@/models/MediaCandidate';
import { MediaElementNotFoundError } from '@/providers/errors';
import { getHashtags, getMediaUrlByMediaElement, queryFallback } from '@/providers/utils/scraping';

export class Danbooru implements StaticProvider {
	private readonly _domain: string = 'danbooru.donmai.us';

	readonly mediaSelector: string[] = [
		'img#image',                        // Основной: id="image" уникален на странице поста
		'video#image',                      // Видео-посты: <video id="image">
		'section.image-container > picture > img', // Альтернативный layout: img внутри <picture>
		'section.image-container img',      // Мобайл-fallback: любой img внутри контейнера
	];

	// Источник поста: <li id="post-info-source"><a rel="external noreferrer nofollow" href="URL">...</a></li>
	readonly sourceSelector: string[] = ['li#post-info-source > a[rel="external noreferrer nofollow"]'];

	readonly tags: TagSelector[] = [
		{
			label: 'character',
			selector: 'ul.character-tag-list a.search-tag',
		},
		{
			label: 'copyright',
			selector: 'ul.copyright-tag-list a.search-tag, ul.copyright-tag-list li > a[href*="tags="]',
		},
		{
			label: 'artist',
			selector: 'ul.artist-tag-list a.search-tag, ul.artist-tag-list li > a[href*="tags="]',
		},
		{
			label: 'general',
			selector: 'ul.general-tag-list a.search-tag, ul.general-tag-list li > a[href*="tags="]',
		},
	];

	public collectMediaItem(): MediaItem {
		// Selectors tried in order — queryFallback returns first that matches,
		// avoiding CSS union behaviour where document order wins over selector priority.
		const mediaElement = queryFallback<MediaElement>(this.mediaSelector);
		if (!mediaElement) throw new MediaElementNotFoundError(this.mediaSelector.join(', '));
		const container = document.querySelector('section.image-container[data-file-url]') as HTMLElement | null;

		const isVideo = mediaElement.tagName.toUpperCase() === 'VIDEO';
		const mediaType = isVideo ? MediaType.Video : MediaType.Photo;

		// The rendered URL is what the browser actually loaded — always a sample/large version
		// for big images, or the original for small ones. This is the correct URL for Telegram.
		// data-file-url (original) is intentionally NOT used as a candidate: it can exceed
		// Telegram's 5 MB URL-download limit and triggers "wrong type of the web page content".
		const renderedUrl = isVideo
			? getMediaUrlByMediaElement(mediaElement)
			: this.getRenderedImageUrl(mediaElement as HTMLImageElement);

		// data-large-file-url is Danbooru's explicit sample version — useful as a fallback
		// in case the browser-rendered URL fails, but only when it's a sample (not original).
		const largeFileUrl = container?.dataset.largeFileUrl ?? container?.dataset.sampleUrl;

		const sourceUrl = document.querySelector<HTMLAnchorElement>(this.sourceSelector.join(','))?.href ?? window.location.href;
		const hashTags = getHashtags(this.tags);

		// Artist tag links for {{author}} and {{author_url}}.
		// Cast to HTMLAnchorElement so .href gives the absolute URL without manual construction.
		const artistEls = document.querySelectorAll<HTMLAnchorElement>(
			'ul.artist-tag-list a.search-tag, ul.artist-tag-list li > a[href*="tags="]'
		);
		const authorName = artistEls.length > 0
			? Array.from(artistEls).map(el => el.textContent?.trim() ?? '').filter(Boolean).join(', ')
			: undefined;
		// First artist link gives the tag-search URL (absolute via .href); empty string if no artist.
		const authorUrl = artistEls.length > 0 ? (artistEls[0].href || undefined) : undefined;

		const candidateType: MediaCandidateType = isVideo ? 'video' : 'photo';

		// Priority order: rendered DOM image (highest) → img.src fallback → sample CDN (lowest).
		// All candidates are sample/preview URLs (originals are intentionally excluded).
		// skipProbe=true: cdn.donmai.us is accessible but declarativeNetRequest Referer rules
		// only apply to image resource type, not service-worker fetch — probing would 403 on mobile.
		const mediaCandidates: MediaCandidate[] = [
			{ url: renderedUrl, type: candidateType, source: 'danbooru', skipProbe: true, priority: 3 },
		];

		if (!isVideo) {
			const imgSrc = (mediaElement as HTMLImageElement).src;
			// If currentSrc (e.g. WebP from <picture>) differs from src (JPEG fallback), add both
			if (imgSrc && imgSrc !== renderedUrl) {
				mediaCandidates.push({ url: imgSrc, type: 'photo', source: 'danbooru', skipProbe: true, priority: 2 });
			}
		}

		// Tertiary: data-large-file-url — only include if it is a sample (not original)
		if (largeFileUrl && !largeFileUrl.includes('/original/') && largeFileUrl !== renderedUrl) {
			const sampleExt = largeFileUrl.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
			const sampleType: MediaCandidateType = (sampleExt === 'mp4' || sampleExt === 'webm') ? 'video' : 'photo';
			mediaCandidates.push({ url: largeFileUrl, type: sampleType, source: 'danbooru', skipProbe: true, priority: 1 });
		}

		// data-preview-file-url is no longer present in Danbooru's HTML.
		// Derive the 180×180 thumbnail from data-file-url, which is always present.
		// cdn.donmai.us serves all previews at /180x180/{ab}/{cd}/{md5}.jpg.
		// The CDN is publicly accessible (no Referer needed) and has ACAO: *.
		const fileUrl = container?.dataset.fileUrl;
		const previewUrl = fileUrl?.includes('cdn.donmai.us/original/')
			? fileUrl.replace('/original/', '/180x180/').replace(/\.[^.]+$/, '.jpg')
			: undefined;

		return {
			element: mediaElement,
			mediaUrl: renderedUrl,
			mediaType,
			pageUrl: window.location.href,
			extension: renderedUrl.split('.').pop()?.split('?')[0] ?? '',
			sourceUrl,
			hashtags: hashTags,
			authorName,
			authorUrl,
			mediaCandidates,
			thumbnailUrl: previewUrl,
		};
	}

	public getDomain(): string {
		return this._domain;
	}

	/**
	 * Returns the URL the browser actually loaded for a Danbooru image element.
	 * - currentSrc reflects the <picture><source srcset> selection (e.g. WebP sample).
	 * - Falls back to src (JPEG fallback inside <picture>, or the standalone img src).
	 * - Never returns data-file-url (original); that is only on the container dataset.
	 */
	private getRenderedImageUrl(img: HTMLImageElement): string {
		if (img.currentSrc) return img.currentSrc;
		if (img.src) return img.src;

		// Last resort: <picture><source srcset="..."> if both currentSrc and src are empty
		const picture = img.closest('picture');
		if (picture) {
			const source = picture.querySelector<HTMLSourceElement>('source[srcset]');
			if (source?.srcset) {
				const first = source.srcset.split(',')[0].trim().split(' ')[0];
				if (first) return first;
			}
		}

		return getMediaUrlByMediaElement(img as unknown as MediaElement);
	}
}
