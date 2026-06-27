import { handleAddToQueue } from './handlers/addToQueue';
import { handleQuickSend } from './handlers/quickSend';
import { handleSendQueueItems } from './handlers/sendQueueItems';
import { handleSendGroupItem } from './handlers/sendGroupItem';
import { AppMessage, SendResponse, MSG } from './types';
import { PostQueueManager } from '@/services/PostQueueManager';
import { STORAGE_KEYS } from '@/shared/constants/storage';

const queueManager = new PostQueueManager();

// ──────────────────────────────────────────────────────────────────────────
// Настройка Side Panel
// ──────────────────────────────────────────────────────────────────────────

// При клике на иконку расширения открываем side panel (а не popup)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

// ──────────────────────────────────────────────────────────────────────────
// Обработчики сообщений
// ──────────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
	(message: AppMessage, _sender: chrome.runtime.MessageSender, sendResponse: SendResponse) => {
		switch (message.type) {
			case MSG.QUICK_SEND:
				handleQuickSend(message, sendResponse, _sender);
				return true; // Асинхронный ответ

			case MSG.ADD_TO_QUEUE:
				handleAddToQueue(message, sendResponse);
				return true;

			case MSG.SEND_QUEUE_ITEMS:
				handleSendQueueItems(message, sendResponse);
				return true;

			case MSG.SEND_GROUP_ITEM:
				handleSendGroupItem(message, sendResponse);
				return true;

			// Content script просит открыть side panel (когда пост уже в очереди)
			case MSG.OPEN_SIDE_PANEL:
				chrome.sidePanel.open({ windowId: _sender.tab?.windowId }).catch(console.error);
				sendResponse({ ok: true });
				return false;
		}
	}
);

// ──────────────────────────────────────────────────────────────────────────
// События установки / запуска
// ──────────────────────────────────────────────────────────────────────────

// Автоматически синхронизируем бейдж при любом изменении очереди
chrome.storage.onChanged.addListener((changes, area) => {
	if (area === 'local' && STORAGE_KEYS.QUEUE in changes) {
		const queue: unknown[] = changes[STORAGE_KEYS.QUEUE].newValue ?? [];
		const count = queue.filter(Boolean).length;
		chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
		chrome.action.setBadgeBackgroundColor({ color: '#0088cc' });
	}
});

chrome.runtime.onInstalled.addListener(async (details) => {
	if (details.reason === 'install') {
		// При первой установке открываем страницу онбординга
		chrome.tabs.create({ url: 'option.html?install=true' });
	}

	// Восстанавливаем бейдж после перезапуска extension
	await restoreBadge();
});

chrome.runtime.onStartup.addListener(async () => {
	await restoreBadge();
});

/**
 * Восстанавливает бейдж иконки на основе текущей длины очереди.
 */
async function restoreBadge(): Promise<void> {
	try {
		const count = await queueManager.getCount();
		chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
		chrome.action.setBadgeBackgroundColor({ color: '#0088cc' });
	} catch (error) {
		console.error('[background] restoreBadge:', error);
	}
}
