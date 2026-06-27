import { TelegramMediaSender } from '@/services/TelegramMediaSender';
import { PostQueueManager } from '@/services/PostQueueManager';
import { PostQueueGroupItem } from '@/models/PostQueueGroupItem';
import { formatError } from '@/utils/formatError';
import { SendGroupItemMsg, SendResponse } from '../types';

const sender = new TelegramMediaSender();
const queueManager = new PostQueueManager();

/**
 * Отправляет PostQueueGroupItem как Telegram media group.
 * После успеха удаляет из очереди и обновляет бейдж.
 */
export async function handleSendGroupItem(message: SendGroupItemMsg, sendResponse: SendResponse): Promise<void> {
	const item: PostQueueGroupItem = message.data;

	try {
		await sender.sendGroupQueueItem(item);
		await queueManager.removeItem(item.id);

		const count = await queueManager.getCount();
		chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });

		sendResponse({ ok: true });
	} catch (error: unknown) {
		const msg = formatError(error);
		const urls = item.members.map(m => m.mediaUrl).join(', ');
		console.error(
			'[sendGroupItem] send failed:' +
			' id=' + item.id +
			' urls=[' + urls + ']' +
			' error=' + msg
		);
		sendResponse({ ok: false, error: error instanceof Error ? error.message : msg });
	}
}
