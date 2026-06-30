import { Channel, normalizeChannel } from '@/models/Channel';
import { UserSettings, USER_SETTINGS_VERSION } from '@/models/UserSettings';
import { ThemeMode, DEFAULT_THEME, DEFAULT_ACCENT } from '@/shared/constants/theme';

export class UserSettingsManager {
	private static readonly STORAGE_KEY = 'userSettings';

	/**
	 * Сохраняет настройки пользователя.
	 *
	 * @param settings
	 */
	async saveSettings(settings: UserSettings): Promise<void> {
		await chrome.storage.sync.set({ [UserSettingsManager.STORAGE_KEY]: settings });
	}

	/**
	 * Возвращает настройки пользователя.
	 * Нормализует каналы и прогоняет миграции если schemaVersion устарела.
	 */
	async getSettings(): Promise<UserSettings> {
		const data = await chrome.storage.sync.get(UserSettingsManager.STORAGE_KEY);
		const raw = data[UserSettingsManager.STORAGE_KEY] || {};

		const settings: UserSettings = {
			schemaVersion: USER_SETTINGS_VERSION,
			channels: (raw.channels || []).map((ch: any) => normalizeChannel(ch)),
			activeChatID: raw.activeChatID || null,
			setupComplete: raw.setupComplete || false,
			theme: raw.theme ?? DEFAULT_THEME,
			accentColor: raw.accentColor ?? DEFAULT_ACCENT,
		};

		// Если данных без версии (pre-v1) — сохраняем с версией, помечая как мигрированные
		if (!raw.schemaVersion) {
			await chrome.storage.sync.set({ [UserSettingsManager.STORAGE_KEY]: settings });
		}

		return settings;
	}

	/**
	 * Удаляет настройки пользователя.
	 *
	 * @returns
	 */
	async clearSettings(): Promise<void> {
		await chrome.storage.sync.remove(UserSettingsManager.STORAGE_KEY);
	}

	/**
	 * Обновляет список каналов.
	 */
	async updateChannels(channels: Channel[]): Promise<void> {
		const settings = await this.getSettings();
		settings.channels = channels;
		await this.saveSettings(settings);
	}

	/**
	 * Добавляет канал в список.
	 */
	async addChannel(channel: Channel): Promise<void> {
		const settings = await this.getSettings();

		if (settings.channels.some((c) => c.chatID === channel.chatID)) {
			throw new Error(`Канал с ID ${channel.chatID} уже добавлен`);
		}

		settings.channels.push(channel);
		await this.saveSettings(settings);
	}

	/**
	 * Удаляет канал по его `chatID`.
	 *
	 * @param chatID - ID канала для удаления.
	 */
	async removeChannel(chatID: string): Promise<void> {
		const settings = await this.getSettings();

		settings.channels = settings.channels.filter((ch) => ch.chatID !== chatID);

		if (settings.activeChatID === chatID) {
			settings.activeChatID = settings.channels[0]?.chatID ?? null;
		}

		await this.saveSettings(settings);
	}

	/**
	 * Обновляет информацию о канале
	 */
	async updateChannel(chatID: string, updatedChannel: Partial<Channel>): Promise<void> {
		const settings = await this.getSettings();

		const channelIndex = settings.channels.findIndex((ch) => ch.chatID === chatID);
		if (channelIndex === -1) {
			throw new Error(`Канал с ID ${chatID} не найден`);
		}

		settings.channels[channelIndex] = {
			...settings.channels[channelIndex],
			...updatedChannel,
		};

		await this.saveSettings(settings);
	}

	/**
	 * Устанавливает активный чат.
	 */
	async setActiveChat(chatID: string): Promise<void> {
		const settings = await this.getSettings();
		settings.activeChatID = chatID;
		await this.saveSettings(settings);
	}

	/**
	 * Возвращает активный канал.
	 */
	async getActiveChannel(): Promise<Channel | null> {
		const settings = await this.getSettings();
		return settings.channels.find((ch) => ch.chatID === settings.activeChatID) || null;
	}

	/**
	 * Устанавливает флаг завершения настройки приложения.
	 */
	async setSetupComplete(complete: boolean): Promise<void> {
		const settings = await this.getSettings();
		settings.setupComplete = complete;
		await this.saveSettings(settings);
	}

	async setTheme(theme: ThemeMode): Promise<void> {
		const settings = await this.getSettings();
		settings.theme = theme;
		await this.saveSettings(settings);
	}

	async setAccentColor(accentId: string): Promise<void> {
		const settings = await this.getSettings();
		settings.accentColor = accentId;
		await this.saveSettings(settings);
	}

}
