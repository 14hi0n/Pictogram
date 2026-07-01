import { mergeTags, mergeDescriptions } from './mergeTags';
import { PostQueueItem } from '@/models/PostQueueItem';
import { MediaType } from '@/models/MediaType';
import { defaultPostSettings } from '@/models/PostSettings';

function makeItem(hashtags: PostQueueItem['hashtags'], desc = ''): PostQueueItem {
	return {
		id: crypto.randomUUID?.() ?? Math.random().toString(),
		mediaUrl: 'https://example.com/img.jpg',
		mediaType: MediaType.Photo,
		pageUrl: 'https://example.com',
		sourceUrl: 'https://example.com',
		hashtags,
		targetChannelID: null,
		settings: { ...defaultPostSettings, customDescription: desc },
		enabled: true,
		addedAt: Date.now(),
	};
}

describe('mergeTags', () => {
	test('объединяет теги из двух постов', () => {
		const items = [
			makeItem([{ label: 'character', tags: ['#miku'] }, { label: 'copyright', tags: ['#vocaloid'] }]),
			makeItem([{ label: 'character', tags: ['#reimu'] }, { label: 'copyright', tags: ['#touhou'] }]),
		];
		const result = mergeTags(items);

		const chars = result.find(g => g.label === 'character')?.tags ?? [];
		expect(chars).toContain('#miku');
		expect(chars).toContain('#reimu');

		const copy = result.find(g => g.label === 'copyright')?.tags ?? [];
		expect(copy).toContain('#vocaloid');
		expect(copy).toContain('#touhou');
	});

	test('дедуплицирует одинаковые теги', () => {
		const items = [
			makeItem([{ label: 'character', tags: ['#miku', '#reimu'] }]),
			makeItem([{ label: 'character', tags: ['#miku', '#marisa'] }]),
		];
		const result = mergeTags(items);
		const chars = result.find(g => g.label === 'character')?.tags ?? [];

		// #miku встречается в обоих - должна быть один раз
		expect(chars.filter(t => t === '#miku')).toHaveLength(1);
		expect(chars).toContain('#reimu');
		expect(chars).toContain('#marisa');
	});

	test('обрабатывает пустые теги', () => {
		const items = [makeItem([]), makeItem([{ label: 'character', tags: ['#miku'] }])];
		const result = mergeTags(items);
		const chars = result.find(g => g.label === 'character')?.tags ?? [];
		expect(chars).toContain('#miku');
	});

	test('объединяет Pixiv теги (label: pixiv)', () => {
		const items = [
			makeItem([{ label: 'pixiv', tags: ['#初音ミク'] }]),
			makeItem([{ label: 'pixiv', tags: ['#東方'] }]),
		];
		const result = mergeTags(items);
		const pixiv = result.find(g => g.label === 'pixiv')?.tags ?? [];
		expect(pixiv).toContain('#初音ミク');
		expect(pixiv).toContain('#東方');
	});
});

describe('mergeDescriptions', () => {
	test('объединяет разные описания через перенос строки', () => {
		const items = [makeItem([], 'Описание 1'), makeItem([], 'Описание 2')];
		const result = mergeDescriptions(items);
		expect(result).toBe('Описание 1\nОписание 2');
	});

	test('не дублирует одинаковые описания', () => {
		const items = [makeItem([], 'Одинаковое'), makeItem([], 'Одинаковое')];
		const result = mergeDescriptions(items);
		expect(result).toBe('Одинаковое');
	});

	test('пропускает пустые описания', () => {
		const items = [makeItem([], ''), makeItem([], 'Есть'), makeItem([], '')];
		const result = mergeDescriptions(items);
		expect(result).toBe('Есть');
	});

	test('возвращает пустую строку если все описания пустые', () => {
		const items = [makeItem([], ''), makeItem([], '')];
		expect(mergeDescriptions(items)).toBe('');
	});
});
