<template>
	<div class="settings">

		<!-- Уведомление: каналы не настроены -->
		<div v-if="showNotice" class="settings__notice">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0;color:#e65100">
				<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
			</svg>
			<span>Нет настроенных каналов. Добавь канал, чтобы начать.</span>
			<button class="settings__notice-close" @click="$emit('dismiss-notice')">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:12px;height:12px">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>

		<!-- Заголовок -->
		<div class="settings__header">
			<h2 class="settings__title">Каналы</h2>
			<button class="settings__add-btn" @click="showAddFlow = !showAddFlow">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				Добавить
			</button>
		</div>

		<!-- Форма добавления -->
		<div v-if="showAddFlow" class="settings__card settings__card--add">
			<div class="settings__card-header">
				<span class="settings__card-header-title">Новый бот / каналы</span>
				<button class="settings__card-close" @click="showAddFlow = false">
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
			<div class="settings__channel">
				<div class="settings__channel-info">
					<div class="settings__channel-name">
						{{ ch.name }}
						<span v-if="ch.chatID === activeChatID" class="settings__channel-badge settings__channel-badge--active">активный</span>
					</div>
					<div class="settings__channel-id">{{ ch.chatID }}</div>
				</div>

				<div class="settings__channel-actions">
					<!-- Активный -->
					<button class="settings__channel-btn" :class="ch.chatID === activeChatID ? 'settings__channel-btn--active' : ''" :title="ch.chatID === activeChatID ? 'Активный' : 'Сделать активным'" @click="setActive(ch.chatID)">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<circle cx="12" cy="12" r="10"/>
							<polyline v-if="ch.chatID === activeChatID" points="9 12 11 14 15 10"/>
						</svg>
					</button>

					<!-- Настройки -->
					<button class="settings__channel-btn" :class="expandedID === ch.chatID ? 'settings__channel-btn--active' : ''" title="Настройки публикации" @click="toggleExpand(ch.chatID)">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="3"/>
							<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
						</svg>
					</button>

					<!-- Удалить -->
					<button class="settings__channel-btn settings__channel-btn--danger" title="Удалить канал" @click="removeChannel(ch.chatID)">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Настройки канала (раскрываются) -->
			<div v-if="expandedID === ch.chatID" class="settings__defaults">

				<!-- Шаблон подписи -->
				<div class="settings__defaults-title">Шаблон подписи</div>
				<div class="settings__defaults-field">
					<textarea
						:ref="(el) => setTemplateRef(ch.chatID, el)"
						v-model="drafts[ch.chatID].captionTemplate"
						class="settings__defaults-textarea"
						placeholder="Введи шаблон или оставь пустым"
						rows="4"
					></textarea>
					<div class="settings__template-hint">
						<span class="settings__template-hint-label">Переменные:</span>
						<button v-for="v in TEMPLATE_VARS" :key="v" class="settings__tvar" @click="insertVar(ch.chatID, v)">{{ v }}</button>
					</div>
				</div>

				<!-- Предупреждение: пустой шаблон -->
				<div v-if="!drafts[ch.chatID].captionTemplate?.trim()" class="settings__defaults-warning">
					<span>Шаблон пустой. Пост будет опубликован без подписи.</span>
					<button class="settings__defaults-insert-btn" @click="insertBasicTemplate(ch.chatID)">Вставить дефолтный шаблон</button>
				</div>

				<div class="settings__defaults-actions">
					<button class="settings__save-btn" @click="saveDefaults(ch.chatID)">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
						Сохранить
					</button>
					<span v-if="savedID === ch.chatID" class="settings__save-hint">Сохранено ✓</span>
				</div>
			</div>
		</div>

		<!-- Секция: Внешний вид -->
		<div class="settings__appearance">
			<div class="settings__header">
				<h2 class="settings__title">Внешний вид</h2>
			</div>

			<div class="settings__appearance-card">
				<!-- Переключатель темы -->
				<div class="settings__appearance-row">
					<span class="settings__appearance-label">Тема</span>
					<div class="settings__theme-toggle">
						<button
							v-for="opt in THEME_OPTIONS"
							:key="opt.value"
							class="settings__theme-btn"
							:class="{ 'settings__theme-btn--active': themeMode === opt.value }"
							@click="setTheme(opt.value)"
						>{{ opt.label }}</button>
					</div>
				</div>

				<!-- Выбор акцентного цвета -->
				<div class="settings__appearance-row">
					<span class="settings__appearance-label">Акцент</span>
					<div class="settings__accent-list">
						<button
							v-for="preset in ACCENT_PRESETS"
							:key="preset.id"
							class="settings__accent-btn"
							:class="{ 'settings__accent-btn--active': accentId === preset.id }"
							:style="{ '--accent-swatch': preset.color }"
							:title="preset.label"
							@click="setAccentColor(preset.id)"
						></button>
					</div>
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
import { useTheme } from '@/entrypoints/shared/composables/useTheme';
import { ACCENT_PRESETS, ThemeMode } from '@/shared/constants/theme';

const { themeMode, accentId, setTheme, setAccentColor } = useTheme();

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
	{ value: 'auto',  label: 'Авто' },
	{ value: 'light', label: 'Светлая' },
	{ value: 'dark',  label: 'Тёмная' },
];

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

<style scoped lang="scss">
.settings {
	padding: 10px;
	display: flex;
	flex-direction: column;
	gap: 8px;

	&__notice {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		background: $sp-notice-bg;
		border: 1px solid $sp-notice-border;
		border-radius: 8px;
		font-size: 12px;
		color: $sp-notice-text;
		line-height: 1.4;
		span { flex: 1; }

		&-close {
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
			@media (hover: hover) { &:hover { background: #f0d8b0; } }
		}
	}

	&__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2px 0 4px;
	}

	&__title {
		font-size: 14px;
		font-weight: 700;
		color: $sp-text-dark;
	}

	&__add-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		background: $sp-primary;
		color: $sp-on-primary;
		border: none;
		border-radius: 7px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
		svg { width: 13px; height: 13px; }
		@media (hover: hover) { &:hover { opacity: 0.85; } }
	}

	&__card {
		background: $sp-bg-card;
		border: 1px solid $sp-border-card;
		border-radius: 10px;
		overflow: hidden;

		&--add {
			padding: 12px;
			border-color: var(--sp-primary-a27);
			background: #f8fcff;
		}

		&-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 10px;

			&-title {
				font-size: 13px;
				font-weight: 600;
				color: $sp-text;
			}
		}

		&-close {
			width: 26px;
			height: 26px;
			border: 1px solid $sp-border-input;
			border-radius: 6px;
			background: $sp-bg-disabled;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			color: $sp-text-hint;
			transition: all 0.12s;
			svg { width: 13px; height: 13px; }
			@media (hover: hover) { &:hover { background: $sp-border-card; color: $sp-text; } }
		}
	}

	&__empty {
		text-align: center;
		padding: 32px 20px;
		color: $sp-text-light;
		p { font-size: 13px; margin-bottom: 4px; }

		&-icon { font-size: 36px; margin-bottom: 8px; }
		&-hint { font-size: 12px; }
	}

	&__channel {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;

		&-info { flex: 1; min-width: 0; }

		&-name {
			font-size: 13px;
			font-weight: 500;
			color: $sp-text-dark;
			display: flex;
			align-items: center;
			gap: 5px;
			flex-wrap: wrap;
		}

		&-badge {
			font-size: 10px;
			padding: 1px 5px;
			border-radius: 3px;
			font-weight: 600;
			&--active { background: $sp-chip-bg; color: $sp-chip-text; }
		}

		&-id {
			font-size: 10px;
			color: $sp-text-faint;
			font-family: monospace;
			margin-top: 1px;
		}

		&-actions {
			display: flex;
			gap: 3px;
			flex-shrink: 0;
		}

		&-btn {
			width: 28px;
			height: 28px;
			border: 1px solid $sp-border-card;
			border-radius: 6px;
			background: $sp-bg-editor;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			color: $sp-text-faint;
			transition: all 0.12s;
			svg { width: 14px; height: 14px; }
			@media (hover: hover) {
				&:hover { background: $sp-border-light; color: $sp-text-secondary; }
				&--active:hover { background: $sp-primary-dark; }
				&--danger:hover { background: $sp-danger; border-color: $sp-danger; color: $sp-on-danger; }
			}
			&--active { background: $sp-primary; border-color: $sp-primary; color: $sp-on-primary; }
		}
	}

	&__defaults {
		border-top: 1px solid $sp-border-light;
		padding: 12px;
		background: $sp-bg-editor;
		display: flex;
		flex-direction: column;
		gap: 8px;

		&-title {
			font-size: 10px;
			font-weight: 700;
			color: $sp-text-label;
			text-transform: uppercase;
			letter-spacing: 0.4px;
			padding-bottom: 2px;
			border-bottom: 1px solid $sp-border-light;
			margin-bottom: 2px;
		}

		&-field { display: flex; flex-direction: column; gap: 3px; }

		&-textarea {
			width: 100%;
			padding: 7px 9px;
			border: 1px solid $sp-border-input;
			border-radius: 6px;
			font-size: 12px;
			font-family: inherit;
			resize: vertical;
			outline: none;
			color: $sp-text;
			background: $sp-bg-card;
			&:focus { border-color: $sp-primary; }
		}

		&-warning {
			display: flex;
			flex-direction: column;
			gap: 6px;
			padding: 8px 10px;
			background: $sp-warning-bg;
			border: 1px solid $sp-warning-border;
			border-radius: 6px;
			font-size: 12px;
			color: $sp-warning-text;
		}

		&-insert-btn {
			align-self: flex-start;
			padding: 4px 10px;
			border: 1px solid #f0c040;
			border-radius: 5px;
			background: $sp-bg-card;
			font-size: 11px;
			font-weight: 600;
			color: $sp-warning-text;
			cursor: pointer;
			transition: background 0.1s;
			@media (hover: hover) { &:hover { background: #fff3c4; } }
		}

		&-actions {
			display: flex;
			align-items: center;
			gap: 8px;
		}
	}

	&__template-hint {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
		margin-top: 2px;

		&-label {
			font-size: 10px;
			color: $sp-text-light;
			font-weight: 600;
		}
	}

	&__tvar {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 4px;
		border: 1px solid $sp-chip-border;
		background: $sp-chip-bg;
		color: $sp-chip-text;
		cursor: pointer;
		font-family: monospace;
		transition: background 0.1s;
		@media (hover: hover) { &:hover { background: $sp-chip-hover; } }
	}

	&__save-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 7px 14px;
		background: $sp-primary;
		color: $sp-on-primary;
		border: none;
		border-radius: 7px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
		@media (hover: hover) { &:hover { opacity: 0.85; } }
	}

	&__save-hint {
		font-size: 12px;
		color: $sp-success;
		font-weight: 500;
	}

	&__appearance {
		display: flex;
		flex-direction: column;
		gap: 8px;

		&-card {
			background: $sp-bg-card;
			border: 1px solid $sp-border-card;
			border-radius: 10px;
			padding: 12px;
			display: flex;
			flex-direction: column;
			gap: 14px;
		}

		&-row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
		}

		&-label {
			font-size: 13px;
			font-weight: 500;
			color: $sp-text-secondary;
			flex-shrink: 0;
		}
	}

	&__theme-toggle {
		display: flex;
		gap: 4px;
	}

	&__theme-btn {
		padding: 5px 12px;
		border: 1px solid $sp-border-input;
		border-radius: 6px;
		background: $sp-bg-editor;
		color: $sp-text-muted;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.12s;

		@media (hover: hover) {
			&:hover { border-color: $sp-primary; color: $sp-primary; }
		}

		&--active {
			background: $sp-primary;
			border-color: $sp-primary;
			color: $sp-on-primary;
		}
	}

	&__accent-list {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	&__accent-btn {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid transparent;
		background: var(--accent-swatch);
		cursor: pointer;
		transition: transform 0.12s, box-shadow 0.12s;
		padding: 0;
		flex-shrink: 0;

		@media (hover: hover) {
			&:hover { transform: scale(1.15); }
		}

		&--active {
			box-shadow: 0 0 0 2px $sp-bg-card, 0 0 0 4px var(--accent-swatch);
		}
	}

	&__footer {
		font-size: 11px;
		color: $sp-text-faint;
		text-align: center;
		padding: 4px 0 8px;
		a { color: $sp-primary; text-decoration: none; }
	}
}
</style>
