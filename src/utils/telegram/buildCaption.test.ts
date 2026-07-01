import { buildCaption } from './buildCaption';
import { PostSettings, defaultPostSettings } from '@/models/PostSettings';
import { TagItem } from '@/models/TagItem';
import { parseTagsLimit } from '@/utils/telegram/templateVariables';
import { TEMPLATE_VARS } from '@/shared/constants/templates';

const settings = (overrides: Partial<PostSettings> = {}): PostSettings => ({
	...defaultPostSettings,
	...overrides,
});

// Danbooru/Rule34/Gelbooru/Yandere: теги по категориям
// copyright = тайтл/франшиза: «Vocaloid», «Touhou Project», «Blue Archive» и т.д.
const booruTags: TagItem[] = [
	{ label: 'character',  tags: ['#hatsune_miku', '#reimu'] },
	{ label: 'copyright',  tags: ['#vocaloid', '#touhou'] },
];

// Pixiv: все теги в одной группе с label 'pixiv'
const pixivTags: TagItem[] = [
	{ label: 'pixiv', tags: ['#初音ミク', '#東方'] },
];

describe('buildCaption - booru теги', () => {
	test('включает character и copyright по умолчанию', () => {
		const result = buildCaption(booruTags, 'https://example.com', settings());
		expect(result).toContain('#hatsune_miku');
		expect(result).toContain('#vocaloid');
		expect(result).toContain('источник');
	});

	test('не включает character если includeCharacterTags=false', () => {
		const result = buildCaption(booruTags, 'https://example.com', settings({ includeCharacterTags: false }));
		expect(result).not.toContain('#hatsune_miku');
		expect(result).not.toContain('#reimu');
		expect(result).toContain('#vocaloid');
	});

	test('не включает copyright если includeCopyrightTags=false', () => {
		const result = buildCaption(booruTags, 'https://example.com', settings({ includeCopyrightTags: false }));
		expect(result).toContain('#hatsune_miku');
		expect(result).not.toContain('#vocaloid');
	});

	test('excludedTags исключает конкретный тег', () => {
		const result = buildCaption(booruTags, 'https://example.com', settings({ excludedTags: ['#hatsune_miku'] }));
		expect(result).not.toContain('#hatsune_miku');
		expect(result).toContain('#reimu');
		expect(result).toContain('#vocaloid');
	});

	test('excludedTags не влияет на отключённую категорию', () => {
		const result = buildCaption(booruTags, 'https://example.com', settings({
			includeCharacterTags: false,
			excludedTags: ['#vocaloid'],
		}));
		expect(result).not.toContain('#hatsune_miku');
		expect(result).not.toContain('#vocaloid');
		expect(result).toContain('#touhou');
	});

	test('без ссылки если disableLinks=true', () => {
		const result = buildCaption(booruTags, 'https://example.com', settings({ disableLinks: true }));
		expect(result).not.toContain('источник');
	});

	test('описание идёт первым', () => {
		const result = buildCaption(booruTags, 'https://example.com', settings({ customDescription: 'Привет' }));
		expect(result.startsWith('Привет')).toBe(true);
	});
});

describe('buildCaption - Pixiv теги (label: pixiv)', () => {
	test('включает pixiv-теги когда includeCharacterTags=true', () => {
		const result = buildCaption(pixivTags, 'https://pixiv.net/artworks/123', settings());
		expect(result).toContain('#初音ミク');
		expect(result).toContain('#東方');
	});

	test('не включает pixiv-теги когда оба флага false', () => {
		const result = buildCaption(pixivTags, 'https://pixiv.net', settings({
			includeCharacterTags: false,
			includeCopyrightTags: false,
		}));
		expect(result).not.toContain('#初音ミク');
	});

	test('excludedTags работает с pixiv-тегами', () => {
		const result = buildCaption(pixivTags, 'https://pixiv.net', settings({
			excludedTags: ['#初音ミク'],
		}));
		expect(result).not.toContain('#初音ミク');
		expect(result).toContain('#東方');
	});
});

describe('buildCaption - пустые теги', () => {
	test('возвращает только ссылку если тегов нет', () => {
		const result = buildCaption([], 'https://example.com', settings());
		expect(result).toBe('<a href="https://example.com">источник</a>');
	});

	test('возвращает пустую строку если всё выключено', () => {
		const result = buildCaption([], '', settings({ disableLinks: true }));
		expect(result).toBe('');
	});
});

const simpleTags4: TagItem[] = [
	{ label: 'test', tags: ['a', 'b', 'c', 'd'] },
];

const simpleTags5: TagItem[] = [
	{ label: 'test', tags: ['a', 'b', 'c', 'd', 'e'] },
];

describe('buildCaption - {{tags}} template model', () => {

	// ── Auto mode (no manual edits) ──────────────────────────────────────────

	// Spec A / Case 1: {{tags}} auto → all tags
	test('{{tags}} auto mode: renders all collected tags', () => {
		const result = buildCaption(simpleTags4, '', settings({
			captionTemplate: '{{tags}}',
			excludedTags: [],
			disableLinks: true,
		}));
		expect(result).toBe('a b c d');
	});

	// Spec A / Case 2: {{tags:3}} auto mode → first 3 only (quick send path)
	test('{{tags:3}} auto mode: renders only first 3 tags regardless of excludedTags', () => {
		const result = buildCaption(simpleTags5, '', settings({
			captionTemplate: '{{tags:3}}',
			excludedTags: [],   // quick send: no pre-init
			disableLinks: true,
		}));
		expect(result).toBe('a b c');
	});

	// {{tags:2}} auto mode with addToQueue-style pre-init also produces first 2
	test('{{tags:2}} auto mode: slice overrides any excludedTags pre-init', () => {
		const result = buildCaption(simpleTags4, '', settings({
			captionTemplate: '{{tags:2}}',
			excludedTags: ['c', 'd'],  // addToQueue pre-initialized these
			disableLinks: true,
		}));
		expect(result).toBe('a b');
	});

	// ── Manual mode (user has explicitly toggled tags) ────────────────────────

	// Spec D: user enables a tag outside the N-limit
	test('{{tags:3}} manual mode: respects user-enabled tag outside limit', () => {
		// Tags: a b c d e. Auto would give a b c. User enabled e → excluded only d.
		const result = buildCaption(simpleTags5, '', settings({
			captionTemplate: '{{tags:3}}',
			tagSelectionMode: 'manual',
			excludedTags: ['d'],
			disableLinks: true,
		}));
		expect(result).toBe('a b c e');
	});

	// Spec E: user disables a tag inside the N-limit
	test('{{tags:3}} manual mode: respects user-disabled tag inside limit', () => {
		// Tags: a b c d. Auto would give a b c. User disabled b.
		const result = buildCaption(simpleTags4, '', settings({
			captionTemplate: '{{tags:3}}',
			tagSelectionMode: 'manual',
			excludedTags: ['b', 'd'],
			disableLinks: true,
		}));
		expect(result).toBe('a c');
	});

	// Manual mode: enable all (empty excludedTags) overrides N-limit
	test('{{tags:2}} manual mode: enable-all overrides limit', () => {
		const result = buildCaption(simpleTags4, '', settings({
			captionTemplate: '{{tags:2}}',
			tagSelectionMode: 'manual',
			excludedTags: [],
			disableLinks: true,
		}));
		expect(result).toBe('a b c d');
	});

	// Manual mode: disable all (all in excludedTags) overrides N-limit
	test('{{tags:2}} manual mode: disable-all overrides limit', () => {
		const result = buildCaption(simpleTags4, '', settings({
			captionTemplate: '{{tags:2}}',
			tagSelectionMode: 'manual',
			excludedTags: ['a', 'b', 'c', 'd'],
			disableLinks: true,
		}));
		expect(result).toBe('');
	});

	// ── Invalid modifiers (auto mode) ─────────────────────────────────────────

	// Spec C: invalid modifier - no crash, all tags
	test('{{tags:abc}} invalid modifier: no crash, renders all tags', () => {
		expect(() => buildCaption(simpleTags4, '', settings({
			captionTemplate: '{{tags:abc}}',
			excludedTags: [],
			disableLinks: true,
		}))).not.toThrow();
		expect(buildCaption(simpleTags4, '', settings({
			captionTemplate: '{{tags:abc}}',
			excludedTags: [],
			disableLinks: true,
		}))).toBe('a b c d');
	});

	// {{tags:0}} non-positive → no limit, all tags
	test('{{tags:0}} non-positive modifier: renders all tags', () => {
		const result = buildCaption(simpleTags4, '', settings({
			captionTemplate: '{{tags:0}}',
			excludedTags: [],
			disableLinks: true,
		}));
		expect(result).toBe('a b c d');
	});

	// ── Backward compat ───────────────────────────────────────────────────────

	// {{all_tags}} deprecated: renders selected (non-excluded) tags in manual mode
	test('{{all_tags}} backward compat: renders selected tags using excludedTags filter', () => {
		const result = buildCaption(simpleTags4, '', settings({
			captionTemplate: '{{all_tags}}',
			excludedTags: ['c', 'd'],
			tagSelectionMode: 'manual',
			disableLinks: true,
		}));
		expect(result).toBe('a b');
	});

	// Auto mode + no limit: stale excludedTags (from old {{tags:N}}) must be ignored
	test('{{tags}} auto mode: ignores stale excludedTags, renders all tags', () => {
		const result = buildCaption(simpleTags4, '', settings({
			captionTemplate: '{{tags}}',
			excludedTags: ['a', 'b'],
			tagSelectionMode: 'auto',
			disableLinks: true,
		}));
		expect(result).toBe('a b c d');
	});
});

describe('buildCaption - {{author}} модификаторы', () => {
	test('{{author}} с именем и ссылкой: оборачивает имя в <a>', () => {
		const result = buildCaption([], '', settings({ captionTemplate: '{{author}}', disableLinks: true }), {
			authorName: 'Miku', authorUrl: 'https://example.com/miku',
		});
		expect(result).toBe('<a href="https://example.com/miku">Miku</a>');
	});

	test('{{author}} только с именем: голое имя без <a>', () => {
		const result = buildCaption([], '', settings({ captionTemplate: '{{author}}', disableLinks: true }), {
			authorName: 'Miku',
		});
		expect(result).toBe('Miku');
	});

	test('{{author}} только со ссылкой: голая ссылка', () => {
		const result = buildCaption([], '', settings({ captionTemplate: '{{author}}', disableLinks: true }), {
			authorUrl: 'https://example.com/miku',
		});
		expect(result).toBe('https://example.com/miku');
	});

	test('{{author}} без данных: пустая строка', () => {
		const result = buildCaption([], '', settings({ captionTemplate: '{{author}}', disableLinks: true }), {});
		expect(result).toBe('');
	});

	test('{{author:name}} всегда возвращает только имя, даже если есть ссылка', () => {
		const result = buildCaption([], '', settings({ captionTemplate: '{{author:name}}', disableLinks: true }), {
			authorName: 'Miku', authorUrl: 'https://example.com/miku',
		});
		expect(result).toBe('Miku');
	});

	test('{{author:url}} всегда возвращает только ссылку, даже если есть имя', () => {
		const result = buildCaption([], '', settings({ captionTemplate: '{{author:url}}', disableLinks: true }), {
			authorName: 'Miku', authorUrl: 'https://example.com/miku',
		});
		expect(result).toBe('https://example.com/miku');
	});

	test('{{author_url}} больше не подставляется - остаётся буквальным текстом', () => {
		const result = buildCaption([], '', settings({ captionTemplate: '{{author_url}}', disableLinks: true }), {
			authorUrl: 'https://example.com/miku',
		});
		expect(result).toBe('{{author_url}}');
	});
});

describe('buildCaption - {{source}} модификаторы', () => {
	test('{{source}} без модификатора: ссылка с лейблом «источник» (поведение не меняется)', () => {
		const result = buildCaption([], 'https://example.com', settings({ captionTemplate: '{{source}}' }));
		expect(result).toBe('<a href="https://example.com">источник</a>');
	});

	test('{{source:url}} с одним URL: голый URL без лейбла', () => {
		const result = buildCaption([], 'https://example.com', settings({ captionTemplate: '{{source:url}}' }));
		expect(result).toBe('https://example.com');
	});

	test('{{source:url}} с несколькими URL (группа): через " | "', () => {
		const result = buildCaption([], ['https://a.com', 'https://b.com'], settings({ captionTemplate: '{{source:url}}' }));
		expect(result).toBe('https://a.com | https://b.com');
	});

	test('{{source_url}} (мёртвый алиас) больше не подставляется - остаётся буквальным текстом', () => {
		const result = buildCaption([], 'https://example.com', settings({ captionTemplate: '{{source_url}}' }));
		expect(result).toBe('{{source_url}}');
	});
});

describe('parseTagsLimit', () => {
	test('{{tags:3}} returns 3', () => expect(parseTagsLimit('{{tags:3}}')).toBe(3));
	test('{{tags}} returns null', () => expect(parseTagsLimit('{{tags}}')).toBeNull());
	test('{{tags:abc}} returns null', () => expect(parseTagsLimit('{{tags:abc}}')).toBeNull());
	test('{{tags:0}} returns null', () => expect(parseTagsLimit('{{tags:0}}')).toBeNull());
	test('{{tags:-1}} returns null', () => expect(parseTagsLimit('{{tags:-1}}')).toBeNull());
	test('empty string returns null', () => expect(parseTagsLimit('')).toBeNull());
});

describe('TEMPLATE_VARS - UI chip list', () => {
	test('does not include {{all_tags}}', () => {
		expect((TEMPLATE_VARS as readonly string[]).includes('{{all_tags}}')).toBe(false);
	});

	test('includes {{tags}}', () => {
		expect((TEMPLATE_VARS as readonly string[]).includes('{{tags}}')).toBe(true);
	});

	test('does not include {{author_url}} (удалён, дублировал {{author:url}})', () => {
		expect((TEMPLATE_VARS as readonly string[]).includes('{{author_url}}')).toBe(false);
	});
});
