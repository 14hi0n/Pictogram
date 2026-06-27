import { BaseProvider } from '@/providers/interfaces/BaseProvider';
import { MediaItem } from '@/models/MediaItem';
import { MediaType } from '@/models/MediaType';
import { MediaElementNotFoundError } from '@/providers/errors';
import { TagItem } from '@/models/TagItem';
import { formatToHashtag } from '@/utils/text';

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
		const anchor = document.querySelector<HTMLAnchorElement>('#large > a.preview');
		if (!anchor) throw new MediaElementNotFoundError('#large > a.preview');

		const img = anchor.querySelector<HTMLImageElement>('img');
		if (!img) throw new MediaElementNotFoundError('#large > a.preview > img');

		// href якоря — прямая ссылка на полное разрешение
		const mediaUrl = anchor.href || this.getUrlFromLd();
		const hashtags = this.getTags();
		const { authorName, authorUrl } = this.getAuthor();

		return {
			element: img,
			mediaUrl,
			mediaType: MediaType.Photo,
			pageUrl: window.location.href,
			extension: mediaUrl.split('.').pop()?.split('?')[0] ?? 'jpg',
			tagName: 'IMG',
			sourceUrl: window.location.href,
			hashtags,
			authorName,
			authorUrl,
		};
	}

	private getTags(): TagItem[] {
		const groups = [
			{ label: 'character', selector: '#tags li.character[data-tag]' },
			{ label: 'series',    selector: '#tags li.series[data-tag]' },
			{ label: 'studio',    selector: '#tags li.studio[data-tag]' },
		];

		const result: TagItem[] = [];

		for (const { label, selector } of groups) {
			const els = document.querySelectorAll<HTMLElement>(selector);
			if (els.length === 0) continue;

			const tags = Array.from(els)
				.map(el => el.getAttribute('data-tag') ?? '')
				.filter(Boolean)
				.map(formatToHashtag);

			if (tags.length > 0) result.push({ label, tags });
		}

		return result;
	}

	private getAuthor(): { authorName?: string; authorUrl?: string } {
		// Студия/автор — в теге li.studio, у него есть и data-tag (имя) и href (ссылка)
		const studioLink = document.querySelector<HTMLAnchorElement>('#tags li.studio a[href][data-tag]');
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

	// Резерв для mediaUrl из JSON-LD (на случай если #large отсутствует)
	private getUrlFromLd(): string {
		try {
			const ld = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
			const data = JSON.parse(ld?.textContent ?? '{}');
			if (data?.contentUrl) return data.contentUrl;
		} catch {}
		throw new MediaElementNotFoundError('script[type="application/ld+json"] contentUrl');
	}
}
