import { MediaItem } from '@/models/MediaItem';

// /**
//  * Extract the hashtags from a mediaGroup.
//  *
//  * @param {Array} mediaGroup - The mediaGroup object.
//  *
//  * @returns {Array<Object>} An array of object containing the totle and tags.
//  */
export function extractHashtags(mediaGroup: MediaItem[]) {
	const hashtags: Record<string, Set<string>> = {};

	mediaGroup.forEach((item) => {
		if (!item.hashtags) return hashtags;

		item.hashtags.forEach(({ label, tags }) => {
			if (!hashtags[label]) hashtags[label] = new Set();

			tags.map((tag) => hashtags[label].add(tag));
		});
	});

	return Object.entries(hashtags).map(([title, tags]) => ({
		title,
		tags: [...tags],
	}));
}
