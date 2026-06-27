import { ref } from 'vue';
import type { PostQueueItem } from '@/models/PostQueueItem';
import { isGroupItem, type QueueEntry } from '@/models/PostQueueGroupItem';
import { STORAGE_KEYS } from '@/shared/constants/storage';

export function useQueueSync() {
	const isInQueue   = ref(false);
	const channelName = ref('');

	function checkUrlInQueue(q: QueueEntry[], url: string): boolean {
		return q.some(e =>
			isGroupItem(e)
				? e.members.some(m => m.pageUrl === url)
				: e.pageUrl === url
		);
	}

	function checkMediaUrlInQueue(q: QueueEntry[], mediaUrl: string): boolean {
		return q.some(e => !isGroupItem(e) && (e as PostQueueItem).mediaUrl === mediaUrl);
	}

	async function syncSingle(url: string): Promise<void> {
		return new Promise(resolve => {
			chrome.storage.local.get(STORAGE_KEYS.QUEUE, data => {
				const q: QueueEntry[] = data[STORAGE_KEYS.QUEUE] || [];
				isInQueue.value = checkUrlInQueue(q, url);
				resolve();
			});
		});
	}

	async function syncMulti<T extends { mediaUrl: string; isInQueue: boolean }>(
		panels: T[]
	): Promise<void> {
		return new Promise(resolve => {
			chrome.storage.local.get(STORAGE_KEYS.QUEUE, data => {
				const q: QueueEntry[] = data[STORAGE_KEYS.QUEUE] || [];
				for (const p of panels) p.isInQueue = checkMediaUrlInQueue(q, p.mediaUrl);
				resolve();
			});
		});
	}

	async function loadChannelName(): Promise<void> {
		return new Promise(resolve => {
			chrome.storage.sync.get(STORAGE_KEYS.SETTINGS, data => {
				const s = data[STORAGE_KEYS.SETTINGS] || {};
				const ch = (s.channels || []).find((c: any) => c.chatID === s.activeChatID);
				channelName.value = ch?.name || '';
				resolve();
			});
		});
	}

	return {
		isInQueue,
		channelName,
		checkUrlInQueue,
		checkMediaUrlInQueue,
		syncSingle,
		syncMulti,
		loadChannelName,
	};
}
