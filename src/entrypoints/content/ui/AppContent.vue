<template>
	<div class="aaf-overlay">

		<!-- ── Single-image mode (booru, single-image SPA) ── -->
		<div
			v-if="mediaItem && !isUnsupportedFormat"
			class="aaf-panel"
			:class="{ 'aaf-panel--fixed': panelFixed }"
			:style="panelFixed ? {} : { left: panelX + 'px', top: panelY + 'px' }"
		>
			<button
				class="aaf-btn aaf-btn--send"
				:class="{ 'aaf-btn--loading': isSending, 'aaf-btn--success': sendDone }"
				:disabled="isSending"
				:title="sendTitle"
				@click="handleQuickSend"
			>
				<span v-if="isSending" class="aaf-spin"></span>
				<svg v-else-if="sendDone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12"/>
				</svg>
				<svg v-else viewBox="0 0 24 24" fill="currentColor">
					<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
				</svg>
			</button>

			<button
				class="aaf-btn"
				:class="{ 'aaf-btn--queued': isInQueue, 'aaf-btn--queue': !isInQueue }"
				:title="isInQueue ? 'Убрать из очереди' : 'Добавить в очередь'"
				@click="toggleQueue"
			>
				<svg v-if="!isInQueue" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
					<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
				</svg>
				<svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12"/>
				</svg>
			</button>
		</div>

		<!-- ── Multi-image mode (Pixiv after "Show all") ── -->
		<div
			v-for="panel in panels"
			:key="panel.mediaUrl"
			class="aaf-panel"
			:style="{ left: panel.panelX + 'px', top: panel.panelY + 'px' }"
		>
			<button
				class="aaf-btn aaf-btn--send"
				:class="{ 'aaf-btn--loading': panel.isSending, 'aaf-btn--success': panel.sendDone }"
				:disabled="panel.isSending"
				:title="getPanelSendTitle(panel)"
				@click="handleQuickSendForPanel(panel)"
			>
				<span v-if="panel.isSending" class="aaf-spin"></span>
				<svg v-else-if="panel.sendDone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12"/>
				</svg>
				<svg v-else viewBox="0 0 24 24" fill="currentColor">
					<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
				</svg>
			</button>

			<button
				class="aaf-btn"
				:class="{ 'aaf-btn--queued': panel.isInQueue, 'aaf-btn--queue': !panel.isInQueue }"
				:title="panel.isInQueue ? 'Убрать из очереди' : 'Добавить в очередь'"
				@click="toggleQueueForPanel(panel)"
			>
				<svg v-if="!panel.isInQueue" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
					<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
				</svg>
				<svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12"/>
				</svg>
			</button>
		</div>

	<!-- Toast-уведомления (ошибки быстрой отправки и др.) -->
	<div v-if="toast" class="aaf-toast" :class="'aaf-toast--' + toast.type">
		{{ toast.message }}
	</div>

</div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, markRaw } from 'vue';
import { UserSettingsManager } from '@/services/UserSettingsManager';
import { ACCENT_PRESETS } from '@/shared/constants/theme';
import { providerManager } from '@/providers/registry';
import { MediaItem } from '@/models/MediaItem';
import { BaseProvider } from '@/providers/interfaces/BaseProvider';
import { AppMessage, MSG } from '@/entrypoints/background/types';
import { QueueEntry, isGroupItem } from '@/models/PostQueueGroupItem';
import type { PostQueueItem } from '@/models/PostQueueItem';
import type { MediaCandidate } from '@/models/MediaCandidate';
import { STORAGE_KEYS } from '@/shared/constants/storage';
import { useQueueSync } from './composables/useQueueSync';
import { usePositioning } from './composables/usePositioning';

// ── Theme ─────────────────────────────────────────────────────────────────────
const shadowRoot = inject<ShadowRoot>('shadowRoot');

async function applyAccentToShadow(): Promise<void> {
	const settings = await new UserSettingsManager().getSettings();
	const preset = ACCENT_PRESETS.find(p => p.id === settings.accentColor) ?? ACCENT_PRESETS[0];
	const host = shadowRoot?.host as HTMLElement | undefined;
	if (!host) return;
	host.style.setProperty('--sp-primary',    preset.color);
	host.style.setProperty('--sp-on-primary', preset.onColor);
}

// ── Per-panel state type (multi-image mode) ────────────────────────────────────
interface PanelState {
	index: number;
	element: HTMLElement;
	mediaUrl: string;
	panelX: number;
	panelY: number;
	isSending: boolean;
	sendDone: boolean;
	isInQueue: boolean;
}

// ── Single-image mode state ────────────────────────────────────────────────────
const mediaItem           = ref<MediaItem | null>(null);
const isUnsupportedFormat = ref(false);
const isSending           = ref(false);
const sendDone            = ref(false);
const toast               = ref<{ message: string; type: 'error' | 'ok' } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// ── Multi-image mode state ─────────────────────────────────────────────────────
const panels = ref<PanelState[]>([]);

// ── Composables ────────────────────────────────────────────────────────────────
const { isInQueue, channelName, checkUrlInQueue, checkMediaUrlInQueue, syncSingle, syncMulti, loadChannelName } = useQueueSync();
const { panelX, panelY, panelFixed, updateSingle, updatePanels, startObserving, stopObserving } = usePositioning();

// ── Module-level (non-reactive) ────────────────────────────────────────────────
let storageListener: ((changes: Record<string, chrome.storage.StorageChange>, area: string) => void) | null = null;
let spaRetryHandle: ReturnType<typeof setTimeout> | null = null;
let componentMounted = true;
let urlObserver: MutationObserver | null = null;
let lastObservedHref = '';
let activeProvider: BaseProvider | null = null;
// Cached artwork metadata shared by all per-image panels (title, tags, author, …)
let sharedMetaItem: MediaItem | null = null;
// MutationObserver for multi-mode: re-scans targets when artwork container DOM changes
let domObserver: MutationObserver | null = null;
let domObserverDebounce: ReturnType<typeof setTimeout> | null = null;

const sendTitle = computed(() =>
	isSending.value  ? 'Отправка...'
	: sendDone.value ? 'Отправлено!'
	: channelName.value ? `Отправить в ${channelName.value}`
	: 'Отправить'
);

function showToast(message: string, type: 'error' | 'ok' = 'error'): void {
	if (toastTimer !== null) { clearTimeout(toastTimer); toastTimer = null; }
	toast.value = { message, type };
	toastTimer = setTimeout(() => { toast.value = null; toastTimer = null; }, 3000);
}

function getPanelSendTitle(panel: PanelState): string {
	if (panel.isSending) return 'Отправка...';
	if (panel.sendDone) return 'Отправлено!';
	return channelName.value ? `Отправить в ${channelName.value}` : 'Отправить';
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────

onMounted(() => {
	lastObservedHref = window.location.href;
	const titleEl = document.querySelector('title');
	if (titleEl) {
		urlObserver = new MutationObserver(() => {
			const href = window.location.href;
			if (href === lastObservedHref) return;
			lastObservedHref = href;
			handleUrlChange();
		});
		urlObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
	}
	void init();
	void applyAccentToShadow();
});

onUnmounted(() => {
	componentMounted = false;
	urlObserver?.disconnect();
	if (spaRetryHandle !== null) { clearTimeout(spaRetryHandle); spaRetryHandle = null; }
	stopObserving();
	window.removeEventListener('scroll', updatePosition);
	window.removeEventListener('scroll', updateAllPanelPositions);
	document.removeEventListener('click', handleSpaClick);
	if (storageListener) chrome.storage.onChanged.removeListener(storageListener);
	stopDomObserver();
	activeProvider = null;
	sharedMetaItem = null;
});

// ── Initialisation ─────────────────────────────────────────────────────────────

async function init(): Promise<void> {
	const href = window.location.href;
	const provider = providerManager.getProviderForUrl(href);
	if (!provider) return;

	if (provider.matches) {
		try { if (!provider.matches(new URL(href))) return; }
		catch { return; }
	}

	activeProvider = provider;

	// Multi-target mode: provider exposes per-image targets (e.g. Pixiv multi-image)
	if (typeof provider.findMediaTargets === 'function') {
		attemptMultiLoad(provider, 0);
		return;
	}

	// Single SPA mode: provider signals DOM readiness via findAnchorElement
	if (typeof provider.findAnchorElement === 'function') {
		attemptSpaLoad(provider, 0);
		return;
	}

	// Booru mode: collect synchronously and show one panel
	try { mediaItem.value = provider.collectMediaItem(); }
	catch { return; }
	await finishSingleInit();
}

// ── Single-image SPA loading (unchanged logic) ─────────────────────────────────

function attemptSpaLoad(provider: BaseProvider, attempt: number): void {
	if (!componentMounted || mediaItem.value !== null) return;

	if (provider.findAnchorElement?.()) {
		try { mediaItem.value = provider.collectMediaItem(); } catch { /* not ready */ }
	}

	if (mediaItem.value !== null) {
		void finishSingleInit();
		return;
	}

	if (attempt < 20 && componentMounted) {
		spaRetryHandle = setTimeout(() => attemptSpaLoad(provider, attempt + 1), 500);
	}
}

async function finishSingleInit(): Promise<void> {
	if (!componentMounted || !mediaItem.value) return;

	const ext = mediaItem.value.extension?.toLowerCase();
	if (ext === 'webm' || ext === 'gif') { isUnsupportedFormat.value = true; return; }

	updatePosition();
	startObserving([mediaItem.value.element, document.documentElement], () => updatePosition());
	window.addEventListener('scroll', updatePosition, { passive: true });

	if (activeProvider?.findAnchorElement) {
		document.addEventListener('click', handleSpaClick);
	}

	const url = mediaItem.value.pageUrl ?? window.location.href;
	await Promise.all([loadChannelName(), syncSingle(url)]);
	if (!componentMounted) return;

	storageListener = (changes, area) => {
		if (area === 'local' && changes[STORAGE_KEYS.QUEUE]) {
			const q: QueueEntry[] = changes[STORAGE_KEYS.QUEUE].newValue || [];
			const pageUrl = mediaItem.value?.pageUrl ?? window.location.href;
			isInQueue.value = checkUrlInQueue(q, pageUrl);
		}
		if (area === 'sync' && changes[STORAGE_KEYS.SETTINGS]) void loadChannelName();
	};
	chrome.storage.onChanged.addListener(storageListener);
}

// ── Multi-image loading (Pixiv) ────────────────────────────────────────────────

function attemptMultiLoad(provider: BaseProvider, attempt: number): void {
	if (!componentMounted) return;

	// findAnchorElement is the DOM-readiness signal shared by all SPA providers
	if (provider.findAnchorElement?.()) {
		scanTargets();
		if (panels.value.length > 0) {
			void finishMultiInit();
			return;
		}
	}

	if (attempt < 20 && componentMounted) {
		spaRetryHandle = setTimeout(() => attemptMultiLoad(provider, attempt + 1), 500);
		return;
	}

	// All retries exhausted (e.g. mobile browser with different DOM structure).
	// Fall back to single-image booru-style mode: provider may still be able to
	// collect metadata even without a visible anchor element, showing fixed-position buttons.
	try { mediaItem.value = provider.collectMediaItem(); } catch { return; }
	void finishSingleInit();
}

/**
 * Reconcile the panels array against the current DOM.
 * - Collect shared metadata once (title, tags, author, …).
 * - Add a new PanelState for each target not yet tracked.
 * - Update the element reference of existing panels (React re-renders replace DOM nodes).
 * - Position all panels immediately so the first render is correct.
 */
function scanTargets(): void {
	if (!activeProvider?.findMediaTargets) return;

	if (!sharedMetaItem) {
		try { sharedMetaItem = activeProvider.collectMediaItem(); }
		catch { return; }
	}

	const targets = activeProvider.findMediaTargets();
	if (targets.length === 0) return;

	// Refresh element refs for panels already tracked (handles React re-renders)
	for (const panel of panels.value) {
		const fresh = targets.find(t => t.mediaUrl === panel.mediaUrl);
		if (fresh) panel.element = markRaw(fresh.element);
	}

	// Add panels for newly visible images
	const existingUrls = new Set(panels.value.map(p => p.mediaUrl));
	let added = false;
	for (const t of targets) {
		if (!existingUrls.has(t.mediaUrl)) {
			panels.value.push({
				index: t.index,
				element: markRaw(t.element),
				mediaUrl: t.mediaUrl,
				panelX: 0,
				panelY: 0,
				isSending: false,
				sendDone: false,
				isInQueue: false,
			});
			added = true;
		}
	}

	updateAllPanelPositions();
	if (added) void syncMulti(panels.value);
}

async function finishMultiInit(): Promise<void> {
	if (!componentMounted || panels.value.length === 0) return;

	startObserving([document.documentElement], () => updateAllPanelPositions());
	window.addEventListener('scroll', updateAllPanelPositions, { passive: true });
	document.addEventListener('click', handleSpaClick);

	// MutationObserver is the primary mechanism for detecting new images after "Show all".
	// Pixiv's React may take longer than any fixed timeout to finish re-rendering,
	// so a click-based setTimeout alone is not reliable.
	startDomObserver();

	await Promise.all([loadChannelName(), syncMulti(panels.value)]);
	if (!componentMounted) return;

	storageListener = (changes, area) => {
		if (area === 'local' && changes[STORAGE_KEYS.QUEUE]) {
			const q: QueueEntry[] = changes[STORAGE_KEYS.QUEUE].newValue || [];
			for (const p of panels.value) {
				p.isInQueue = checkMediaUrlInQueue(q, p.mediaUrl);
			}
		}
		if (area === 'sync' && changes[STORAGE_KEYS.SETTINGS]) void loadChannelName();
	};
	chrome.storage.onChanged.addListener(storageListener);
}

// ── URL change handling ────────────────────────────────────────────────────────

function handleUrlChange(): void {
	if (spaRetryHandle !== null) { clearTimeout(spaRetryHandle); spaRetryHandle = null; }
	stopObserving();
	window.removeEventListener('scroll', updatePosition);
	window.removeEventListener('scroll', updateAllPanelPositions);
	document.removeEventListener('click', handleSpaClick);
	if (storageListener) { chrome.storage.onChanged.removeListener(storageListener); storageListener = null; }
	stopDomObserver();
	activeProvider = null;
	sharedMetaItem = null;

	mediaItem.value = null;
	isUnsupportedFormat.value = false;
	isSending.value = false;
	sendDone.value = false;
	isInQueue.value = false;
	panels.value = [];

	void init();
}

// ── Positioning ────────────────────────────────────────────────────────────────

function updatePosition(): void {
	let el = mediaItem.value?.element;
	if (!el) {
		// No anchor element - fall back to fixed top-right position
		updateSingle(undefined);
		return;
	}

	if (!document.body.contains(el) && activeProvider?.findAnchorElement) {
		const fresh = activeProvider.findAnchorElement();
		if (fresh && mediaItem.value) {
			mediaItem.value = { ...mediaItem.value, element: fresh as HTMLElement };
			el = fresh as HTMLElement;
		}
	}

	updateSingle(el);
}

function updateAllPanelPositions(): void {
	updatePanels(panels.value);
}

/**
 * Watch `main` for any DOM change and debounce a scanTargets() call.
 * This is the primary mechanism for detecting new images after "Show all" -
 * more reliable than a fixed-delay setTimeout because React's render time varies.
 * childList+subtree catches node insertion; attributes/src catches lazy-src swaps.
 */
function startDomObserver(): void {
	if (domObserver || !activeProvider?.findMediaTargets) return;
	const main = document.querySelector('main');
	if (!main) return;
	domObserver = new MutationObserver(() => {
		if (domObserverDebounce !== null) clearTimeout(domObserverDebounce);
		domObserverDebounce = setTimeout(() => {
			domObserverDebounce = null;
			scanTargets();
		}, 300);
	});
	domObserver.observe(main, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['src'],
	});
}

function stopDomObserver(): void {
	if (domObserverDebounce !== null) { clearTimeout(domObserverDebounce); domObserverDebounce = null; }
	domObserver?.disconnect();
	domObserver = null;
}

// After any SPA click (e.g. "Show all"), React re-renders asynchronously.
// 350 ms is enough for Pixiv to swap in the new DOM.
function handleSpaClick(): void {
	if (activeProvider?.findMediaTargets) {
		setTimeout(scanTargets, 350);
	} else {
		setTimeout(updatePosition, 350);
	}
}

// ── Thumbnail fetching ─────────────────────────────────────────────────────────
// Fetch the CDN thumbnail in the content script context and encode it as a
// base64 data URL so the sidepanel can display it without any CDN request.
//
// Danbooru CDN (cdn.donmai.us) is publicly accessible - no Referer required -
// and returns Access-Control-Allow-Origin: *, so a standard fetch() works in
// any browser's content script without needing Chrome-specific CORS bypass or
// declarativeNetRequest. For other CDNs (pximg.net, etc.) that do require
// Referer, the fetch may fail; we fall back to the raw URL so declarativeNetRequest
// can still add Referer on Chrome/Kiwi. Returns undefined if no URL given.
async function resolveThumbnailUrl(url: string | undefined): Promise<string | undefined> {
	if (!url) return undefined;

	// Path 1: fetch() + FileReader - works on Chrome with host_permissions CORS bypass
	// + declarativeNetRequest Referer injection for xmlhttprequest type.
	try {
		const res = await fetch(url);
		if (res.ok) {
			const blob = await res.blob();
			const dataUrl = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result as string);
				reader.onerror = () => reject();
				reader.readAsDataURL(blob);
			});
			if (dataUrl) return dataUrl;
		}
	} catch { /* fall through */ }

	// Path 2: crossOrigin image + canvas (standard web API, no extension-specific behaviour).
	// Works when CDN responds with Access-Control-Allow-Origin for the page origin -
	// pximg.net allows this for www.pixiv.net (required for Pixiv's own ugoira downloader).
	// Canvas scaled to ≤250px keeps the stored base64 compact.
	try {
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => {
				try {
					const MAX = 250;
					const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight, 1));
					const canvas = document.createElement('canvas');
					canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
					canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
					const ctx = canvas.getContext('2d');
					if (!ctx) { reject(); return; }
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
					resolve(canvas.toDataURL('image/jpeg', 0.8));
				} catch {
					reject(); // SecurityError: canvas tainted - CDN has no CORS headers
				}
			};
			img.onerror = () => reject();
			img.src = url;
		});
		if (dataUrl) return dataUrl;
	} catch { /* fall through */ }

	// Path 3: raw URL - declarativeNetRequest injects Referer for image-type requests
	// in the sidepanel on Chrome/Kiwi.
	return url;
}

// ── Single-image actions ───────────────────────────────────────────────────────

async function handleQuickSend(): Promise<void> {
	if (!mediaItem.value || isSending.value || sendDone.value) return;
	isSending.value = true;
	const { mediaUrl, mediaType, sourceUrl, hashtags, title, authorName, authorUrl, mediaCandidates } = mediaItem.value;
	try {
		await msg({ type: MSG.QUICK_SEND, data: { mediaUrl, mediaType, sourceUrl, hashtags, title, authorName, authorUrl, mediaCandidates } });
		isSending.value = false;
		sendDone.value = true;
		setTimeout(() => { sendDone.value = false; }, 1800);
	} catch (err: any) {
		isSending.value = false;
		showToast(err?.message || 'Ошибка отправки');
	}
}

async function toggleQueue(): Promise<void> {
	if (!mediaItem.value) return;
	if (isInQueue.value) await removeFromQueue();
	else await addToQueue();
}

async function addToQueue(): Promise<void> {
	if (!mediaItem.value) return;
	const { mediaUrl, mediaType, pageUrl, sourceUrl, hashtags, title, authorName, authorUrl, customDescription, additionalMediaUrls, mediaCandidates, thumbnailUrl: rawThumbUrl } = mediaItem.value;
	const thumbnailUrl = await resolveThumbnailUrl(rawThumbUrl);
	try {
		await msg({ type: MSG.ADD_TO_QUEUE, data: { mediaUrl, mediaType, pageUrl, sourceUrl, hashtags, title, authorName, authorUrl, customDescription, additionalMediaUrls, mediaCandidates, thumbnailUrl } });
		isInQueue.value = true;
		// await msg({ type: MSG.OPEN_SIDE_PANEL });
	} catch { /* ничего */ }
}

async function removeFromQueue(): Promise<void> {
	if (!mediaItem.value) return;
	const url = mediaItem.value.pageUrl ?? window.location.href;
	return new Promise(resolve => {
		chrome.storage.local.get(STORAGE_KEYS.QUEUE, data => {
			const q: QueueEntry[] = data[STORAGE_KEYS.QUEUE] || [];
			const filtered = q.filter((e) =>
				isGroupItem(e)
					? !e.members.some((m) => m.pageUrl === url)
					: e.pageUrl !== url
			);
			chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: filtered }, () => {
				isInQueue.value = false;
				resolve();
			});
		});
	});
}

// ── Per-image actions (multi-image mode) ───────────────────────────────────────

async function handleQuickSendForPanel(panel: PanelState): Promise<void> {
	if (panel.isSending || panel.sendDone || !sharedMetaItem) return;
	panel.isSending = true;
	const { mediaType, sourceUrl, hashtags, title, authorName, authorUrl } = sharedMetaItem;
	// Inherit source/skipProbe from the provider's own candidate template so this code
	// stays provider-agnostic (works for any multi-image provider, not just Pixiv).
	const tpl = sharedMetaItem.mediaCandidates?.[0];
	const mediaCandidates: MediaCandidate[] = [{
		url: panel.mediaUrl,
		type: tpl?.type ?? 'photo',
		source: tpl?.source ?? 'generic',
		skipProbe: tpl?.skipProbe,
		priority: 1,
	}];
	try {
		await msg({ type: MSG.QUICK_SEND, data: { mediaUrl: panel.mediaUrl, mediaType, sourceUrl, hashtags, title, authorName, authorUrl, mediaCandidates } });
		panel.isSending = false;
		panel.sendDone = true;
		setTimeout(() => { panel.sendDone = false; }, 1800);
	} catch {
		panel.isSending = false;
	}
}

async function toggleQueueForPanel(panel: PanelState): Promise<void> {
	if (panel.isInQueue) await removeFromQueueForPanel(panel);
	else await addToQueueForPanel(panel);
}

async function addToQueueForPanel(panel: PanelState): Promise<void> {
	if (!sharedMetaItem) return;
	const { pageUrl, sourceUrl, hashtags, title, authorName, authorUrl, customDescription, mediaType, thumbnailUrl: rawThumbUrl } = sharedMetaItem;
	// Inherit source/skipProbe from the provider's own candidate template so this code
	// stays provider-agnostic (works for any multi-image provider, not just Pixiv).
	const tpl = sharedMetaItem.mediaCandidates?.[0];
	const mediaCandidates: MediaCandidate[] = [{
		url: panel.mediaUrl,
		type: tpl?.type ?? 'photo',
		source: tpl?.source ?? 'generic',
		skipProbe: tpl?.skipProbe,
		priority: 1,
	}];
	const thumbnailUrl = await resolveThumbnailUrl(rawThumbUrl);
	try {
		// No additionalMediaUrls - per-image action adds only this single image
		await msg({ type: MSG.ADD_TO_QUEUE, data: { mediaUrl: panel.mediaUrl, mediaType, pageUrl, sourceUrl, hashtags, title, authorName, authorUrl, customDescription, mediaCandidates, thumbnailUrl } });
		panel.isInQueue = true;
	} catch { /* ничего */ }
}

async function removeFromQueueForPanel(panel: PanelState): Promise<void> {
	return new Promise(resolve => {
		chrome.storage.local.get(STORAGE_KEYS.QUEUE, data => {
			const q: QueueEntry[] = data[STORAGE_KEYS.QUEUE] || [];
			// Per-image items share pageUrl; identify by mediaUrl
			const filtered = q.filter((e) =>
				isGroupItem(e) || (e as PostQueueItem).mediaUrl !== panel.mediaUrl
			);
			chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: filtered }, () => {
				panel.isInQueue = false;
				resolve();
			});
		});
	});
}

// ── Messaging ──────────────────────────────────────────────────────────────────

function msg(message: AppMessage): Promise<any> {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(message, res => {
			if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
			if (res?.ok === false) { reject(new Error(res.error || 'Ошибка')); return; }
			resolve(res);
		});
	});
}
</script>

<style lang="scss">
.aaf-overlay {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 0;
	overflow: visible;
	pointer-events: none;
	z-index: 2147483647;
}

.aaf-panel {
	position: absolute;
	pointer-events: auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	padding: 5px;
	background: rgba(0, 0, 0, 0.58);
	backdrop-filter: blur(8px);
	-webkit-backdrop-filter: blur(8px);
	border-radius: 8px;
	border: 1px solid rgba(255, 255, 255, 0.10);
	opacity: 0.78;
	transition: opacity 0.15s;
	user-select: none;

	&:hover { opacity: 1; }

	&--fixed {
		position: fixed !important;
		top: 8px;
		right: 8px;
		left: auto !important;
	}
}

.aaf-btn {
	width: 32px;
	height: 32px;
	border: none !important;
	border-radius: 6px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	transition: transform 0.1s, background 0.15s;
	flex-shrink: 0;

	svg { width: 15px; height: 15px; display: block; }

	&:active:not(:disabled) { transform: scale(0.88); }

	&--send {
		background: var(--sp-primary, #0088cc) !important;
		color: var(--sp-on-primary, #fff) !important;
		&:hover:not(:disabled) { filter: brightness(1.12); }
		&:disabled { opacity: 0.45; cursor: not-allowed; }
	}

	&--success {
		background: #27ae60 !important;
		color: #fff !important;
		cursor: default;
	}

	&--queue {
		background: rgba(255, 255, 255, 0.13) !important;
		color: rgba(255, 255, 255, 0.82) !important;
		&:hover { background: rgba(255, 255, 255, 0.22) !important; color: #fff !important; }
	}

	&--queued {
		background: #27ae60 !important;
		color: #fff !important;
		&:hover { background: rgba(231, 76, 60, 0.8) !important; }
	}

	&--loading { cursor: wait; }
}

.aaf-spin {
	width: 13px;
	height: 13px;
	border: 2px solid rgba(255, 255, 255, 0.3);
	border-top-color: #fff;
	border-radius: 50%;
	animation: aaf-spin 0.7s linear infinite;
	display: block;
}

@keyframes aaf-spin { to { transform: rotate(360deg); } }

.aaf-toast {
	position: fixed;
	bottom: 24px;
	left: 50%;
	transform: translateX(-50%);
	padding: 10px 16px;
	border-radius: 8px;
	font-size: 13px;
	font-weight: 500;
	color: #fff;
	pointer-events: none;
	z-index: 2147483647;
	white-space: nowrap;
	max-width: calc(100vw - 32px);
	white-space: normal;
	text-align: center;
	box-shadow: 0 4px 12px rgba(0,0,0,0.25);
	animation: aaf-toast-in 0.2s ease;

	&--error { background: #e74c3c; }
	&--ok    { background: #27ae60; }
}

@keyframes aaf-toast-in {
	from { opacity: 0; transform: translateX(-50%) translateY(8px); }
	to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
