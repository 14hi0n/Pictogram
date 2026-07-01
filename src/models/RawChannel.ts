/**
 * Сырые данные канала из Telegram API (getUpdates).
 * id - числовой (отрицательный для каналов и групп, положительный для private).
 */
export interface RawChannel {
	id: number;
	title: string;
	username: string;
}
