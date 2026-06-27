import { MediaType } from './MediaType';
import { TagItem } from './TagItem';
import { PostSettings } from './PostSettings';
import { MediaCandidate } from './MediaCandidate';

/**
 * Элемент очереди постов.
 * Сериализуемый объект (без HTMLElement), хранится в chrome.storage.local.
 */
export interface PostQueueItem {
	/** Уникальный идентификатор (crypto.randomUUID) */
	id: string;
	/** Прямая ссылка на медиафайл */
	mediaUrl: string;
	/** Тип медиа (photo, video и тд) */
	mediaType: MediaType;
	/** URL страницы, откуда был добавлен элемент */
	pageUrl: string;
	/** URL первоисточника (художник, pixiv и тд) */
	sourceUrl: string;
	/** Хэштеги, собранные с страницы */
	hashtags: TagItem[];
	/** ID целевого канала (null = использовать активный) */
	targetChannelID: string | null;
	/** Настройки поста (переопределяют дефолты канала) */
	settings: PostSettings;
	/** Включён ли элемент для пакетной отправки */
	enabled: boolean;
	/** Timestamp добавления в очередь (Date.now()) */
	addedAt: number;
	/** Заголовок поста/произведения (Pixiv: title, etc.) */
	title?: string;
	/** Имя автора */
	authorName?: string;
	/** URL профиля автора */
	authorUrl?: string;
	/** Candidate URLs for MediaResolver (original + sample fallbacks). Absent = use mediaUrl only. */
	mediaCandidates?: MediaCandidate[];
}
