import { TagItem } from '@/models/TagItem';
import { PostQueueItem } from '@/models/PostQueueItem';

/**
 * Объединяет теги из нескольких постов: одинаковые label-группы сливаются,
 * дубликаты тегов удаляются, порядок групп сохраняется.
 */
export function mergeTags(items: PostQueueItem[]): TagItem[] {
	const byLabel = new Map<string, Set<string>>();

	for (const item of items) {
		for (const group of item.hashtags) {
			if (!byLabel.has(group.label)) {
				byLabel.set(group.label, new Set());
			}
			for (const tag of group.tags) {
				byLabel.get(group.label)!.add(tag);
			}
		}
	}

	return Array.from(byLabel.entries()).map(([label, tags]) => ({
		label,
		tags: Array.from(tags),
	}));
}

/**
 * Объединяет описания из нескольких постов:
 * пустые пропускаются, одинаковые не дублируются.
 */
export function mergeDescriptions(items: PostQueueItem[]): string {
	const seen = new Set<string>();
	const parts: string[] = [];

	for (const item of items) {
		const desc = item.settings.customDescription.trim();
		if (desc && !seen.has(desc)) {
			seen.add(desc);
			parts.push(desc);
		}
	}

	return parts.join('\n');
}
