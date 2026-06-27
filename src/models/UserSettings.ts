import { Channel } from './Channel';

export const USER_SETTINGS_VERSION = 1;

export interface UserSettings {
	/** Версия схемы — используется для будущих миграций */
	schemaVersion: number;
	channels: Channel[];
	/** ID активного канала. null если ни один не выбран */
	activeChatID: string | null;
	setupComplete: boolean;
}
