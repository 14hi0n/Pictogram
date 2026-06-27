import { MediaType } from '@/models/MediaType';
import { TagItem } from '@/models/TagItem';
import { MediaCandidate } from '@/models/MediaCandidate';
import { PostQueueItem } from '@/models/PostQueueItem';
import { PostQueueGroupItem } from '@/models/PostQueueGroupItem';

export type SendResponse = (response: any) => void;

/** Типы сообщений от content script → background */
export const MSG = {
	/** Быстрая отправка в активный канал */
	QUICK_SEND: 'QUICK_SEND',
	/** Добавить в очередь для редактирования в side panel */
	ADD_TO_QUEUE: 'ADD_TO_QUEUE',
	/** Отправить элементы очереди по одному (из side panel) */
	SEND_QUEUE_ITEMS: 'SEND_QUEUE_ITEMS',
	/** Отправить PostQueueGroupItem из очереди (по id) */
	SEND_GROUP_ITEM: 'SEND_GROUP_ITEM',
	/** Попросить background открыть side panel */
	OPEN_SIDE_PANEL: 'OPEN_SIDE_PANEL',
} as const;

/** Payload для QUICK_SEND и ADD_TO_QUEUE — всё из MediaItem кроме DOM-полей */
export interface MediaPayload {
	mediaUrl: string;
	mediaType: MediaType;
	pageUrl?: string;
	sourceUrl: string;
	hashtags: TagItem[] | null;
	title?: string;
	authorName?: string;
	authorUrl?: string;
	customDescription?: string;
	additionalMediaUrls?: string[];
	mediaCandidates?: MediaCandidate[];
}

export type QuickSendMsg      = { type: typeof MSG.QUICK_SEND;       data: MediaPayload };
export type AddToQueueMsg     = { type: typeof MSG.ADD_TO_QUEUE;     data: MediaPayload };
export type SendQueueItemsMsg = { type: typeof MSG.SEND_QUEUE_ITEMS; data: PostQueueItem[] };
export type SendGroupItemMsg  = { type: typeof MSG.SEND_GROUP_ITEM;  data: PostQueueGroupItem };
export type OpenSidePanelMsg  = { type: typeof MSG.OPEN_SIDE_PANEL };

export type AppMessage =
	| QuickSendMsg
	| AddToQueueMsg
	| SendQueueItemsMsg
	| SendGroupItemMsg
	| OpenSidePanelMsg;

/** @deprecated используй AppMessage */
export type Message = AppMessage;
