export type MediaSource = string;
export type MediaCandidateType = 'photo' | 'video' | 'gif';

/** One candidate URL for a media item, with priority and source context. */
export interface MediaCandidate {
	url: string;
	type: MediaCandidateType;
	source: MediaSource;
	/** Higher number = tried first. Defaults to 0. */
	priority?: number;
	/**
	 * When true, MediaResolver skips HTTP probing for this candidate.
	 * Set by providers whose CDN blocks service-worker requests
	 * (e.g. requires Referer, hotlink protection, or no CORS headers).
	 */
	skipProbe?: boolean;
}

export interface ValidatedMedia {
	url: string;
	type: MediaCandidateType;
	/** Content-Type header from probe, if available. */
	contentType?: string;
}
