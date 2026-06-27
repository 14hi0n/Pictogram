import { MediaType } from './MediaType';
import { TagItem } from './TagItem';
import { PostSettings } from './PostSettings';
import { PostQueueItem } from './PostQueueItem';

/** Один элемент медиагруппы (упорядоченный, только данные для отправки) */
export interface GroupMember {
	id: string;
	mediaUrl: string;
	mediaType: MediaType;
	sourceUrl: string;
	pageUrl: string;
}

/**
 * Группа постов — отправляется в Telegram как один альбом (media group).
 * Хранится в очереди рядом с обычными PostQueueItem.
 */
export interface PostQueueGroupItem {
	type: 'group';
	id: string;
	/** Упорядоченный список медиа (пользователь может менять порядок) */
	members: GroupMember[];
	/** Оригинальные PostQueueItem — для возможности разгруппировать обратно */
	originalItems: PostQueueItem[];
	/** Объединённые + дедуплицированные теги со всех постов */
	hashtags: TagItem[];
	targetChannelID: string | null;
	settings: PostSettings;
	enabled: boolean;
	addedAt: number;
}

/** Любой элемент очереди — одиночный или группа */
export type QueueEntry = PostQueueItem | PostQueueGroupItem;

export function isGroupItem(entry: QueueEntry): entry is PostQueueGroupItem {
	return 'type' in entry && (entry as PostQueueGroupItem).type === 'group';
}
