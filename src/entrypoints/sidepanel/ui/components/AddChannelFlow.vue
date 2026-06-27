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
					<span v-if="isFetching" class="spinner"></span>
					<span v-else>Найти каналы →</span>
				</button>
			</div>
		</template>

		<!-- Шаг 2: Выбор каналов -->
		<template v-if="step === 'channels'">
			<div class="flow__channels-header">
				<p class="flow__hint">Выбери каналы, куда бот может отправлять посты.</p>

				<!-- Подсказка о пустом списке -->
				<div v-if="foundChannels.length === 0" class="flow__alert flow__alert--info">
					Каналы не найдены. Отправь любое сообщение в нужный канал через бота
					(или удали старое) — это создаёт обновление, и бот «увидит» канал.
					<br /><br />
					<button class="flow__btn flow__btn--secondary" @click="fetchChannels">
						↻ Обновить
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
					<span v-if="isSaving" class="spinner"></span>
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

<style scoped>
.flow {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.flow__hint {
	font-size: 13px;
	color: #666;
	line-height: 1.5;

	a {
		color: #0088cc;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}
}

.flow__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.flow__label {
	font-size: 11px;
	font-weight: 600;
	color: #666;
	text-transform: uppercase;
	letter-spacing: 0.3px;
}

.flow__input {
	width: 100%;
	padding: 8px 10px;
	border: 1px solid #ddd;
	border-radius: 6px;
	font-size: 13px;
	outline: none;
	font-family: monospace;

	&:focus {
		border-color: #0088cc;
	}
}

.flow__error {
	font-size: 11px;
	color: #e74c3c;
}

.flow__alert {
	padding: 10px 12px;
	border-radius: 6px;
	font-size: 12px;
	line-height: 1.5;

	&--error {
		background: #fde8e8;
		color: #c0392b;
		border: 1px solid #f5c6cb;
	}

	&--info {
		background: #e8f4fd;
		color: #1a6896;
		border: 1px solid #bee5eb;
	}
}

.flow__channels-header {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.flow__select-all {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 12px;
	cursor: pointer;
	user-select: none;
}

.flow__channel-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
	max-height: 300px;
	overflow-y: auto;
}

.flow__channel-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	border: 1px solid #e0e0e0;
	border-radius: 6px;
	cursor: pointer;
	user-select: none;
	transition: background 0.1s;

	&:hover {
		background: #f9f9f9;
	}

	&--selected {
		border-color: #0088cc;
		background: #f0f8ff;
	}

	input[type='checkbox'] {
		flex-shrink: 0;
		cursor: pointer;
	}
}

.flow__channel-info {
	flex: 1;
	min-width: 0;
}

.flow__channel-name {
	display: block;
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.flow__channel-meta {
	display: block;
	font-size: 11px;
	color: #999;
}

.flow__private-badge {
	font-size: 12px;
}

.flow__footer {
	display: flex;
	gap: 8px;
	justify-content: flex-end;
}

.flow__btn {
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

	&:hover:not(:disabled) {
		opacity: 0.85;
	}

	&:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	&--primary {
		background: #0088cc;
		color: #fff;
	}

	&--secondary {
		background: #ecf0f1;
		color: #333;
	}
}

.spinner {
	display: inline-block;
	width: 14px;
	height: 14px;
	border: 2px solid rgba(255, 255, 255, 0.4);
	border-top-color: #fff;
	border-radius: 50%;
	animation: spin 0.7s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
