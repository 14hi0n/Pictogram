import { SPAProvider, ProviderMediaTarget } from '@/providers/interfaces/SPAProvider';
import { MediaItem } from '@/models/MediaItem';
import { MediaType } from '@/models/MediaType';
import { MediaCandidate } from '@/models/MediaCandidate';
import { TagItem } from '@/models/TagItem';
import { formatToHashtag } from '@/utils/text';

/** Subset of Pixiv's per-illustration preload JSON we actually use. */
interface PixivIllustData {
	userName?: string;
	userId?: string;
	pageCount?: number;
	urls?: {
		mini?: string;
		thumb?: string;
		small?: string;
		regular?: string;
	};
}

export class Pixiv implements SPAProvider {
	private readonly _domain = 'www.pixiv.net';

	public getDomain(): string {
		return this._domain;
	}

	public matches(url: URL): boolean {
		const host = url.hostname;
		if (host !== 'www.pixiv.net' && host !== 'pixiv.net') return false;
		// Supports Japanese (/artworks/ID) and English (/en/artworks/ID) URL formats
		return /^\/(?:en\/)?artworks\/\d+/.test(url.pathname);
	}

	public findAnchorElement(): Element | null {
		const selectors = [
			'main figure img',
			'figure img',
			'main img[src*="pximg.net"]',
			'canvas',
		];
		for (const sel of selectors) {
			const el = document.querySelector(sel);
			if (el) return el;
		}
		return null;
	}

	/**
	 * Returns one target per artwork image currently visible in the DOM.
	 * Called on initial load and on every DOM change (via MutationObserver in AppContent).
	 *
	 * Detection strategy — URL-based, not DOM-structure-based:
	 *   Pixiv renders artwork images in different container structures depending on viewer
	 *   state (single view = figure, "Show all" = li or div stacks, React version, etc.).
	 *   Relying on <figure> or ancestor checks breaks across states.
	 *
	 *   Instead, filter by URL invariants that Pixiv has kept stable:
	 *     ✓  src contains pximg.net
	 *     ✓  src contains /img-master/ or /img-original/  → full artwork resolution
	 *     ✗  src contains /c/          → CDN-resized thumbnail (recs, grids, sidebar)
	 *     ✗  src contains user-profile → author avatar
	 *     ✗  inside <aside>            → sidebar widgets
	 *
	 *   Map surviving images to URL list by DOM order — Pixiv always renders pages
	 *   top-to-bottom in the same order as the page index.
	 */
	public findMediaTargets(): ProviderMediaTarget[] {
		const allUrls = this.getAllImageUrls();
		if (allUrls.length === 0) return [];

		const artworkImgs = Array.from(
			document.querySelectorAll<HTMLImageElement>('main img')
		).filter(img => {
			const src = img.src;
			if (!src || !src.includes('pximg.net')) return false;
			if (src.includes('/c/')) return false;           // CDN thumbnail
			if (src.includes('user-profile')) return false;  // avatar
			if (!src.includes('/img-master/') && !src.includes('/img-original/')) return false;
			if (img.closest('aside')) return false;          // sidebar widget
			return true;
		});

		return artworkImgs.map((el, i) => ({
			element: el,
			mediaUrl: allUrls[i] ?? allUrls[0],
			index: i,
		}));
	}

	public collectMediaItem(): MediaItem {
		const element = this.findAnchorElement();
		if (!element) throw new Error('Pixiv: artwork DOM not ready');

		const allUrls = this.getAllImageUrls();
		const mediaUrl = allUrls[0];
		const hashtags = this.getPixivTags();
		const illust = this.getPixivIllustData();
		const thumbnailUrl = illust?.urls?.thumb ?? illust?.urls?.mini;

		// pximg.net requires a Referer header that cannot be set from a service worker context.
		// skipProbe=true tells MediaResolver to skip HTTP validation for these candidates.
		const mediaCandidates: MediaCandidate[] = [
			{ url: mediaUrl, type: 'photo', source: 'pixiv', skipProbe: true, priority: 1 },
		];

		return {
			element: element as HTMLElement,
			mediaUrl,
			mediaType: MediaType.Photo,
			pageUrl: window.location.href,
			extension: mediaUrl.split('.').pop()?.split('?')[0] ?? 'jpg',
			tagName: 'IMG',
			sourceUrl: window.location.href,
			hashtags,
			title: this.getTitle(),
			authorName: this.getAuthorName(),
			authorUrl: this.getAuthorUrl(),
			additionalMediaUrls: allUrls.slice(1),
			mediaCandidates,
			thumbnailUrl: thumbnailUrl || undefined,
		};
	}

	private getIllustId(): string {
		return window.location.pathname.match(/\/artworks\/(\d+)/)?.[1] ?? '';
	}

	/**
	 * Parses #meta-preload-data once and returns the illustration record for the
	 * current artwork ID. All per-illust getters (author, URLs, page count, …) use
	 * this single parse so the JSON is never re-parsed in each individual getter.
	 */
	private getPixivIllustData(): PixivIllustData | null {
		const illustId = this.getIllustId();
		if (!illustId) return null;
		try {
			const meta = document.querySelector<HTMLMetaElement>('#meta-preload-data');
			if (!meta?.content) return null;
			const data = JSON.parse(meta.content) as { illust?: Record<string, PixivIllustData> };
			return data?.illust?.[illustId] ?? null;
		} catch {
			return null;
		}
	}

	/**
	 * Returns all image URLs for the current artwork in page order.
	 * Primary source: meta#meta-preload-data JSON (server-rendered, includes pageCount and
	 * the p0 URL from which p1..pN are derived via Pixiv filename pattern observed in
	 * meta-preload-data: …ILLUSTID_p0_master1200.jpg, where _p0 changes per page).
	 * Fallback: visible img-master / img-original elements in the artwork figure.
	 */
	private getAllImageUrls(): string[] {
		// Pattern that identifies the page indicator in Pixiv image URLs.
		// Only present in multi-image works. _p0_ → _p1_, _p2_, …
		const PAGE_RE = /(_p)\d+(?=[_.])/;

		const illust = this.getPixivIllustData();
		if (illust) {
			const pageCount = Number(illust.pageCount ?? 1);
			const baseUrl = illust.urls?.regular ?? illust.urls?.small ?? '';
			if (baseUrl && pageCount > 1) {
				// Only generate derived URLs when the page pattern is actually present.
				// If the pattern is absent (unexpected URL format), fall through to [baseUrl]
				// rather than producing N identical copies of the same URL.
				if (PAGE_RE.test(baseUrl)) {
					return Array.from({ length: pageCount }, (_, i) =>
						baseUrl.replace(PAGE_RE, `$1${i}`)
					);
				}
			}
			if (baseUrl) return [baseUrl];
		}

		// DOM fallback: artwork images only — exclude CDN-resized thumbnails (/c/SIZE/ prefix)
		const seen = new Set<string>();
		const urls: string[] = [];
		for (const img of document.querySelectorAll<HTMLImageElement>('main figure img, figure img')) {
			const src = img.src;
			if (!src) continue;
			if (!src.includes('/img-master/') && !src.includes('/img-original/')) continue;
			if (seen.has(src)) continue;
			seen.add(src);
			urls.push(src);
		}
		if (urls.length > 0) return urls;

		return [this.getImageUrl()];
	}

	private getImageUrl(): string {
		const imgEl = document.querySelector<HTMLImageElement>(
			'main figure img, figure img, main img[src*="pximg.net"]'
		);
		if (imgEl?.src) return imgEl.src;

		const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
		if (ogImage?.content) return ogImage.content;

		throw new Error('Pixiv: не удалось получить URL изображения');
	}

	private getTitle(): string {
		const h1 = document.querySelector<HTMLHeadingElement>('main h1');
		if (h1?.textContent?.trim()) return h1.textContent.trim();

		const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
		return og?.content?.trim() ?? '';
	}

	private getAuthorName(): string {
		// Primary: preload JSON is server-rendered and unambiguous.
		const illust = this.getPixivIllustData();
		if (illust?.userName) return illust.userName.trim();

		// Fallback: scoped sidebar author block — safer than meta[name="author"] which
		// can contain the site's own author tag rather than the artwork creator.
		const block = this.getPixivAuthorBlock();
		if (block) {
			const link = this.getPixivAuthorLink(block);
			const linkText = link?.textContent?.trim();
			if (linkText) return linkText;

			const avatarTitle = block.querySelector<HTMLElement>('[title]')?.getAttribute('title')?.trim();
			if (avatarTitle) return avatarTitle;

			const avatarAlt = block.querySelector<HTMLImageElement>('img[alt]')?.alt?.trim();
			if (avatarAlt) return avatarAlt;
		}

		return '';
	}

	private getAuthorUrl(): string {
		// Primary: preload JSON gives the canonical userId without DOM-order ambiguity.
		const illust = this.getPixivIllustData();
		if (illust?.userId) return `https://www.pixiv.net/users/${illust.userId}`;

		// Fallback: first profile link inside the aside author block.
		const link = this.getPixivAuthorLink(this.getPixivAuthorBlock());
		if (!link) return '';
		try {
			return new URL(link.getAttribute('href') ?? link.href, location.origin).href;
		} catch {
			return link.href || '';
		}
	}

	/**
	 * Returns the <h2> element inside Pixiv's <aside> author sidebar.
	 * This block contains the artist avatar + name and scopes all author queries
	 * away from unrelated nav links, artwork thumbnails, and Booth links.
	 */
	private getPixivAuthorBlock(): HTMLElement | null {
		const aside = document.querySelector('aside');
		if (!aside) return null;
		const h2 = aside.querySelector('h2');
		return h2 instanceof HTMLElement ? h2 : null;
	}

	/**
	 * Returns true if href points to a Pixiv user profile page only —
	 * excludes /artworks, /bookmarks, /request, /following, and Booth links.
	 */
	private isPixivUserProfileHref(href: string): boolean {
		try {
			const url = new URL(href, location.origin);
			// Must be on the same origin (pixiv.net) and match /users/ID or /en/users/ID exactly
			if (url.hostname !== location.hostname) return false;
			return /^\/(?:[a-z]{2}\/)?users\/\d+\/?$/.test(url.pathname);
		} catch {
			return false;
		}
	}

	/**
	 * Finds the first user-profile anchor inside the given author block.
	 * Scoped so it cannot accidentally match artwork or nav links outside the block.
	 */
	private getPixivAuthorLink(block: HTMLElement | null): HTMLAnchorElement | null {
		if (!block) return null;
		const links = Array.from(block.querySelectorAll<HTMLAnchorElement>('a[href]'));
		return links.find(link => this.isPixivUserProfileHref(link.getAttribute('href') ?? '')) ?? null;
	}

	private getPixivTags(): TagItem[] {
		const tagElements = document.querySelectorAll<HTMLElement>('[data-tag]');

		if (tagElements.length > 0) {
			const seen = new Set<string>();
			const tags: string[] = [];

			for (const el of tagElements) {
				const raw = el.getAttribute('data-tag') ?? '';
				if (!raw || seen.has(raw)) continue;
				seen.add(raw);
				tags.push(formatToHashtag(raw));
			}

			if (tags.length > 0) return [{ label: 'pixiv', tags }];
		}

		const tagLinks = document.querySelectorAll<HTMLAnchorElement>('a[href*="/tags/"]');
		if (tagLinks.length > 0) {
			const seen = new Set<string>();
			const tags: string[] = [];

			for (const link of tagLinks) {
				const text = link.textContent?.trim();
				if (text && !seen.has(text)) {
					seen.add(text);
					tags.push(formatToHashtag(text));
				}
			}

			if (tags.length > 0) return [{ label: 'pixiv', tags }];
		}

		return [];
	}
}
