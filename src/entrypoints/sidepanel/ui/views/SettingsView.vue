<template>
	<div class="settings">

		<!-- Уведомление: каналы не настроены -->
		<div v-if="showNotice" class="settings__notice">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0;color:#e65100">
				<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
			</svg>
			<span>Нет настроенных каналов. Добавь канал, чтобы начать.</span>
			<button class="notice-close" @click="$emit('dismiss-notice')">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:12px;height:12px">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>

		<!-- Заголовок -->
		<div class="settings__header">
			<h2 class="settings__title">Каналы</h2>
			<button class="add-btn" @click="showAddFlow = !showAddFlow">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				Добавить
			</button>
		</div>

		<!-- Форма добавления -->
		<div v-if="showAddFlow" class="settings__card settings__card--add">
			<div class="card-header">
				<span class="card-header__title">Новый бот / каналы</span>
				<button class="btn-close" @click="showAddFlow = false">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<AddChannelFlow @done="onChannelAdded" @cancel="showAddFlow = false" />
		</div>

		<!-- Пустое состояние -->
		<div v-if="channels.length === 0 && !showAddFlow" class="settings__empty">
			<div class="settings__empty-icon">📡</div>
			<p>Нет добавленных каналов</p>
			<p class="settings__empty-hint">Создай бота в @BotFather и нажми «Добавить»</p>
		</div>

		<!-- Список каналов -->
		<div v-for="ch in sortedChannels" :key="ch.chatID" class="settings__card">
			<!-- Информация о канале -->
			<div class="ch-row">
				<div class="ch-info">
					<div class="ch-name">
						{{ ch.name }}
						<span v-if="ch.chatID === activeChatID" class="ch-badge ch-badge--active">активный</span>
					</div>
					<div class="ch-id">{{ ch.chatID }}</div>
				</div>

				<div class="ch-actions">
					<!-- Активный -->
					<button class="ch-btn" :class="ch.chatID === activeChatID ? 'ch-btn--active' : ''" :title="ch.chatID === activeChatID ? 'Активный' : 'Сделать активным'" @click="setActive(ch.chatID)">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<circle cx="12" cy="12" r="10"/>
							<polyline v-if="ch.chatID === activeChatID" points="9 12 11 14 15 10"/>
						</svg>
					</button>

					<!-- Настройки -->
					<button class="ch-btn" :class="expandedID === ch.chatID ? 'ch-btn--active' : ''" title="Настройки публикации" @click="toggleExpand(ch.chatID)">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="3"/>
							<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
						</svg>
					</button>

					<!-- Удалить -->
					<button class="ch-btn ch-btn--danger" title="Удалить канал" @click="removeChannel(ch.chatID)">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Настройки канала (раскрываются) -->
			<div v-if="expandedID === ch.chatID" class="ch-defaults">

				<!-- Шаблон подписи -->
				<div class="ch-defaults__mode-title">Шаблон подписи</div>
				<div class="defaults-field">
					<textarea
						:ref="(el) => setTemplateRef(ch.chatID, el)"
						v-model="drafts[ch.chatID].captionTemplate"
						class="defaults-textarea"
						placeholder="Введи шаблон или оставь пустым"
						rows="4"
					></textarea>
					<div class="template-hint">
						<span class="template-hint__label">Переменные:</span>
						<button v-for="v in TEMPLATE_VARS" :key="v" class="tvar" @click="insertVar(ch.chatID, v)">{{ v }}</button>
					</div>
				</div>

				<!-- Предупреждение: пустой шаблон -->
				<div v-if="!drafts[ch.chatID].captionTemplate?.trim()" class="ch-defaults__empty-warning">
					<span>Шаблон пустой. Пост будет опубликован без подписи.</span>
					<button class="btn-insert-basic" @click="insertBasicTemplate(ch.chatID)">Вставить дефолтный шаблон</button>
				</div>

				<div class="defaults-actions">
					<button class="btn-save" @click="saveDefaults(ch.chatID)">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
						Сохранить
					</button>
					<span v-if="savedID === ch.chatID" class="save-hint">Сохранено ✓</span>
				</div>
			</div>
		</div>

		<div class="settings__footer">
			{{ APP_NAME }} v{{ extensionVersion }} · <a :href="PROJECT_LINKS.github" target="_blank">GitHub</a>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, nextTick, watch } from 'vue';
import { Channel } from '@/models/Channel';
import { PostSettings, defaultPostSettings } from '@/models/PostSettings';
import { UserSettingsManager } from '@/services/UserSettingsManager';
import { DEFAULT_TEMPLATE } from '@/utils/telegram/templateVariables';
import AddChannelFlow from '../components/AddChannelFlow.vue';
import { getExtensionVersion } from '@/shared/extension/manifest';
import { APP_NAME, PROJECT_LINKS } from '@/shared/constants/app';
import { TEMPLATE_VARS } from '@/shared/constants/templates';

const props = defineProps<{ showNotice?: boolean }>();
const emit = defineEmits<{ (e: 'dismiss-notice'): void }>();

// When the notice is triggered (no channels + quick send attempted), auto-open the add-channel form
watch(() => props.showNotice, (v) => { if (v) showAddFlow.value = true; }, { immediate: true });

const extensionVersion = getExtensionVersion();

const settingsManager = new UserSettingsManager();

const channels = ref<Channel[]>([]);
const activeChatID = ref<string | null>(null);
const showAddFlow = ref(false);
const expandedID = ref<string | null>(null);
const savedID = ref<string | null>(null);

// Черновики настроек по каналу — чтобы не мутировать оригинал до сохранения
const drafts = reactive<Record<string, PostSettings>>({});

// Refs на textarea шаблонов по chatID
const templateEls: Record<string, HTMLTextAreaElement> = {};

function insertBasicTemplate(chatID: string): void {
	drafts[chatID].captionTemplate = DEFAULT_TEMPLATE;
}

function setTemplateRef(chatID: string, el: unknown): void {
	const node = el as (HTMLTextAreaElement & { nodeName?: string }) | null;
	if (node?.nodeName === 'TEXTAREA') templateEls[chatID] = node as HTMLTextAreaElement;
}

function insertVar(chatID: string, variable: string): void {
	const el = templateEls[chatID];
	const text = drafts[chatID].captionTemplate ?? '';
	if (!el) {
		drafts[chatID].captionTemplate = text + variable;
		return;
	}
	const start = el.selectionStart ?? text.length;
	const end = el.selectionEnd ?? text.length;
	drafts[chatID].captionTemplate = text.slice(0, start) + variable + text.slice(end);
	nextTick(() => {
		el.selectionStart = el.selectionEnd = start + variable.length;
		el.focus();
	});
}

const sortedChannels = computed(() =>
	[...channels.value].sort((a, b) => {
		if (a.chatID === activeChatID.value) return -1;
		if (b.chatID === activeChatID.value) return 1;
		return a.name.localeCompare(b.name);
	})
);

onMounted(async () => { await loadSettings(); });

async function loadSettings(): Promise<void> {
	const s = await settingsManager.getSettings();
	channels.value = s.channels;
	activeChatID.value = s.activeChatID;

	// Инициализируем черновики для каждого канала
	for (const ch of s.channels) {
		drafts[ch.chatID] = { ...defaultPostSettings, ...ch.defaults };
	}
}

async function setActive(chatID: string): Promise<void> {
	await settingsManager.setActiveChat(chatID);
	activeChatID.value = chatID;
}

async function removeChannel(chatID: string): Promise<void> {
	if (!confirm('Удалить канал?')) return;
	await settingsManager.removeChannel(chatID);
	if (expandedID.value === chatID) expandedID.value = null;
	await loadSettings();
}

function toggleExpand(chatID: string): void {
	expandedID.value = expandedID.value === chatID ? null : chatID;
}

async function saveDefaults(chatID: string): Promise<void> {
	await settingsManager.updateChannel(chatID, { defaults: drafts[chatID] });
	savedID.value = chatID;
	setTimeout(() => { if (savedID.value === chatID) savedID.value = null; }, 2000);
}

async function onChannelAdded(): Promise<void> {
	showAddFlow.value = false;
	await loadSettings();
	if (props.showNotice) emit('dismiss-notice');
}
</script>

<style scoped>
.settings {
	padding: 10px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.settings__notice {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 12px;
	background: #fff8f0;
	border: 1px solid #f0c080;
	border-radius: 8px;
	font-size: 12px;
	color: #7a4a00;
	line-height: 1.4;

	span { flex: 1; }
}

.notice-close {
	flex-shrink: 0;
	width: 22px;
	height: 22px;
	border: none;
	background: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	color: #c07020;
	padding: 0;
	&:hover { background: #f0d8b0; }
}

.settings__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 2px 0 4px;
}

.settings__title {
	font-size: 14px;
	font-weight: 700;
	color: #222;
}

.add-btn {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 6px 12px;
	background: #0088cc;
	color: #fff;
	border: none;
	border-radius: 7px;
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;
	transition: opacity 0.15s;

	svg { width: 13px; height: 13px; }
	&:hover { opacity: 0.85; }
}

.settings__card {
	background: #fff;
	border: 1px solid #e8e8e8;
	border-radius: 10px;
	overflow: hidden;

	&--add {
		padding: 12px;
		border-color: #0088cc44;
		background: #f8fcff;
	}
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
}

.card-header__title {
	font-size: 13px;
	font-weight: 600;
	color: #333;
}

.btn-close {
	width: 26px;
	height: 26px;
	border: 1px solid #ddd;
	border-radius: 6px;
	background: #f5f5f5;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #888;
	transition: all 0.12s;

	svg { width: 13px; height: 13px; }
	&:hover { background: #e8e8e8; color: #333; }
}

.settings__empty {
	text-align: center;
	padding: 32px 20px;
	color: #bbb;

	.settings__empty-icon { font-size: 36px; margin-bottom: 8px; }
	p { font-size: 13px; margin-bottom: 4px; }
	.settings__empty-hint { font-size: 12px; }
}

/* ── Строка канала ── */
.ch-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 12px;
}

.ch-info { flex: 1; min-width: 0; }

.ch-name {
	font-size: 13px;
	font-weight: 500;
	color: #222;
	display: flex;
	align-items: center;
	gap: 5px;
	flex-wrap: wrap;
}

.ch-badge {
	font-size: 10px;
	padding: 1px 5px;
	border-radius: 3px;
	font-weight: 600;

	&--active { background: #e8f4fd; color: #0077b6; }
}

.ch-id {
	font-size: 10px;
	color: #ccc;
	font-family: monospace;
	margin-top: 1px;
}

.ch-actions {
	display: flex;
	gap: 3px;
	flex-shrink: 0;
}

.ch-btn {
	width: 28px;
	height: 28px;
	border: 1px solid #e8e8e8;
	border-radius: 6px;
	background: #fafafa;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #ccc;
	transition: all 0.12s;

	svg { width: 14px; height: 14px; }
	&:hover { background: #f0f0f0; color: #555; }

	&--active { background: #0088cc; border-color: #0088cc; color: #fff; &:hover { background: #0077b5; } }
	&--danger { &:hover { background: #e74c3c; border-color: #e74c3c; color: #fff; } }
}

/* ── Настройки канала ── */
.ch-defaults {
	border-top: 1px solid #f0f0f0;
	padding: 12px;
	background: #fafafa;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.ch-defaults__mode-title {
	font-size: 10px;
	font-weight: 700;
	color: #aaa;
	text-transform: uppercase;
	letter-spacing: 0.4px;
	padding-bottom: 2px;
	border-bottom: 1px solid #f0f0f0;
	margin-bottom: 2px;
}

.defaults-field { display: flex; flex-direction: column; gap: 3px; }

.defaults-label {
	font-size: 11px;
	font-weight: 600;
	color: #999;
}


.defaults-textarea {
	width: 100%;
	padding: 7px 9px;
	border: 1px solid #ddd;
	border-radius: 6px;
	font-size: 12px;
	font-family: inherit;
	resize: vertical;
	outline: none;
	color: #333;
	background: #fff;

	&:focus { border-color: #0088cc; }
}

.ch-defaults__empty-warning {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 8px 10px;
	background: #fff8e1;
	border: 1px solid #ffe082;
	border-radius: 6px;
	font-size: 12px;
	color: #7a5c00;
}

.btn-insert-basic {
	align-self: flex-start;
	padding: 4px 10px;
	border: 1px solid #f0c040;
	border-radius: 5px;
	background: #fff;
	font-size: 11px;
	font-weight: 600;
	color: #7a5c00;
	cursor: pointer;
	transition: background 0.1s;

	&:hover { background: #fff3c4; }
}

.template-hint {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px;
	margin-top: 2px;
}

.template-hint__label {
	font-size: 10px;
	color: #bbb;
	font-weight: 600;
}

.tvar {
	font-size: 10px;
	padding: 1px 6px;
	border-radius: 4px;
	border: 1px solid #c8e6fa;
	background: #e8f4fd;
	color: #0077b6;
	cursor: pointer;
	font-family: monospace;
	transition: background 0.1s;

	&:hover { background: #d0eaf8; }
}

.defaults-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}

.btn-save {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 7px 14px;
	background: #0088cc;
	color: #fff;
	border: none;
	border-radius: 7px;
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;
	transition: opacity 0.15s;

	&:hover { opacity: 0.85; }
}

.save-hint {
	font-size: 12px;
	color: #27ae60;
	font-weight: 500;
}

.settings__footer {
	font-size: 11px;
	color: #ccc;
	text-align: center;
	padding: 4px 0 8px;

	a { color: #0088cc; text-decoration: none; }
}
</style>
