<template>
	<div class="queue">
		<!-- Пустая очередь -->
		<div v-if="queue.length === 0" class="queue__empty">
			<div class="queue__empty-icon">📋</div>
			<p class="queue__empty-title">Очередь пуста</p>
			<p class="queue__empty-hint">
				какой-то текст
			</p>
		</div>

		<template v-else>
			<!-- Панель управления -->
			<div class="queue__toolbar">
				<span class="queue__count">{{ queue.length }} {{ itemsWord(queue.length) }}</span>
				<div class="queue__toolbar-actions">
					<!-- Кнопка группировки — появляется когда выбрано 2+ одиночных поста -->
					<button
						v-if="selectedSingleItems.length >= 2"
						class="toolbar-btn toolbar-btn--group"
						title="Объединить выбранные посты в один альбом"
						@click="groupSelectedItems"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px">
							<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
							<rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
						</svg>
						Группировать ({{ selectedSingleItems.length }})
					</button>

					<button
						class="toolbar-btn"
						:title="selectedIds.size > 0 ? 'Отправить выбранные посты' : 'Отправить все включённые посты'"
						:disabled="sendingAll || itemsToSend.length === 0"
						@click="sendAll"
					>
						<span v-if="sendingAll" class="spinner"></span>
						<template v-else>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px">
								<line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
							</svg>
							Отправить ({{ itemsToSend.length }})
						</template>
					</button>
					<button
						class="toolbar-btn toolbar-btn--danger"
						:title="selectedIds.size > 0 ? 'Удалить выбранные' : 'Очистить всю очередь'"
						@click="clearOrDeleteSelected"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px">
							<polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
						</svg>
						{{ selectedIds.size > 0 ? `Удалить (${selectedIds.size})` : 'Очистить' }}
					</button>
				</div>
			</div>

			<!-- Глобальный статус -->
			<div v-if="globalStatus" class="queue__status" :class="'queue__status--' + globalStatusType">
				{{ globalStatus }}
			</div>

			<!-- Список: одиночные карточки и группы -->
			<div class="queue__list">
				<template v-for="entry in displayQueue" :key="entry.id">
					<QueueGroupCard
						v-if="isGroupItem(entry)"
						:item="entry"
						:channels="channels"
						:activeChatID="activeChatID"
						:selected="selectedIds.has(entry.id)"
						:isSending="sendingIds.has(entry.id)"
						@toggle="toggleItem"
						@remove="removeItem"
						@ungroup="ungroupItem"
						@send="sendGroupItem"
						@update-settings="updateSettings"
						@update-channel="updateChannel"
						@update-members="updateMembers"
						@select="toggleSelect"
					/>
					<QueueItemCard
						v-else
						:item="entry"
						:channels="channels"
						:activeChatID="activeChatID"
						:selected="selectedIds.has(entry.id)"
						:isSending="sendingIds.has(entry.id)"
						@toggle="toggleItem"
						@remove="removeItem"
						@send="sendItem"
						@update-settings="updateSettings"
						@update-channel="updateChannel"
						@update-source="updateItemSource"
						@select="toggleSelect"
					/>
				</template>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue';
import { PostQueueItem } from '@/models/PostQueueItem';
import { PostQueueGroupItem, QueueEntry, GroupMember, isGroupItem } from '@/models/PostQueueGroupItem';
import { PostSettings } from '@/models/PostSettings';
import { Channel } from '@/models/Channel';
import { PostQueueManager } from '@/services/PostQueueManager';
import { UserSettingsManager } from '@/services/UserSettingsManager';
import { MSG } from '@/entrypoints/background/types';
import { mergeTags, mergeDescriptions } from '@/utils/queue/mergeTags';
import { STORAGE_KEYS } from '@/shared/constants/storage';
import QueueItemCard from '../components/QueueItemCard.vue';
import QueueGroupCard from '../components/QueueGroupCard.vue';

const emit = defineEmits<{ (e: 'queue-changed'): void }>();

const queueManager = new PostQueueManager();
const settingsManager = new UserSettingsManager();

const queue = ref<QueueEntry[]>([]);
const channels = ref<Channel[]>([]);
const activeChatID = ref<string | null>(null);
const sendingAll = ref(false);
const globalStatus = ref('');
const globalStatusType = ref<'ok' | 'error'>('ok');

// Выбранные для группировки (только id)
const selectedIds = ref<Set<string>>(new Set());

// IDs элементов, которые сейчас в процессе отправки (per-item loading guard)
const sendingIds = reactive(new Set<string>());

// Очередь в обратном порядке (новые сверху) — только для отображения
const displayQueue = computed(() => [...queue.value].reverse());

// Все включённые элементы (одиночные + группы) — для кнопки «Отправить всё»
const enabledItems = computed(() => queue.value.filter((e) => e.enabled));

// Выбранные одиночные посты (для кнопки «Группировать»)
const selectedSingleItems = computed(() =>
	queue.value.filter((e): e is PostQueueItem => !isGroupItem(e) && selectedIds.value.has(e.id))
);

// Что будет отправлено: если есть выбор — только выбранные, иначе все включённые
const itemsToSend = computed(() =>
	selectedIds.value.size > 0
		? queue.value.filter((e) => selectedIds.value.has(e.id))
		: enabledItems.value
);

function toggleSelect(id: string): void {
	const next = new Set(selectedIds.value);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	selectedIds.value = next;
}

function onStorageChanged(changes: Record<string, chrome.storage.StorageChange>, area: string): void {
	if (area === 'local' && changes[STORAGE_KEYS.QUEUE]) {
		queue.value = (changes[STORAGE_KEYS.QUEUE].newValue as QueueEntry[]) || [];
		emit('queue-changed');
	}
}

onMounted(async () => {
	await Promise.all([loadQueue(), loadChannels()]);
	chrome.storage.onChanged.addListener(onStorageChanged);
});

onUnmounted(() => {
	chrome.storage.onChanged.removeListener(onStorageChanged);
});

async function loadQueue(): Promise<void> {
	queue.value = await queueManager.getQueue();
}

async function loadChannels(): Promise<void> {
	const settings = await settingsManager.getSettings();
	channels.value = settings.channels;
	activeChatID.value = settings.activeChatID;
}

async function toggleItem(id: string): Promise<void> {
	const item = queue.value.find((i) => i.id === id);
	if (!item) return;
	await queueManager.updateItem(id, { enabled: !item.enabled });
	await loadQueue();
}

async function removeItem(id: string): Promise<void> {
	await queueManager.removeItem(id);
	await loadQueue();
	emit('queue-changed');
}

async function updateSettings(id: string, settings: PostSettings): Promise<void> {
	await queueManager.updateItem(id, { settings });
	await loadQueue();
}

async function updateChannel(id: string, channelID: string | null): Promise<void> {
	await queueManager.updateItem(id, { targetChannelID: channelID });
	await loadQueue();
}

async function updateMembers(id: string, members: GroupMember[]): Promise<void> {
	await queueManager.updateItem(id, { members } as any);
	await loadQueue();
}

async function updateItemSource(id: string, sourceUrl: string): Promise<void> {
	await queueManager.updateItem(id, { sourceUrl });
	await loadQueue();
}

// ── Группировка ──────────────────────────────────────────────────────────────

/**
 * Объединяет выбранные посты в один PostQueueGroupItem.
 * Теги объединяются и дедуплицируются.
 * Описания объединяются (без дублей).
 */
async function groupSelectedItems(): Promise<void> {
	const items = selectedSingleItems.value;
	if (items.length < 2) return;
	if (items.length > 10) {
		showStatus('Telegram ограничивает альбом до 10 медиа', 'error');
		return;
	}

	const activeChannel = await settingsManager.getActiveChannel();

	// Объединяем теги
	const hashtags = mergeTags(items);

	// Объединяем описания
	const mergedDesc = mergeDescriptions(items);

	// Preserve per-item tag exclusion state: a tag is excluded in the group if it was
	// excluded in any source item. Tags not present in the merged set are dropped.
	const mergedTagSet = new Set(hashtags.flatMap(g => g.tags));
	const mergedExcludedTags = [
		...new Set(items.flatMap(i => i.settings.excludedTags ?? [])),
	].filter(t => mergedTagSet.has(t));

	// Group template: use shared custom template if every item has the same override, else channel_default.
	const isCustom = (i: PostQueueItem) =>
		i.settings.captionTemplateMode === 'custom' ||
		(!i.settings.captionTemplateMode && !!i.settings.captionTemplate?.trim());
	const allCustom = items.every(isCustom);
	const customTemplates = allCustom ? [...new Set(items.map(i => i.settings.captionTemplate))] : [];
	const allShareSameCustom = allCustom && customTemplates.length === 1;

	const differentTemplates = !allShareSameCustom && items.some(isCustom);
	const groupTemplate = allShareSameCustom ? (customTemplates[0] ?? '') : '';
	const groupCaptionTemplateMode: 'channel_default' | 'custom' = allShareSameCustom ? 'custom' : 'channel_default';

	const baseSettings: PostSettings = {
		customDescription: mergedDesc,
		captionTemplate: groupTemplate,
		captionTemplateMode: groupCaptionTemplateMode,
		includeCharacterTags: true,
		includeCopyrightTags: true,
		disableLinks: false,
		excludedTags: mergedExcludedTags,
	};

	const members: GroupMember[] = items.map((item) => ({
		id: item.id,
		mediaUrl: item.mediaUrl,
		mediaType: item.mediaType,
		sourceUrl: item.sourceUrl,
		pageUrl: item.pageUrl,
		thumbnailUrl: item.thumbnailUrl,
	}));

	const groupItem: PostQueueGroupItem = {
		type: 'group',
		id: crypto.randomUUID(),
		members,
		originalItems: items,
		hashtags,
		targetChannelID: activeChannel?.chatID ?? null,
		settings: baseSettings,
		enabled: true,
		addedAt: Date.now(),
	};

	// Сохраняем группу, удаляем оригинальные посты
	const currentQueue = await queueManager.getQueue();
	const selectedIdSet = new Set(items.map((i) => i.id));

	// Вставляем группу на место первого выбранного элемента
	const firstSelectedIdx = currentQueue.findIndex((e) => selectedIdSet.has(e.id));
	const filteredQueue = currentQueue.filter((e) => !selectedIdSet.has(e.id));
	const insertIdx = Math.min(firstSelectedIdx, filteredQueue.length);
	filteredQueue.splice(insertIdx, 0, groupItem);

	await queueManager.saveQueue(filteredQueue);
	selectedIds.value = new Set();
	await loadQueue();
	emit('queue-changed');
	showStatus(
		differentTemplates
			? `Сгруппировано ${items.length} постов. Шаблоны отличались — использован шаблон канала.`
			: `Сгруппировано ${items.length} постов`,
		'ok'
	);
}

/**
 * Разгруппировывает PostQueueGroupItem обратно в отдельные посты.
 * Восстанавливает оригинальные PostQueueItem в текущем порядке members.
 */
async function ungroupItem(groupId: string): Promise<void> {
	const currentQueue = await queueManager.getQueue();
	const groupEntry = currentQueue.find((e) => e.id === groupId);
	if (!groupEntry || !isGroupItem(groupEntry)) return;

	// Карта оригинальных элементов по id
	const originalMap = new Map(groupEntry.originalItems.map((i) => [i.id, i]));

	// Восстанавливаем в текущем порядке members (пользователь мог переупорядочить)
	const restored: PostQueueItem[] = groupEntry.members
		.map((m) => originalMap.get(m.id))
		.filter((i): i is PostQueueItem => !!i);

	const groupIdx = currentQueue.findIndex((e) => e.id === groupId);
	const newQueue: QueueEntry[] = [
		...currentQueue.slice(0, groupIdx),
		...restored,
		...currentQueue.slice(groupIdx + 1),
	];

	await queueManager.saveQueue(newQueue);
	await loadQueue();
	emit('queue-changed');
}

// ── Отправка ─────────────────────────────────────────────────────────────────

function friendlyError(message: string): string {
	if (message?.includes('Активный канал не выбран') || message?.includes('Нет настроенных каналов')) {
		return 'Нет активного канала. Перейдите в «Настройки» и добавьте канал.';
	}
	if (message?.includes('failed to get HTTP URL content')) {
		return 'Telegram не смог загрузить изображение по URL. Возможно, сайт блокирует внешнюю загрузку.';
	}
	if (message?.includes('wrong type of the web page content')) {
		return 'Telegram не смог загрузить файл: ссылка ведёт не на поддерживаемое изображение/видео или сайт отдал HTML вместо файла.';
	}
	return message || 'Ошибка отправки';
}

async function sendItem(item: PostQueueItem): Promise<void> {
	if (sendingIds.has(item.id)) return;
	sendingIds.add(item.id);
	try {
		const results = await sendToBackground([item]);
		const result = results[0];
		if (result?.ok === false) {
			throw new Error(result.error || 'Ошибка отправки');
		}
		await loadQueue();
		emit('queue-changed');
		showStatus('Отправлено!', 'ok');
	} catch (err: any) {
		showStatus(friendlyError(err.message), 'error');
	} finally {
		sendingIds.delete(item.id);
	}
}

function sendGroupItemRequest(item: PostQueueGroupItem): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		chrome.runtime.sendMessage({ type: MSG.SEND_GROUP_ITEM, data: item }, (res) => {
			if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
			if (res?.ok === false) { reject(new Error(res.error || 'Ошибка')); return; }
			resolve();
		});
	});
}

async function sendGroupItem(item: PostQueueGroupItem): Promise<void> {
	if (sendingIds.has(item.id)) return;
	sendingIds.add(item.id);
	try {
		await sendGroupItemRequest(item);
		await loadQueue();
		emit('queue-changed');
		showStatus('Альбом отправлен!', 'ok');
	} catch (err: any) {
		showStatus(friendlyError(err.message), 'error');
	} finally {
		sendingIds.delete(item.id);
	}
}

async function sendAll(): Promise<void> {
	const items = itemsToSend.value;
	if (items.length === 0 || sendingAll.value) return;

	sendingAll.value = true;
	clearStatus();
	let failedCount = 0;

	try {
		const singles = items.filter((e): e is PostQueueItem => !isGroupItem(e));
		const groups = items.filter(isGroupItem);

		if (singles.length > 0) {
			const results = await sendToBackground(singles);
			failedCount += results.filter((r: any) => r?.ok === false).length;
		}

		for (const group of groups) {
			try {
				await sendGroupItemRequest(group);
			} catch {
				failedCount++;
			}
		}

		if (failedCount === 0) {
			showStatus(`Отправлено ${items.length} ${itemsWord(items.length)}!`, 'ok');
		} else {
			showStatus(`Отправлено с ошибками: ${failedCount} не удалось`, 'error');
		}

		selectedIds.value = new Set();
		await loadQueue();
		emit('queue-changed');
	} catch (err: any) {
		showStatus(friendlyError(err.message), 'error');
	} finally {
		sendingAll.value = false;
	}
}

async function clearOrDeleteSelected(): Promise<void> {
	if (selectedIds.value.size > 0) {
		// Удаляем только выбранные элементы
		const ids = selectedIds.value;
		const current = await queueManager.getQueue();
		const filtered = current.filter((e) => !ids.has(e.id));
		await queueManager.saveQueue(filtered);
		selectedIds.value = new Set();
		await loadQueue();
		emit('queue-changed');
	} else {
		// Ничего не выбрано — очищаем всё
		if (!confirm('Очистить всю очередь?')) return;
		await queueManager.clearQueue();
		queue.value = [];
		emit('queue-changed');
	}
}

function sendToBackground(items: PostQueueItem[]): Promise<any[]> {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage({ type: MSG.SEND_QUEUE_ITEMS, data: items }, (response) => {
			if (chrome.runtime.lastError) {
				reject(new Error(chrome.runtime.lastError.message));
				return;
			}
			resolve(response?.results ?? []);
		});
	});
}

function showStatus(message: string, type: 'ok' | 'error'): void {
	globalStatus.value = message;
	globalStatusType.value = type;
	setTimeout(clearStatus, 3000);
}

function clearStatus(): void {
	globalStatus.value = '';
}

function itemsWord(count: number): string {
	if (count % 10 === 1 && count % 100 !== 11) return 'элемент';
	if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'элемента';
	return 'элементов';
}
</script>

<style scoped>
.queue {
	padding: 10px;
}

.queue__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	padding: 40px 20px;
	gap: 10px;
}

.queue__empty-icon { font-size: 40px; }

.queue__empty-title {
	font-size: 16px;
	font-weight: 600;
	color: #555;
}

.queue__empty-hint {
	font-size: 13px;
	color: #888;
	line-height: 1.5;
	max-width: 280px;
}

.queue__toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
	gap: 8px;
}

.queue__count {
	font-size: 13px;
	color: #666;
	font-weight: 500;
}

.queue__toolbar-actions {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
	justify-content: flex-end;
}

.toolbar-btn {
	padding: 5px 10px;
	border-radius: 6px;
	border: none;
	font-size: 12px;
	font-weight: 500;
	cursor: pointer;
	background: #0088cc;
	color: #fff;
	display: flex;
	align-items: center;
	gap: 4px;
	transition: opacity 0.15s;

	@media (hover: hover) { &:hover:not(:disabled) { opacity: 0.85; } }
	&:disabled { opacity: 0.4; cursor: not-allowed; }
	&--danger { background: #e74c3c; }
	&--group  { background: #8b5cf6; }
}

.queue__status {
	padding: 8px 12px;
	border-radius: 6px;
	font-size: 13px;
	margin-bottom: 10px;
	text-align: center;

	&--ok    { background: #d4edda; color: #155724; }
	&--error { background: #f8d7da; color: #721c24; }
}

.queue__list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.spinner {
	display: inline-block;
	width: 12px;
	height: 12px;
	border: 2px solid rgba(255, 255, 255, 0.4);
	border-top-color: #fff;
	border-radius: 50%;
	animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
