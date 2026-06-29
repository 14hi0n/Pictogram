import { TelegramMediaSender } from '@/services/TelegramMediaSender';
import { UserSettingsManager } from '@/services/UserSettingsManager';
import { MediaType } from '@/models/MediaType';
import { PostMeta } from '@/utils/telegram/buildCaption';
import { MediaCandidate } from '@/models/MediaCandidate';
import { formatError } from '@/utils/formatError';
import { hasConfiguredChannels } from '@/utils/channelGuard';
import { QuickSendMsg, SendResponse } from '../types';
import { STORAGE_KEYS, SIDE_PANEL_ACTIONS } from '@/shared/constants/storage';

const sender = new TelegramMediaSender();
const settingsManager = new UserSettingsManager();

/**
 * Обрабатывает быструю отправку медиа в активный канал.
 * Не сохраняет в очередь — отправляет немедленно.
 *
 * Если каналы не настроены, открывает side panel на вкладке настроек
 * и возвращает { ok: false, noChannels: true } вместо молчаливого отказа.
 */
export async function handleQuickSend(
    message: QuickSendMsg,
    sendResponse: SendResponse,
    senderCtx?: chrome.runtime.MessageSender,
): Promise<void> {
    // Guard: no usable channels → guide user to channel setup instead of failing silently
    try {
        const settings = await settingsManager.getSettings();
        if (!hasConfiguredChannels(settings.channels)) {
            // Set the flag before opening so the panel reads it on mount
            await chrome.storage.local.set({ [STORAGE_KEYS.SIDE_PANEL_ACTION]: SIDE_PANEL_ACTIONS.SETUP_CHANNELS });
            const windowId = senderCtx?.tab?.windowId;
            if (windowId && typeof chrome.sidePanel !== 'undefined') {
                await chrome.sidePanel.open({ windowId }).catch(() => {});
            }
            sendResponse({ ok: false, noChannels: true, error: 'Нет настроенных каналов. Добавьте канал в настройках.' });
            return;
        }
    } catch {
        // If settings read fails, fall through and let quickSend produce its own error
    }

    const { mediaUrl, mediaType, sourceUrl, hashtags, title, authorName, authorUrl, mediaCandidates } = message.data;
    try {
        const meta: PostMeta = { title, authorName, authorUrl };
        await sender.quickSend(
            mediaUrl,
            mediaType as MediaType,
            sourceUrl,
            hashtags ?? [],
            meta,
            mediaCandidates as MediaCandidate[] | undefined,
        );
        sendResponse({ ok: true });
    } catch (error: unknown) {
        const msg = formatError(error);
        console.error(
            '[quickSend] send failed:' +
            ' url=' + mediaUrl +
            ' type=' + mediaType +
            ' src=' + sourceUrl +
            ' error=' + msg
        );
        sendResponse({ ok: false, error: error instanceof Error ? error.message : msg });
    }
}
