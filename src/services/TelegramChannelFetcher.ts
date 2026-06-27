import { RawChannel } from '@/models/RawChannel';

export class TelegramChannelFetcher {
	private apiUrl: string;

	constructor(botToken: string) {
		this.apiUrl = `https://api.telegram.org/bot${botToken}/getUpdates`;
	}

	private async fetchFromAPI(): Promise<any> {
		const response = await fetch(this.apiUrl);
		if (!response.ok) {
			throw new Error(`Telegram API вернул ${response.status}`);
		}
		return response.json();
	}

	async getChannels(): Promise<RawChannel[]> {
		const rawData = await this.fetchFromAPI();
		if (!Array.isArray(rawData?.result)) return [];
		return this.extractChannels(rawData.result);
	}

	private extractChannels(results: any[]): RawChannel[] {
		const channesMap = new Map<number, RawChannel>();

		for (const update of results) {
			const chat = this.findChatInUpdate(update);

			// Некоторые типы обновлений не содержат данных о чате
			if (!chat?.id) continue;

			if (!channesMap.has(chat.id)) {
				channesMap.set(chat.id, {
					id: chat.id,
					title: chat.title || chat.first_name || 'Без названия',
					username: chat.username || '',
				});
			}
		}

		return Array.from(channesMap.values());
	}

	private findChatInUpdate(update: any): any | null {
		return (
			update.channel_post?.chat ||
			update.edited_channel_post?.chat ||
			update.my_chat_member?.chat ||
			update.message?.chat ||
			update.chat_member?.chat ||
			null
		);
	}
}
