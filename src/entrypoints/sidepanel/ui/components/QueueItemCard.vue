<template>
	<BaseQueueCard
		variant="single"
		:id="item.id"
		:enabled="item.enabled"
		:selected="selected"
		:is-sending="isSending"
		:added-at="item.addedAt"
		:title="siteDomain"
		:channels="channels"
		:activeChatID="activeChatID"
		v-model:expanded="expanded"
		v-model:override-expanded="overrideExpanded"
		v-model:tags-expanded="tagsExpanded"
		:description="localDescription"
		@update:description="onDescriptionInput"
		v-model:override-template="overrideTemplateDraft"
		:channel-id="localChannelID"
		:template-vars="templateVars"
		:has-any-tag-var="hasAnyTagVar"
		:has-any-controls="hasAnyControls"
		:all-tags="allTags"
		:ui-excluded-tags="uiExcludedTags"
		:enabled-tags="enabledTags"
		:visible-tags="visibleTags"
		:hidden-tags-count="hiddenTagsCount"
		:tags-visible="TAGS_VISIBLE"
		:effective-template="effectiveTemplate"
		:is-template-overridden="isTemplateOverridden"
		:effective-channel-name="effectiveChannelName"
		:is-sync-needed="isSyncNeeded"
		:on-toggle-tag="toggleTag"
		:on-enable-all-tags="enableAllTags"
		:on-disable-all-tags="disableAllTags"
		:on-insert-var="insertVar"
		:on-sync-to-global="syncToGlobal"
		:on-channel-change="onChannelChange"
		:set-override-el-ref="setOverrideElRef"
		@toggle="$emit('toggle', $event)"
		@select="$emit('select', $event)"
	>
		<template #preview>
			<div class="card__preview">
				<img v-if="!imgFailed" :src="imgSrc" class="card__img" :alt="siteDomain" @error="onImgError" />
				<div v-else class="card__img-placeholder">{{ siteDomain }}</div>
			</div>
		</template>

		<template #advanced-extra>
			<label class="card__editor-label" style="margin-top:8px">Source URL</label>
			<input
				v-model="localSourceUrl"
				type="url"
				class="card__editor-input"
				placeholder="https://..."
				@blur="emitSourceUpdate"
			/>
			<label class="card__editor-label" style="margin-top:8px">Author</label>
			<input
				v-model="localAuthorName"
				type="text"
				class="card__editor-input"
				placeholder="Имя автора"
				@blur="emitMetaUpdate"
			/>
			<label class="card__editor-label" style="margin-top:8px">Author URL</label>
			<input
				v-model="localAuthorUrl"
				type="url"
				class="card__editor-input"
				placeholder="https://..."
				@blur="emitMetaUpdate"
			/>
		</template>

		<template #footer-actions="{ isSending: sending }: { isSending: boolean }">
			<button class="card__action-btn card__action-btn--danger" @click="$emit('remove', item.id)">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
				Удалить
			</button>
			<a :href="item.pageUrl" target="_blank" class="card__action-btn card__action-btn--link">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
				Открыть
			</a>
			<button class="card__action-btn card__action-btn--primary" :disabled="sending" @click="$emit('send', itemForSend)">
				<svg v-if="!sending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
				<span v-if="sending" class="card__action-spinner"></span>
				{{ sending ? 'Отправка...' : 'Отправить' }}
			</button>
		</template>
	</BaseQueueCard>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import BaseQueueCard from '@/entrypoints/shared/components/BaseQueueCard.vue';
import { PostQueueItem } from '@/models/PostQueueItem';
import { PostSettings } from '@/models/PostSettings';
import { Channel } from '@/models/Channel';
import { useCardEditor } from '../composables/useCardEditor';

const props = defineProps<{
	item: PostQueueItem;
	channels: Channel[];
	activeChatID: string | null;
	selected?: boolean;
	isSending?: boolean;
}>();

const emit = defineEmits<{
	(e: 'toggle', id: string): void;
	(e: 'remove', id: string): void;
	(e: 'send', item: PostQueueItem): void;
	(e: 'update-settings', id: string, settings: PostSettings): void;
	(e: 'update-channel', id: string, channelID: string | null): void;
	(e: 'update-source', id: string, sourceUrl: string): void;
	(e: 'update-meta', id: string, meta: { authorName: string; authorUrl: string }): void;
	(e: 'select', id: string): void;
}>();

const imgSrc         = ref(props.item.thumbnailUrl ?? props.item.mediaUrl);
const imgFailed      = ref(false);
const localSourceUrl = ref(props.item.sourceUrl  ?? '');
const localAuthorName = ref(props.item.authorName ?? '');
const localAuthorUrl  = ref(props.item.authorUrl  ?? '');

function onImgError(): void {
	imgFailed.value = true;
}

const siteDomain = (() => {
	try { return new URL(props.item.pageUrl).hostname.replace('www.', ''); }
	catch { return props.item.pageUrl; }
})();

const {
	TAGS_VISIBLE,
	expanded, overrideExpanded, tagsExpanded, overrideEl,
	localChannelID, localDescription,
	effectiveTemplate, isTemplateOverridden, templateVars,
	effectiveChannelName, hasAnyTagVar, hasAnyControls,
	allTags, uiExcludedTags, enabledTags, visibleTags, hiddenTagsCount,
	buildSettings, emitUpdate, toggleTag, enableAllTags, disableAllTags,
	insertVar, overrideTemplateDraft, isSyncNeeded, syncToGlobal, onChannelChange,
} = useCardEditor(
	props,
	(id, settings) => emit('update-settings', id, settings),
	(id, channelID) => emit('update-channel', id, channelID),
);

const itemForSend = computed<PostQueueItem>(() => ({
	...props.item,
	sourceUrl:  localSourceUrl.value,
	authorName: localAuthorName.value || props.item.authorName,
	authorUrl:  localAuthorUrl.value  || props.item.authorUrl,
	settings: buildSettings(),
}));

function onDescriptionInput(value: string): void {
	localDescription.value = value;
	emitUpdate();
}

function setOverrideElRef(el: HTMLTextAreaElement | null): void {
	overrideEl.value = el;
}

watch(() => props.item.sourceUrl,  (v) => { localSourceUrl.value  = v ?? ''; });
watch(() => props.item.authorName, (v) => { localAuthorName.value = v ?? ''; });
watch(() => props.item.authorUrl,  (v) => { localAuthorUrl.value  = v ?? ''; });

function emitSourceUpdate(): void {
	emit('update-source', props.item.id, localSourceUrl.value.trim());
}

function emitMetaUpdate(): void {
	emit('update-meta', props.item.id, {
		authorName: localAuthorName.value.trim(),
		authorUrl:  localAuthorUrl.value.trim(),
	});
}
</script>

<style scoped lang="scss">
.card {
	&__preview {
		position: relative;
		width: $sp-thumb-size;
		height: $sp-thumb-size;
		border-radius: 6px;
		overflow: hidden;
		background: $sp-bg-placeholder;
	}

	&__img { width: 100%; height: 100%; object-fit: cover; }

	&__img-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		font-size: 0.643rem;
		color: $sp-text-light;
		text-align: center;
		padding: 2px;
		word-break: break-all;
		background: $sp-chip-accent-bg;
	}

	&__editor-label {
		font-size: 0.714rem;
		font-weight: 700;
		color: $sp-text-label;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		display: block;
	}

	&__editor-input {
		width: 100%;
		padding: 6px 8px;
		border: 1px solid $sp-border-input;
		border-radius: 6px;
		font-size: 0.857rem;
		background: $sp-bg-card;
		outline: none;
		font-family: inherit;
		color: $sp-text;
		box-sizing: border-box;
		&:focus { border-color: $sp-primary; }
	}

	&__action-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 10px;
		border-radius: 6px;
		border: none;
		font-size: 0.786rem;
		font-weight: 600;
		cursor: pointer;
		text-decoration: none;
		transition: opacity 0.15s;
		svg { width: 12px; height: 12px; }
		@media (hover: hover) { &:hover:not(:disabled) { opacity: 0.8; } }
		&:disabled { opacity: 0.55; cursor: not-allowed; }
		&--primary { background: $sp-primary; color: $sp-on-primary; }
		&--danger  { background: $sp-danger;  color: $sp-on-danger; }
		&--link    { background: $sp-bg-subtle; color: #444; }
	}

	&__action-spinner {
		width: 11px;
		height: 11px;
		border: 2px solid rgba(255,255,255,0.35);
		border-top-color: $sp-on-primary;
		border-radius: 50%;
		animation: card-action-spin 0.7s linear infinite;
		flex-shrink: 0;
	}
}

@keyframes card-action-spin { to { transform: rotate(360deg); } }
</style>
