<template>
	<div class="sp-app">
		<!-- <header class="sp-header">
			<img src="/icons/icon_32.png" class="sp-header__logo" :alt="APP_NAME" />
			<span class="sp-header__title">{{ APP_NAME }}</span>
		</header> -->

		<nav class="sp-tabs">
			<button
				class="sp-tabs__tab"
				:class="{ 'sp-tabs__tab--active': activeTab === 'queue' }"
				@click="activeTab = 'queue'"
			>
				<span class="sp-tabs__badge" v-if="queueCount > 0">{{ queueCount }}</span>
				Очередь
			</button>
			<button
				class="sp-tabs__tab"
				:class="{ 'sp-tabs__tab--active': activeTab === 'settings' }"
				@click="activeTab = 'settings'"
			>
				Настройки
			</button>
		</nav>

		<main class="sp-content">
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
	await Promise.all([refreshCount(), checkPendingAction()]);
	chrome.storage.onChanged.addListener(onStorageChanged);
});

onUnmounted(() => {
	chrome.storage.onChanged.removeListener(onStorageChanged);
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

<style>
/* Сбрасываем тёмную тему из main.scss для side panel */
body {
	background: #f0f2f5 !important;
	color: #333 !important;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
	font-size: 14px;
	height: 100vh;
	overflow: hidden;
}

#app {
	height: 100vh;
}

/* Переопределяем link стиль из main.scss */
a {
	border-bottom: none !important;
}
</style>

<style scoped>
.sp-app {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.sp-header {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 14px;
	background: #fff;
	border-bottom: 1px solid #e0e0e0;
	flex-shrink: 0;
}

.sp-header__logo {
	width: 20px;
	height: 20px;
}

.sp-header__title {
	font-weight: 600;
	font-size: 15px;
	color: #0088cc;
}

.sp-tabs {
	display: flex;
	background: #fff;
	border-bottom: 2px solid #e0e0e0;
	flex-shrink: 0;
}

.sp-tabs__tab {
	flex: 1;
	padding: 8px;
	border: none;
	background: transparent;
	cursor: pointer;
	font-size: 13px;
	font-weight: 500;
	color: #666;
	position: relative;
	transition: color 0.15s;

	&:hover {
		color: #0088cc;
	}

	&--active {
		color: #0088cc;
		border-bottom: 2px solid #0088cc;
		margin-bottom: -2px;
	}
}

.sp-tabs__badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 18px;
	height: 18px;
	padding: 0 5px;
	background: #0088cc;
	color: #fff;
	border-radius: 9px;
	font-size: 11px;
	font-weight: 600;
	margin-right: 4px;
}

.sp-content {
	flex: 1;
	overflow-y: auto;
	overflow-x: hidden;
}
</style>
