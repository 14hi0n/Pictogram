import { PostQueueItem } from '@/models/PostQueueItem';
import { PostQueueGroupItem, QueueEntry } from '@/models/PostQueueGroupItem';
import { STORAGE_KEYS } from '@/shared/constants/storage';

/**
 * Менеджер очереди постов.
 * Хранит элементы в chrome.storage.local (персистентно между сессиями).
 * Поддерживает как одиночные PostQueueItem, так и группы PostQueueGroupItem.
 */
export class PostQueueManager {
	async getQueue(): Promise<QueueEntry[]> {
		const data = await chrome.storage.local.get(STORAGE_KEYS.QUEUE);
		return (data[STORAGE_KEYS.QUEUE] as QueueEntry[]) || [];
	}

	async saveQueue(queue: QueueEntry[]): Promise<void> {
		await chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: queue });
	}

	/** Добавляет одиночный пост (с проверкой дубликата по mediaUrl) */
	async addItem(item: PostQueueItem): Promise<void> {
		const queue = await this.getQueue();

		const isDuplicate = queue.some(
			(e) => !('type' in e) && (e as PostQueueItem).mediaUrl === item.mediaUrl
		);
		if (isDuplicate) return;

		queue.push(item);
		await this.saveQueue(queue);
	}

	/** Добавляет группу постов */
	async addGroupItem(item: PostQueueGroupItem): Promise<void> {
		const queue = await this.getQueue();
		queue.push(item);
		await this.saveQueue(queue);
	}

	async removeItem(id: string): Promise<void> {
		const queue = await this.getQueue();
		await this.saveQueue(queue.filter((item) => item.id !== id));
	}

	async removeItems(ids: string[]): Promise<void> {
		const idSet = new Set(ids);
		const queue = await this.getQueue();
		await this.saveQueue(queue.filter((item) => !idSet.has(item.id)));
	}

	/** Обновляет общие поля элемента (enabled, settings, targetChannelID и тд) */
	async updateItem(id: string, updates: Partial<QueueEntry>): Promise<void> {
		const queue = await this.getQueue();
		const index = queue.findIndex((item) => item.id === id);

		if (index === -1) {
			throw new Error(`Элемент с ID ${id} не найден в очереди`);
		}

		queue[index] = { ...queue[index], ...updates } as QueueEntry;
		await this.saveQueue(queue);
	}

	async clearQueue(): Promise<void> {
		await chrome.storage.local.remove(STORAGE_KEYS.QUEUE);
	}

	async getCount(): Promise<number> {
		const queue = await this.getQueue();
		return queue.length;
	}
}
