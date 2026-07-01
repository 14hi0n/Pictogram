import { Channel } from '@/models/Channel';

/**
 * Returns true when there is at least one configured channel with the
 * required send credentials (chatID + botToken).
 * Safe to call with corrupted or missing data - never throws.
 */
export function hasConfiguredChannels(channels: unknown): boolean {
    if (!Array.isArray(channels) || channels.length === 0) return false;
    return (channels as Channel[]).some(
        (ch) => typeof ch?.chatID === 'string' && ch.chatID.trim() &&
                typeof ch?.botToken === 'string' && ch.botToken.trim()
    );
}
