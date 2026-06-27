import { TelegramMediaSender } from '@/services/TelegramMediaSender';
import { PostQueueManager } from '@/services/PostQueueManager';
import { PostQueueItem } from '@/models/PostQueueItem';
import { formatError } from '@/utils/formatError';
import { SendQueueItemsMsg, SendResponse } from '../types';

const sender = new TelegramMediaSender();
const queueManager = new PostQueueManager();

/**
 * Обрабатывает отправку элементов из очереди (вызывается из side panel).
 * После успешной отправки удаляет элементы из очереди и обновляет бейдж.
 *
 * @param message - Сообщение с массивом PostQueueItem для отправки
 * @param sendResponse - Callback для ответа side panel
 */
export async function handleSendQueueItems(message: SendQueueItemsMsg, sendResponse: SendResponse): Promise<void> {
	const items: PostQueueItem[] = message.data;

	const results: Array<{ id: string; ok: boolean; error?: string }> = [];

	for (const item of items) {
		try {
			await sender.sendQueueItem(item);
			await queueManager.removeItem(item.id);
			results.push({ id: item.id, ok: true });
		} catch (error: unknown) {
			const ext = item.mediaUrl.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
			const domain = (() => { try { return new URL(item.pageUrl).hostname; } catch { return item.pageUrl; } })();
			const msg = formatError(error);
			console.error(
				'[sendQueueItems] send failed:' +
				' domain=' + domain +
				' url=' + item.mediaUrl +
				' type=' + item.mediaType +
				' ext=.' + ext +
				' page=' + item.pageUrl +
				' src=' + item.sourceUrl +
				' error=' + msg
			);
			results.push({ id: item.id, ok: false, error: error instanceof Error ? error.message : msg });
		}
	}

	// Обновляем бейдж
	const count = await queueManager.getCount();
	chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });

	sendResponse({ ok: true, results });
}
