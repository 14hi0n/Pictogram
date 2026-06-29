import { BaseProvider } from '@/providers/interfaces/BaseProvider';
import { MediaItem } from '@/models/MediaItem';
import { MediaType } from '@/models/MediaType';
import { MediaCandidate } from '@/models/MediaCandidate';
import { MediaElementNotFoundError } from '@/providers/errors';
import { TagItem } from '@/models/TagItem';
import { formatToHashtag } from '@/utils/text';
import { queryAllFallback } from '@/providers/utils/scraping';

export class ZeroChan implements BaseProvider {
	public getDomain(): string {
		return 'www.zerochan.net';
	}

	public matches(url: URL): boolean {
		const host = url.hostname;
		if (host !== 'www.zerochan.net' && host !== 'zerochan.net') return false;
		// Только страницы постов: /743034 — исключаем галереи и прочее
		return /^\/\d+$/.test(url.pathname);
	}

	public collectMediaItem(): MediaItem {
		let element: HTMLElement | undefined;
		let mediaUrl: string;
		let thumbnailUrl: string | undefined;

		// Desktop: якорь #large > a.preview содержит href на полный файл и img-превью
		const anchor = document.querySelector<HTMLAnchorElement>('#large > a.preview');
		if (anchor) {
			const img = anchor.querySelector<HTMLImageElement>('img') ?? undefined;
			element = img;
			thumbnailUrl = img?.src;
			mediaUrl = anchor.href || this.getFullUrl();
		} else {
			// Mobile: три картинки [пред., текущая, след.] в #large > ul;
			// текущая — второй элемент. img.src = 600px превью, полный файл — из кнопки скачивания
			const img = document.querySelector<HTMLImageElement>('#large ul li:nth-child(2) img') ?? undefined;
			element = img;
			thumbnailUrl = img?.src;
			const downloadBtn = document.querySelector<HTMLAnchorElement>('a.download-button[href]');
			mediaUrl = downloadBtn?.href || this.getFullUrl();
		}

		const hashtags = this.getTags();
		const { authorName, authorUrl } = this.getAuthor();

		// static.zerochan.net has hotlink protection — HEAD from a service worker gets 403.
		// skipProbe=true tells MediaResolver to skip HTTP validation for this candidate.
		const mediaCandidates: MediaCandidate[] = [
			{ url: mediaUrl, type: 'photo', source: 'zerochan', skipProbe: true, priority: 1 },
		];

		return {
			element,
			mediaUrl,
			mediaType: MediaType.Photo,
			pageUrl: window.location.href,
			extension: mediaUrl.split('.').pop()?.split('?')[0] ?? 'jpg',
			tagName: 'IMG',
			sourceUrl: window.location.href,
			hashtags,
			authorName,
			authorUrl,
			mediaCandidates,
			thumbnailUrl,
		};
	}

	private getTags(): TagItem[] {
		const groups = [
			{
				label: 'character',
				// Desktop: data-tag на <li>; Mobile: data-tag на <a> внутри <li>
				selectors: [
					'#tags li.character a[data-tag]',
					'#tags li.character[data-tag]',
					'#tags li[data-type="character"] a[data-tag]',
				],
			},
			{
				label: 'series',
				selectors: [
					'#tags li.series a[data-tag]',
					'#tags li.series[data-tag]',
					'#tags li[data-type="series"] a[data-tag]',
				],
			},
			{
				label: 'studio',
				selectors: [
					'#tags li.studio a[data-tag]',
					'#tags li.studio[data-tag]',
					'#tags li[data-type="studio"] a[data-tag]',
				],
			},
		];

		const result: TagItem[] = [];

		for (const { label, selectors } of groups) {
			const els = queryAllFallback<HTMLElement>(selectors);
			if (els.length === 0) continue;

			const tags = els
				.map(el => el.getAttribute('data-tag') ?? '')
				.filter(Boolean)
				.map(formatToHashtag);

			if (tags.length > 0) result.push({ label, tags });
		}

		return result;
	}

	private getAuthor(): { authorName?: string; authorUrl?: string } {
		// Студия/автор — li.studio > a с data-tag; работает и на десктопе, и на мобайле
		const studioLink = document.querySelector<HTMLAnchorElement>(
			'#tags li.studio a[href][data-tag], #tags li[data-type="studio"] a[href][data-tag]'
		);
		if (studioLink) {
			const name = studioLink.getAttribute('data-tag') ?? studioLink.textContent?.trim();
			const href = studioLink.getAttribute('href');
			return {
				authorName: name,
				authorUrl: href ? new URL(href, location.origin).href : undefined,
			};
		}

		// Резерв: JSON-LD author.name
		try {
			const ld = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
			const data = JSON.parse(ld?.textContent ?? '{}');
			const name: string = data?.author?.name?.trim();
			if (name) {
				// Zerochan использует /Name+With+Spaces для страниц тегов
				const path = '/' + encodeURIComponent(name).replace(/%20/g, '+');
				return {
					authorName: name,
					authorUrl: new URL(path, 'https://www.zerochan.net').href,
				};
			}
		} catch {}

		return {};
	}

	// Полный URL изображения: приоритет JSON-LD contentUrl
	private getFullUrl(): string {
		try {
			const ld = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
			const data = JSON.parse(ld?.textContent ?? '{}');
			if (data?.contentUrl) return data.contentUrl;
		} catch {}
		throw new MediaElementNotFoundError('ZeroChan: no full image URL found');
	}
}
