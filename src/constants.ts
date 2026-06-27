// Limit media items
export const MAX_ITEMS: number = 10;

export const TELEGRAM_API_URL: string = 'https://api.telegram.org/bot';

/**
 * Enum representing error levels.
 *
 * @readonly
 * @enum {string}
 */
export enum ErrorLevel {
	Success = 'success',
	Warning = 'warning',
	Error = 'error',
}
