export type MediaSource = 'pixiv' | 'danbooru' | 'generic';
export type MediaCandidateType = 'photo' | 'video' | 'gif';

/** One candidate URL for a media item, with priority and source context. */
export interface MediaCandidate {
	url: string;
	type: MediaCandidateType;
	source: MediaSource;
	/** Higher number = tried first. Defaults to 0. */
	priority?: number;
}

export interface ValidatedMedia {
	url: string;
	type: MediaCandidateType;
	/** Content-Type header from probe, if available. */
	contentType?: string;
}
