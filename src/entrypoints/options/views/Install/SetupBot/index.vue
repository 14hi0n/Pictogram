<template>
	<div class="setup">
		<!-- Инструкции: показываем только пока пользователь вводит токен -->
		<template v-if="innerStep === 'token'">
			<h2 class="setup__title">Настройка бота</h2>

			<div class="setup__instructions">
				<div class="setup__step-item">
					<span class="setup__step-num">1</span>
					<p>
						Открой <a href="https://t.me/BotFather" target="_blank">@BotFather</a> в Telegram
						и введи команду <code>/newbot</code>
					</p>
				</div>
				<div class="setup__step-item">
					<span class="setup__step-num">2</span>
					<p>Следуй инструкциям и получи <strong>Bot Token</strong> (выглядит как <code>1234567890:ABC...xyz</code>)</p>
				</div>
				<div class="setup__step-item">
					<span class="setup__step-num">3</span>
					<p>Добавь бота в свой Telegram-канал как <strong>администратора</strong> с правом отправки сообщений</p>
				</div>
				<div class="setup__step-item">
					<span class="setup__step-num">4</span>
					<p>Вставь токен ниже и нажми «Найти каналы»</p>
				</div>
			</div>
		</template>

		<template v-else>
			<h2 class="setup__title">Выбор каналов</h2>
		</template>

		<AddChannelFlow
			@done="onDone"
			@cancel="$emit('back')"
			@step-change="innerStep = $event"
		/>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AddChannelFlow from '@/entrypoints/sidepanel/ui/components/AddChannelFlow.vue';
import { UserSettingsManager } from '@/services/UserSettingsManager';

const emit = defineEmits<{
	(e: 'next'): void;
	(e: 'back'): void;
}>();

const innerStep = ref<'token' | 'channels'>('token');
const settingsManager = new UserSettingsManager();

async function onDone(): Promise<void> {
	await settingsManager.setSetupComplete(true);
	emit('next');
}
</script>

<style scoped lang="scss">
.setup {
	max-width: 520px;
	margin: 0 auto;

	&__title {
		font-size: 22px;
		font-weight: 700;
		color: $sp-text-title;
		margin-bottom: 20px;
	}

	&__instructions {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 24px;
	}

	&__step {
		&-item {
			display: flex;
			gap: 12px;
			align-items: flex-start;
			p { font-size: 14px; color: $sp-text-secondary; line-height: 1.5; margin: 0; }
			a {
				color: $sp-primary;
				text-decoration: none;
				@media (hover: hover) { &:hover { text-decoration: underline; } }
			}
			code { background: $sp-border-light; padding: 1px 5px; border-radius: 3px; font-size: 13px; }
		}

		&-num {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 26px;
			height: 26px;
			border-radius: 50%;
			background: $sp-chip-bg;
			color: $sp-primary;
			font-size: 13px;
			font-weight: 700;
			flex-shrink: 0;
			margin-top: 1px;
		}
	}
}
</style>
