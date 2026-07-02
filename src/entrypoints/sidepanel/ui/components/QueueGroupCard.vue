<template>
	<BaseQueueCard
		variant="group"
		:id="item.id"
		:enabled="item.enabled"
		:selected="selected"
		:is-sending="isSending"
		:added-at="item.addedAt"
		:title="`Альбом · ${item.members.length} медиа`"
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
			<div class="group-card__previews">
				<img
					v-for="m in previewMembers"
					:key="m.id"
					:src="getThumbSrc(m.id, m.mediaUrl)"
					class="group-card__thumb"
				/>
				<div v-if="item.members.length > 4" class="group-card__more">+{{ item.members.length - 4 }}</div>
			</div>
		</template>

		<template #editor-top>
			<div class="group-card__editor-section">
				<div class="group-card__editor-label">Порядок медиа</div>
				<div class="group-card__media-list">
					<div v-for="(member, idx) in localMembers" :key="member.id" class="group-card__media-row">
						<span class="group-card__media-num">{{ idx + 1 }}</span>
						<img :src="getThumbSrc(member.id, member.mediaUrl)" class="group-card__media-thumb" />
						<div class="group-card__media-reorder">
							<button class="group-card__reorder-btn" :disabled="idx === 0" @click="moveUp(idx)" title="Переместить вверх">↑</button>
							<button class="group-card__reorder-btn" :disabled="idx === localMembers.length - 1" @click="moveDown(idx)" title="Переместить вниз">↓</button>
						</div>
						<input
							:value="member.sourceUrl"
							type="url"
							class="group-card__member-source-input"
							placeholder="Source URL"
							@blur="onMemberSourceBlur(idx, ($event.target as HTMLInputElement).value)"
						/>
						<a :href="member.pageUrl" target="_blank" class="group-card__media-link" title="Открыть пост">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
						</a>
					</div>
				</div>
			</div>
		</template>

		<template #footer-actions="{ isSending: sending }: { isSending: boolean }">
			<button class="group-card__action-btn group-card__action-btn--secondary" title="Разбить обратно на отдельные посты" @click="$emit('ungroup', item.id)">
				Разгруппировать
			</button>
			<button class="group-card__action-btn group-card__action-btn--danger" @click="$emit('remove', item.id)">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
				Удалить
			</button>
			<button class="group-card__action-btn group-card__action-btn--primary" :disabled="sending" @click="$emit('send', itemForSend)">
				<svg v-if="!sending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
				<span v-if="sending" class="group-card__action-spinner"></span>
				{{ sending ? 'Отправка...' : 'Отправить' }}
			</button>
		</template>
	</BaseQueueCard>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import BaseQueueCard from '@/entrypoints/shared/components/BaseQueueCard.vue';
import { PostQueueGroupItem, GroupMember } from '@/models/PostQueueGroupItem';
import { PostSettings } from '@/models/PostSettings';
import { Channel } from '@/models/Channel';
import { useCardEditor } from '../composables/useCardEditor';

const props = defineProps<{
	item: PostQueueGroupItem;
	channels: Channel[];
	activeChatID: string | null;
	selected?: boolean;
	isSending?: boolean;
}>();

const emit = defineEmits<{
	(e: 'toggle', id: string): void;
	(e: 'remove', id: string): void;
	(e: 'ungroup', id: string): void;
	(e: 'send', item: PostQueueGroupItem): void;
	(e: 'update-settings', id: string, settings: PostSettings): void;
	(e: 'update-channel', id: string, channelID: string | null): void;
	(e: 'update-members', id: string, members: GroupMember[]): void;
	(e: 'select', id: string): void;
}>();

const localMembers = ref<GroupMember[]>([...props.item.members]);

const previewMembers = computed(() => props.item.members.slice(0, 4));

const thumbSrcs   = ref<Record<string, string>>(
	Object.fromEntries(props.item.members.map((m: GroupMember) => [m.id, m.thumbnailUrl ?? m.mediaUrl]))
);
function getThumbSrc(id: string, mediaUrl: string): string {
	return thumbSrcs.value[id] ?? mediaUrl;
}

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

const itemForSend = computed<PostQueueGroupItem>(() => ({
	...props.item,
	members: localMembers.value,
	settings: buildSettings(),
}));

function onDescriptionInput(value: string): void {
	localDescription.value = value;
	emitUpdate();
}

function setOverrideElRef(el: HTMLTextAreaElement | null): void {
	overrideEl.value = el;
}

watch(() => props.item.members, (m) => { localMembers.value = [...m]; }, { deep: true });

function moveUp(idx: number): void {
	if (idx === 0) return;
	const arr = [...localMembers.value];
	[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
	localMembers.value = arr;
	emit('update-members', props.item.id, arr);
}

function moveDown(idx: number): void {
	if (idx === localMembers.value.length - 1) return;
	const arr = [...localMembers.value];
	[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
	localMembers.value = arr;
	emit('update-members', props.item.id, arr);
}

function onMemberSourceBlur(idx: number, url: string): void {
	const trimmed = url.trim();
	if (trimmed === localMembers.value[idx]?.sourceUrl) return;
	const arr = localMembers.value.map((m, i) =>
		i === idx ? { ...m, sourceUrl: trimmed } : m
	);
	localMembers.value = arr;
	emit('update-members', props.item.id, arr);
}
</script>

<style scoped lang="scss">
.group-card {
	&__previews {
		display: flex;
		gap: 2px;
	}

	&__thumb {
		width: 28px;
		height: 38px;
		object-fit: cover;
		border-radius: 3px;
		background: $sp-bg-placeholder;
	}

	&__more {
		width: 28px;
		height: 38px;
		border-radius: 3px;
		background: $sp-bg-accent;
		color: $sp-accent;
		font-size: 0.714rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	&__editor-section { display: flex; flex-direction: column; gap: 6px; }

	&__editor-label {
		font-size: 0.714rem;
		font-weight: 700;
		color: $sp-text-label;
		text-transform: uppercase;
		letter-spacing: 0.4px;
	}

	&__media {
		&-list { display: flex; flex-direction: column; gap: 4px; }

		&-row {
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 3px;
			border-radius: 5px;
			@media (hover: hover) { &:hover { background: $sp-chip-accent-bg; } }
		}

		&-num {
			width: 16px;
			text-align: center;
			font-size: 0.714rem;
			color: $sp-text-label;
			font-weight: 700;
			flex-shrink: 0;
		}

		&-thumb {
			width: 36px;
			height: 48px;
			object-fit: cover;
			border-radius: 4px;
			background: $sp-bg-placeholder;
			flex-shrink: 0;
		}

		&-reorder {
			display: flex;
			flex-direction: column;
			gap: 2px;
		}

		&-link {
			color: $sp-text-label;
			display: flex;
			align-items: center;
			flex-shrink: 0;
			@media (hover: hover) { &:hover { color: $sp-accent; } }
		}
	}

	&__reorder-btn {
		width: 22px;
		height: 18px;
		border: 1px solid $sp-border-input;
		border-radius: 4px;
		background: $sp-bg-card;
		cursor: pointer;
		font-size: 0.786rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: $sp-text-muted;
		line-height: 1;
		padding: 0;
		@media (hover: hover) { &:hover:not(:disabled) { background: $sp-accent; color: $sp-on-accent; border-color: $sp-accent; } }
		&:disabled { opacity: 0.3; cursor: not-allowed; }
	}

	&__member-source-input {
		flex: 1;
		min-width: 0;
		padding: 3px 6px;
		border: 1px solid $sp-chip-accent-border;
		border-radius: 5px;
		font-size: 0.786rem;
		background: $sp-bg-accent-soft;
		outline: none;
		color: $sp-text-secondary;
		font-family: inherit;
		&:focus { border-color: $sp-accent; background: $sp-bg-card; }
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
		@media (hover: hover) { &:hover:not(:disabled) { opacity: 0.8; } }
		&:disabled { opacity: 0.55; cursor: not-allowed; }
		&--primary   { background: $sp-accent;    color: $sp-on-accent; }
		&--danger    { background: $sp-danger;     color: $sp-on-danger; }
		&--secondary { background: $sp-bg-accent;  color: $sp-accent-dark; }
	}

	&__action-spinner {
		width: 11px;
		height: 11px;
		border: 2px solid rgba(255,255,255,0.35);
		border-top-color: $sp-on-accent;
		border-radius: 50%;
		animation: group-card-action-spin 0.7s linear infinite;
		flex-shrink: 0;
	}
}

@keyframes group-card-action-spin { to { transform: rotate(360deg); } }
</style>
