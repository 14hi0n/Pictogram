import { MediaCandidate, ValidatedMedia } from '@/models/MediaCandidate';

type ProbeOutcome =
	| { status: 'valid'; contentType: string }
	| { status: 'rejected'; reason: string }
	| { status: 'network-error'; reason: string };

/**
 * Validates candidate media URLs before they are passed to the Telegram Bot API.
 *
 * Strategy:
 *   - Sort candidates by priority (highest first).
 *   - Probe each URL with a HEAD request (falling back to a tiny GET if HEAD is blocked).
 *   - Reject URLs that return 4xx or a non-media Content-Type (HTML, ZIP).
 *   - Candidates with skipProbe=true bypass HTTP probing entirely (set by providers whose
 *     CDN blocks service-worker requests, e.g. requires Referer or has hotlink protection).
 *   - On network error the candidate is kept as a last-resort fallback so transient
 *     connectivity issues do not block sends that would otherwise succeed.
 */
export class MediaResolver {
	private static readonly PROBE_TIMEOUT_MS = 8_000;

	async resolve(candidates: MediaCandidate[]): Promise<ValidatedMedia> {
		const sorted = [...candidates].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

		let networkFallback: MediaCandidate | null = null;

		for (const candidate of sorted) {
			const probe = await this.probeCandidate(candidate);

			if (probe.status === 'valid') {
				return { url: candidate.url, type: candidate.type, contentType: probe.contentType };
			}

			if (probe.status === 'network-error') {
				if (!networkFallback) networkFallback = candidate;
			}
		}

		// All probes failed; if any failed due to network issues (not bad content), use the
		// highest-priority one as a best-effort fallback so transient errors do not break sends.
		if (networkFallback) {
			return { url: networkFallback.url, type: networkFallback.type };
		}

		throw new Error(
			'[media-resolver] No valid media URL found. Rejected: ' +
			sorted.map(c => c.url).join(', ')
		);
	}

	private async probeCandidate(candidate: MediaCandidate): Promise<ProbeOutcome> {
		if (candidate.skipProbe) {
			// Provider declared this CDN cannot be probed from a service worker context.
			return { status: 'valid', contentType: 'image/jpeg' };
		}

		try {
			const result = await this.probeUrl(candidate.url);

			if (result.status === 'error') {
				return { status: 'network-error', reason: result.reason };
			}

			if (result.httpStatus >= 400) {
				return { status: 'rejected', reason: `HTTP ${result.httpStatus}` };
			}

			const ct = result.contentType;

			// Definite non-media responses - HTML login pages, ZIP archives
			if (ct === 'text/html' || ct === 'text/plain' || ct === 'application/zip') {
				return { status: 'rejected', reason: `content-type: ${ct}` };
			}

			// Telegram URL-based sends reject files larger than 5 MB
			if (result.contentLength !== null && result.contentLength > 5 * 1024 * 1024) {
				return { status: 'rejected', reason: `file too large for URL send (${result.contentLength} bytes)` };
			}

			return { status: 'valid', contentType: ct };
		} catch (e) {
			return { status: 'network-error', reason: String(e) };
		}
	}

	private async probeUrl(url: string): Promise<
		| { status: 'ok'; httpStatus: number; contentType: string; contentLength: number | null }
		| { status: 'error'; reason: string }
	> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), MediaResolver.PROBE_TIMEOUT_MS);

		try {
			let response = await fetch(url, { method: 'HEAD', signal: controller.signal });

			if (response.status === 405 || response.status === 501) {
				// HEAD not allowed by server - use a minimal range GET instead
				response = await fetch(url, {
					method: 'GET',
					headers: { Range: 'bytes=0-255' },
					signal: controller.signal,
				});
			}

			const raw = response.headers.get('content-type') ?? '';
			const contentType = raw.split(';')[0].trim() || 'application/octet-stream';

			const clRaw = response.headers.get('content-length');
			const contentLength = clRaw !== null ? parseInt(clRaw, 10) : null;

			return { status: 'ok', httpStatus: response.status, contentType, contentLength };
		} catch (e) {
			return { status: 'error', reason: String(e) };
		} finally {
			clearTimeout(timer);
		}
	}
}
