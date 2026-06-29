<template>
	<div class="flow">
		<!-- Шаг 1: Ввод токена -->
		<template v-if="step === 'token'">
			<p class="flow__hint">
				Создай бота через
				<a href="https://t.me/BotFather" target="_blank">@BotFather</a> и получи токен.
			</p>

			<div class="flow__field">
				<label class="flow__label">Bot Token</label>
				<input
					v-model="tokenInput"
					class="flow__input"
					type="text"
					placeholder="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi"
					@input="onTokenInput"
				/>
				<span v-if="tokenInput && !isValidToken" class="flow__error">
					Неверный формат токена
				</span>
			</div>

			<div v-if="fetchError" class="flow__alert flow__alert--error">{{ fetchError }}</div>

			<div class="flow__footer">
				<button class="flow__btn flow__btn--secondary" @click="$emit('cancel')">Отмена</button>
				<button
					class="flow__btn flow__btn--primary"
					:disabled="!isValidToken || isFetching"
					@click="fetchChannels"
				>
					<span v-if="isFetching" class="flow__spinner"></span>
					<span v-else>Найти каналы →</span>
				</button>
			</div>
		</template>

		<!-- Шаг 2: Выбор каналов -->
		<template v-if="step === 'channels'">
			<div class="flow__channels-header">
				<p class="flow__hint">Выбери каналы, куда бот может отправлять посты.</p>

				<!-- Подсказка о пустом списке -->
				<div v-if="foundChannels.length === 0" class="flow__empty">
					<div class="flow__alert flow__alert--info">
						Боту нужно свежее обновление от канала. Отправь любое сообщение в канал
						через бота — потом нажми «Обновить».
					</div>
					<button class="flow__btn flow__btn--secondary" style="align-self:flex-start" @click="fetchChannels">
						↻ Обновить
					</button>
					<div class="flow__divider">или введи ID канала вручную</div>
					<div class="flow__field">
						<label class="flow__label">Chat ID</label>
						<input
							v-model="manualChatId"
							class="flow__input"
							type="text"
							placeholder="-1001234567890"
						/>
						<span class="flow__hint-small">Узнать ID: перешли любое сообщение из канала боту @userinfobot</span>
					</div>
					<div class="flow__field">
						<label class="flow__label">Название канала</label>
						<input
							v-model="manualName"
							class="flow__input"
							type="text"
							placeholder="Мой арт-канал"
						/>
					</div>
					<button
						class="flow__btn flow__btn--primary"
						:disabled="!isValidManualId || isSaving"
						@click="addManually"
					>
						<span v-if="isSaving" class="flow__spinner"></span>
						<span v-else>Добавить канал</span>
					</button>
				</div>

				<template v-else>
					<label class="flow__select-all">
						<input
							type="checkbox"
							:checked="allSelected"
							:indeterminate.prop="someSelected && !allSelected"
							@change="toggleSelectAll"
						/>
						Выбрать все ({{ foundChannels.length }})
					</label>
				</template>
			</div>

			<div class="flow__channel-list">
				<label
					v-for="ch in foundChannels"
					:key="ch.id"
					class="flow__channel-item"
					:class="{ 'flow__channel-item--selected': selectedIds.has(String(ch.id)) }"
				>
					<input
						type="checkbox"
						:checked="selectedIds.has(String(ch.id))"
						@change="toggleChannel(String(ch.id))"
					/>
					<div class="flow__channel-info">
						<span class="flow__channel-name">{{ ch.title }}</span>
						<span class="flow__channel-meta">
							{{ ch.username ? '@' + ch.username : 'приватный' }} · ID: {{ ch.id }}
						</span>
					</div>
					<span v-if="!ch.username" class="flow__private-badge">🔒</span>
				</label>
			</div>

			<div class="flow__footer">
				<button class="flow__btn flow__btn--secondary" @click="goToToken">← Назад</button>
				<button
					class="flow__btn flow__btn--primary"
					:disabled="selectedIds.size === 0 || isSaving"
					@click="saveChannels"
				>
					<span v-if="isSaving" class="flow__spinner"></span>
					<span v-else>Добавить ({{ selectedIds.size }})</span>
				</button>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { TelegramChannelFetcher } from '@/services/TelegramChannelFetcher';
import { UserSettingsManager } from '@/services/UserSettingsManager';
import { createChannel } from '@/models/Channel';
import { botTokenValidator } from '@/utils/telegram/botTokenValidator';
import { RawChannel } from '@/models/RawChannel';

const emit = defineEmits<{
	(e: 'done'): void;
	(e: 'cancel'): void;
	(e: 'step-change', step: 'token' | 'channels'): void;
}>();

const settingsManager = new UserSettingsManager();

const step = ref<'token' | 'channels'>('token');
const tokenInput = ref('');
const isValidToken = computed(() => botTokenValidator(tokenInput.value));
const isFetching = ref(false);
const isSaving = ref(false);
const fetchError = ref('');
const foundChannels = ref<RawChannel[]>([]);
const selectedIds = ref(new Set<string>());

const manualChatId = ref('');
const manualName = ref('');
const isValidManualId = computed(() => /^-?\d+$/.test(manualChatId.value.trim()));

const allSelected = computed(() =>
	foundChannels.value.length > 0 && selectedIds.value.size === foundChannels.value.length
);
const someSelected = computed(() => selectedIds.value.size > 0);

function onTokenInput(): void {
	fetchError.value = '';
}

function goToToken(): void {
	step.value = 'token';
	emit('step-change', 'token');
}

/**
 * Опрашивает Telegram API (getUpdates) для получения списка каналов бота.
 */
async function fetchChannels(): Promise<void> {
	isFetching.value = true;
	fetchError.value = '';

	try {
		const fetcher = new TelegramChannelFetcher(tokenInput.value);
		foundChannels.value = await fetcher.getChannels();
		step.value = 'channels';
		emit('step-change', 'channels');
	} catch (err: any) {
		fetchError.value = 'Ошибка: ' + (err.message || 'не удалось получить данные от Telegram');
	} finally {
		isFetching.value = false;
	}
}

function toggleChannel(id: string): void {
	if (selectedIds.value.has(id)) {
		selectedIds.value.delete(id);
	} else {
		selectedIds.value.add(id);
	}
}

function toggleSelectAll(): void {
	if (allSelected.value) {
		selectedIds.value.clear();
	} else {
		foundChannels.value.forEach((ch) => selectedIds.value.add(String(ch.id)));
	}
}

async function addManually(): Promise<void> {
	isSaving.value = true;
	fetchError.value = '';
	try {
		const channel = createChannel({
			chatID: manualChatId.value.trim(),
			name: manualName.value.trim() || manualChatId.value.trim(),
			botToken: tokenInput.value,
		});
		await settingsManager.addChannel(channel);
		const updated = await settingsManager.getSettings();
		if (!updated.activeChatID && updated.channels.length > 0) {
			await settingsManager.setActiveChat(updated.channels[0].chatID);
		}
		emit('done');
	} catch (err: any) {
		fetchError.value = 'Ошибка: ' + (err.message || '');
	} finally {
		isSaving.value = false;
	}
}

/**
 * Сохраняет выбранные каналы в настройки пользователя.
 * Первый добавленный канал автоматически становится активным.
 */
async function saveChannels(): Promise<void> {
	isSaving.value = true;

	try {
		const settings = await settingsManager.getSettings();
		const existingIds = new Set(settings.channels.map((c) => c.chatID));

		for (const ch of foundChannels.value) {
			const idStr = String(ch.id);
			if (!selectedIds.value.has(idStr) || existingIds.has(idStr)) continue;

			const channel = createChannel({
				chatID: idStr,
				name: ch.title,
				botToken: tokenInput.value,
			});

			await settingsManager.addChannel(channel);
		}

		// Если активного канала нет — ставим первый добавленный
		const updatedSettings = await settingsManager.getSettings();
		if (!updatedSettings.activeChatID && updatedSettings.channels.length > 0) {
			await settingsManager.setActiveChat(updatedSettings.channels[0].chatID);
		}

		emit('done');
	} catch (err: any) {
		fetchError.value = 'Ошибка сохранения: ' + (err.message || '');
	} finally {
		isSaving.value = false;
	}
}
</script>

<style scoped lang="scss">
.flow {
	display: flex;
	flex-direction: column;
	gap: 12px;

	&__hint {
		font-size: 13px;
		color: $sp-text-muted;
		line-height: 1.5;
		a {
			color: $sp-primary;
			text-decoration: none;
			@media (hover: hover) { &:hover { text-decoration: underline; } }
		}
	}

	&__field { display: flex; flex-direction: column; gap: 4px; }

	&__label {
		font-size: 11px;
		font-weight: 600;
		color: $sp-text-muted;
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	&__input {
		width: 100%;
		padding: 8px 10px;
		border: 1px solid $sp-border-input;
		border-radius: 6px;
		font-size: 13px;
		outline: none;
		font-family: monospace;
		&:focus { border-color: $sp-primary; }
	}

	&__error { font-size: 11px; color: $sp-danger; }

	&__alert {
		padding: 10px 12px;
		border-radius: 6px;
		font-size: 12px;
		line-height: 1.5;
		&--error { background: $sp-danger-bg; color: $sp-danger-dark; border: 1px solid #f5c6cb; }
		&--info  { background: $sp-chip-bg; color: #1a6896; border: 1px solid #bee5eb; }
	}

	&__channels-header { display: flex; flex-direction: column; gap: 8px; }

	&__select-all {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		cursor: pointer;
		user-select: none;
	}

	&__channel {
		&-list {
			display: flex;
			flex-direction: column;
			gap: 6px;
			max-height: 300px;
			overflow-y: auto;
		}

		&-item {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 8px 10px;
			border: 1px solid $sp-border;
			border-radius: 6px;
			cursor: pointer;
			user-select: none;
			transition: background 0.1s;
			@media (hover: hover) { &:hover { background: $sp-bg-editor; } }
			&--selected { border-color: $sp-primary; background: #f0f8ff; }
			input[type='checkbox'] { flex-shrink: 0; cursor: pointer; }
		}

		&-info { flex: 1; min-width: 0; }

		&-name {
			display: block;
			font-size: 13px;
			font-weight: 500;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		&-meta { display: block; font-size: 11px; color: $sp-text-hint; }
	}

	&__private-badge { font-size: 12px; }

	&__empty { display: flex; flex-direction: column; gap: 10px; }

	&__divider {
		font-size: 11px;
		color: $sp-text-label;
		text-align: center;
		position: relative;
		padding: 4px 0;
		&::before, &::after {
			content: '';
			position: absolute;
			top: 50%;
			width: 30%;
			height: 1px;
			background: $sp-border;
		}
		&::before { left: 0; }
		&::after  { right: 0; }
	}

	&__hint-small { font-size: 11px; color: $sp-text-label; margin-top: 2px; }

	&__footer { display: flex; gap: 8px; justify-content: flex-end; }

	&__btn {
		padding: 7px 14px;
		border-radius: 6px;
		border: none;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 4px;
		transition: opacity 0.15s;
		@media (hover: hover) { &:hover:not(:disabled) { opacity: 0.85; } }
		&:disabled { opacity: 0.4; cursor: not-allowed; }
		&--primary   { background: $sp-primary;   color: $sp-bg-card; }
		&--secondary { background: $sp-bg-subtle; color: $sp-text;    }
	}

	&__spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-top-color: $sp-bg-card;
		border-radius: 50%;
		animation: flow-spin 0.7s linear infinite;
	}
}

@keyframes flow-spin { to { transform: rotate(360deg); } }
</style>
