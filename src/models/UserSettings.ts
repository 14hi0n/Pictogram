import { Channel } from './Channel';
import { ThemeMode } from '@/shared/constants/theme';

export const USER_SETTINGS_VERSION = 2;

export interface UserSettings {
	/** Версия схемы - используется для будущих миграций */
	schemaVersion: number;
	channels: Channel[];
	/** ID активного канала. null если ни один не выбран */
	activeChatID: string | null;
	setupComplete: boolean;
	/** Режим темы: 'auto' - по теме браузера, 'light' или 'dark' */
	theme: ThemeMode;
	/** ID акцентного пресета (см. ACCENT_PRESETS в theme.ts) */
	accentColor: string;
}
