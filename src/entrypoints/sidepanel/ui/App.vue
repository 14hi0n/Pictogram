<template>
	<div class="sp-app">
		<!-- <header class="sp-header">
			<img src="/icons/icon_32.png" class="sp-header__logo" :alt="APP_NAME" />
			<span class="sp-header__title">{{ APP_NAME }}</span>
		</header> -->

		<nav class="sp-app__nav">
			<button
				class="sp-app__nav-tab"
				:class="{ 'sp-app__nav-tab--active': activeTab === 'queue' }"
				@click="activeTab = 'queue'"
			>
				<span class="sp-app__nav-badge" v-if="queueCount > 0">{{ queueCount }}</span>
				Очередь
			</button>
			<button
				class="sp-app__nav-tab"
				:class="{ 'sp-app__nav-tab--active': activeTab === 'settings' }"
				@click="activeTab = 'settings'"
			>
				Настройки
			</button>
		</nav>

		<main class="sp-app__content">
			<QueueView v-if="activeTab === 'queue'" @queue-changed="refreshCount" />
			<SettingsView
				v-if="activeTab === 'settings'"
				:show-notice="showChannelsNotice"
				@dismiss-notice="showChannelsNotice = false"
			/>
		</main>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import QueueView from './views/QueueView.vue';
import SettingsView from './views/SettingsView.vue';
import { PostQueueManager } from '@/services/PostQueueManager';
import { STORAGE_KEYS, SIDE_PANEL_ACTIONS } from '@/shared/constants/storage';
import { APP_NAME } from '@/shared/constants/app';
import { useTheme } from '@/entrypoints/shared/composables/useTheme';

const { initTheme, cleanup: cleanupTheme } = useTheme();

const activeTab = ref<'queue' | 'settings'>('queue');
const queueCount = ref(0);
const showChannelsNotice = ref(false);
const queueManager = new PostQueueManager();

function onStorageChanged(changes: Record<string, chrome.storage.StorageChange>, area: string): void {
	if (area === 'local' && changes[STORAGE_KEYS.QUEUE]) {
		queueCount.value = (changes[STORAGE_KEYS.QUEUE].newValue as any[])?.length ?? 0;
	}
	// Background sets this flag when quick send is attempted with no channels configured
	if (area === 'local' && changes[STORAGE_KEYS.SIDE_PANEL_ACTION]?.newValue === SIDE_PANEL_ACTIONS.SETUP_CHANNELS) {
		chrome.storage.local.remove(STORAGE_KEYS.SIDE_PANEL_ACTION);
		activeTab.value = 'settings';
		showChannelsNotice.value = true;
	}
}

onMounted(async () => {
	await Promise.all([initTheme(), refreshCount(), checkPendingAction()]);
	chrome.storage.onChanged.addListener(onStorageChanged);
});

onUnmounted(() => {
	chrome.storage.onChanged.removeListener(onStorageChanged);
	cleanupTheme();
});

async function refreshCount(): Promise<void> {
	queueCount.value = await queueManager.getCount();
}

/** Read any action flag written by the background before the panel was opened. */
async function checkPendingAction(): Promise<void> {
	const data = await chrome.storage.local.get(STORAGE_KEYS.SIDE_PANEL_ACTION);
	if (data[STORAGE_KEYS.SIDE_PANEL_ACTION] === SIDE_PANEL_ACTIONS.SETUP_CHANNELS) {
		await chrome.storage.local.remove(STORAGE_KEYS.SIDE_PANEL_ACTION);
		activeTab.value = 'settings';
		showChannelsNotice.value = true;
	}
}
</script>

<style lang="scss">
@import '@/entrypoints/shared/styles/css-vars';

/* Сбрасываем тёмную тему из main.scss для side panel */
body {
	background: $sp-bg !important;
	color: $sp-text !important;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
	font-size: 14px;
	height: 100vh;
	height: 100dvh;
	overflow: hidden;
	margin: 0;
}

#app {
	height: 100vh;
	height: 100dvh;
	display: flex;
	justify-content: center;
}

/* Переопределяем link стиль из main.scss */
a {
	border-bottom: none !important;
}

/* Предотвращаем авто-зум на инпуты в мобильных браузерах (срабатывает при font-size < 16px) */
@media (max-width: 768px) {
	input, textarea, select {
		font-size: 16px !important;
	}
}
</style>

<style scoped lang="scss">
.sp-app {
	display: flex;
	flex-direction: column;
	height: 100vh;
	height: 100dvh;
	width: 100%;
	max-width: 480px;

	&__header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: $sp-bg-card;
		border-bottom: 1px solid $sp-border;
		flex-shrink: 0;

		&-logo { width: 20px; height: 20px; }

		&-title {
			font-weight: 600;
			font-size: 15px;
			color: $sp-primary;
		}
	}

	&__nav {
		display: flex;
		background: $sp-bg-card;
		border-bottom: 2px solid $sp-border;
		flex-shrink: 0;

		&-tab {
			flex: 1;
			padding: 10px 8px;
			min-height: 44px;
			border: none;
			background: transparent;
			cursor: pointer;
			font-size: 13px;
			font-weight: 500;
			color: $sp-text-muted;
			position: relative;
			transition: color 0.15s;

			@media (hover: hover) { &:hover { color: $sp-primary; } }

			&--active {
				color: $sp-primary;
				border-bottom: 2px solid $sp-primary;
				margin-bottom: -2px;
			}
		}

		&-badge {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-width: 18px;
			height: 18px;
			padding: 0 5px;
			background: $sp-primary;
			color: $sp-on-primary;
			border-radius: 9px;
			font-size: 11px;
			font-weight: 600;
			margin-right: 4px;
		}
	}

	&__content {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}
}
</style>
