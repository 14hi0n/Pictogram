<template>
	<div class="group-card" :class="{ 'group-card--disabled': !item.enabled, 'group-card--selected': selected }">
		<!-- Шапка -->
		<div class="group-card__header" @click="expanded = !expanded">
			<label class="group-card__select" @click.stop title="Выбрать для отправки группой">
				<input type="checkbox" :checked="selected" @change="$emit('select', item.id)" />
			</label>

			<div class="group-card__previews">
				<img
					v-for="m in previewMembers"
					:key="m.id"
					:src="getThumbSrc(m.id, m.mediaUrl)"
					class="group-card__thumb"
				/>
				<div v-if="item.members.length > 4" class="group-card__more">+{{ item.members.length - 4 }}</div>
			</div>

			<div class="group-card__meta">
				<div class="group-card__title">Альбом · {{ item.members.length }} медиа</div>
				<div class="group-card__date">{{ formattedDate }}</div>
				<div class="group-card__flags">
					<span v-if="allTags.length > 0 && hasAnyTagVar" class="group-card__flag group-card__flag--tags-on">Теги {{ enabledTags.length }}/{{ allTags.length }}</span>
					<span v-if="effectiveChannelName" class="group-card__flag group-card__flag--channel">{{ effectiveChannelName }}</span>
					<span v-if="isTemplateOverridden" class="group-card__flag group-card__flag--override">Свой шаблон</span>
				</div>
			</div>

			<div class="group-card__controls">
				<button
					class="group-card__control-btn"
					:class="item.enabled ? 'group-card__control-btn--active' : 'group-card__control-btn--muted'"
					:title="item.enabled ? 'Выключить' : 'Включить'"
					@click.stop="$emit('toggle', item.id)"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
						<polyline v-if="item.enabled" points="20 6 9 17 4 12" />
						<line v-else x1="5" y1="12" x2="19" y2="12" />
					</svg>
				</button>
				<button class="group-card__control-btn group-card__control-btn--muted">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline v-if="expanded" points="18 15 12 9 6 15" />
						<polyline v-else points="6 9 12 15 18 9" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Редактор -->
		<div v-if="expanded" class="group-card__editor">

			<!-- Порядок медиа -->
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

			<!-- Описание: только если {{desc}} в шаблоне -->
			<div v-if="templateVars.hasDesc" class="group-card__editor-field">
				<label class="group-card__editor-label">Описание</label>
				<textarea
					v-model="localDescription"
					class="group-card__editor-textarea"
					placeholder="Текст для {{desc}}"
					rows="2"
					@input="emitUpdate"
				></textarea>
			</div>

			<!-- Tags: interactive when template uses a tag variable -->
			<template v-if="allTags.length > 0">
				<div v-if="hasAnyTagVar" class="group-card__editor-field">
					<div class="group-card__tag-header">
						<label class="group-card__editor-label">Tags</label>
						<div class="group-card__tag-bulk">
							<button class="group-card__tag-bulk-btn" @click="enableAllTags">Включить все</button>
							<button class="group-card__tag-bulk-btn" @click="disableAllTags">Выключить все</button>
						</div>
					</div>
					<div class="group-card__tag-chips">
						<button
							v-for="tag in visibleTags"
							:key="tag"
							class="group-card__tag-chip"
							:class="{ 'group-card__tag-chip--off': localExcludedTags.includes(tag) }"
							@click="toggleTag(tag)"
						>{{ tag }}</button>
					</div>
					<button v-if="hiddenTagsCount > 0" class="group-card__tags-expand-btn" @click="tagsExpanded = true">
						Показать все ({{ allTags.length }})
					</button>
					<button v-else-if="tagsExpanded && allTags.length > TAGS_VISIBLE" class="group-card__tags-expand-btn" @click="tagsExpanded = false">
						Скрыть
					</button>
				</div>
				<p v-else-if="effectiveTemplate" class="group-card__editor-tags-hint">
					Теги найдены, но текущий шаблон их не использует.
				</p>
			</template>

			<!-- Нет интерактивных элементов: подсказка -->
			<div v-if="!hasAnyControls" class="group-card__editor-empty-hint">
				<template v-if="!effectiveTemplate">
					Шаблон не задан. Пост будет опубликован без подписи.
				</template>
				<template v-else>
					Шаблон не содержит переменных — подпись формируется из статического текста.
				</template>
			</div>

			<!-- Advanced / Override template -->
			<div class="group-card__editor-advanced">
				<button class="group-card__editor-advanced-toggle" @click="overrideExpanded = !overrideExpanded">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:10px;height:10px;flex-shrink:0">
						<polyline v-if="overrideExpanded" points="18 15 12 9 6 15" />
						<polyline v-else points="6 9 12 15 18 9" />
					</svg>
					Advanced
				</button>
				<div v-if="overrideExpanded" class="group-card__editor-field" style="margin-top:6px">
					<label class="group-card__editor-label">Override template</label>
					<textarea
						ref="overrideEl"
						v-model="localOverrideTemplate"
						class="group-card__editor-textarea"
						placeholder="Empty = use channel master template"
						rows="3"
						@input="onOverrideInput"
					></textarea>
					<div class="group-card__template-vars">
						<button v-for="v in TEMPLATE_VARS" :key="v" class="group-card__tvar-chip" @click="insertVar(v)">{{ v }}</button>
					</div>
				</div>
			</div>

			<!-- Канал -->
			<div class="group-card__editor-field">
				<label class="group-card__editor-label">Канал</label>
				<select class="group-card__editor-select" :value="localChannelID || activeChatID || ''" @change="onChannelChange">
					<option v-for="ch in channels" :key="ch.chatID" :value="ch.chatID">{{ ch.name }}</option>
				</select>
			</div>

			<!-- Действия -->
			<div class="group-card__editor-footer">
				<button class="group-card__action-btn group-card__action-btn--secondary" title="Разбить обратно на отдельные посты" @click="$emit('ungroup', item.id)">
					Разгруппировать
				</button>
				<button class="group-card__action-btn group-card__action-btn--danger" @click="$emit('remove', item.id)">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
					Удалить
				</button>
				<button class="group-card__action-btn group-card__action-btn--primary" :disabled="isSending" @click="$emit('send', { ...item, members: localMembers, settings: buildSettings() })">
					<svg v-if="!isSending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
					<span v-if="isSending" class="group-card__action-spinner"></span>
					{{ isSending ? 'Отправка...' : 'Отправить' }}
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
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

const formattedDate  = new Date(props.item.addedAt).toLocaleDateString('ru-RU', {
	day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});
const previewMembers = computed(() => props.item.members.slice(0, 4));

const thumbSrcs   = ref<Record<string, string>>(
	Object.fromEntries(props.item.members.map((m: GroupMember) => [m.id, m.thumbnailUrl ?? m.mediaUrl]))
);
function getThumbSrc(id: string, mediaUrl: string): string {
	return thumbSrcs.value[id] ?? mediaUrl;
}

const {
	TAGS_VISIBLE, TEMPLATE_VARS,
	expanded, overrideExpanded, tagsExpanded, overrideEl,
	localChannelID, localDescription, localExcludedTags, localOverrideTemplate,
	effectiveTemplate, isTemplateOverridden, templateVars,
	effectiveChannelName, hasAnyTagVar, hasAnyControls,
	allTags, enabledTags, visibleTags, hiddenTagsCount,
	buildSettings, emitUpdate, toggleTag, enableAllTags, disableAllTags,
	insertVar, onOverrideInput, onChannelChange,
} = useCardEditor(
	props,
	(id, settings) => emit('update-settings', id, settings),
	(id, channelID) => emit('update-channel', id, channelID),
);

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
	background: $sp-bg-card;
	border-radius: 10px;
	overflow: hidden;
	box-shadow: 0 1px 3px rgba(0,0,0,0.08);
	border: 2px solid $sp-border-accent;
	transition: opacity 0.2s, border-color 0.15s;

	&--disabled { opacity: 0.45; }
	&--selected { border-color: $sp-accent; box-shadow: 0 0 0 2px var(--sp-accent-a20); }

	&__header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px;
		cursor: pointer;
		user-select: none;
		@media (hover: hover) { &:hover { background: $sp-bg-editor; } }
	}

	&__select {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		cursor: pointer;
		padding: 2px;
		input[type="checkbox"] { width: 15px; height: 15px; cursor: pointer; accent-color: $sp-accent; appearance: auto; }
	}

	&__previews {
		display: flex;
		gap: 2px;
		flex-shrink: 0;
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
		font-size: 10px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	&__meta { flex: 1; min-width: 0; }

	&__title {
		font-size: 12px;
		font-weight: 700;
		color: $sp-accent;
	}

	&__date { font-size: 11px; color: $sp-text-light; }

	&__flags {
		display: flex;
		gap: 4px;
		margin-top: 3px;
		flex-wrap: wrap;
	}

	&__flag {
		font-size: 10px;
		padding: 1px 5px;
		border-radius: 3px;
		font-weight: 500;
		&--tags-on { background: $sp-bg-accent; color: $sp-accent-dark; }
		&--channel  { background: $sp-border-light; color: $sp-text-muted; }
		&--override { background: #fff3e0; color: $sp-notice-icon; }
	}

	&__controls {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex-shrink: 0;
	}

	&__control-btn {
		width: 28px;
		height: 28px;
		border: 1px solid $sp-border;
		border-radius: 6px;
		background: $sp-bg-editor;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.12s;
		svg { width: 13px; height: 13px; }
		@media (hover: hover) {
			&:hover { background: $sp-bg-hover; }
			&--muted:hover { color: $sp-text-muted; }
		}
		&--active { background: $sp-accent; border-color: $sp-accent; color: $sp-on-accent; }
		&--muted  { color: $sp-text-faint; }
	}

	&__editor {
		padding: 10px 12px 12px;
		border-top: 1px solid $sp-bg-accent;
		background: $sp-bg-accent-soft;
		display: flex;
		flex-direction: column;
		gap: 10px;

		&-section { display: flex; flex-direction: column; gap: 6px; }

		&-label {
			font-size: 10px;
			font-weight: 700;
			color: $sp-text-label;
			text-transform: uppercase;
			letter-spacing: 0.4px;
		}

		&-field { display: flex; flex-direction: column; gap: 6px; }

		&-select,
		&-textarea {
			width: 100%;
			padding: 6px 8px;
			border: 1px solid $sp-border-input;
			border-radius: 6px;
			font-size: 12px;
			background: $sp-bg-card;
			outline: none;
			font-family: inherit;
			resize: vertical;
			color: $sp-text;
			box-sizing: border-box;
			&:focus { border-color: $sp-accent; }
		}

		&-tags-hint {
			font-size: 11px;
			color: $sp-text-label;
			margin: 0;
			padding: 4px 0;
		}

		&-empty-hint {
			font-size: 11px;
			color: $sp-text-label;
			padding: 6px 8px;
			background: $sp-bg-editor;
			border: 1px dashed $sp-border;
			border-radius: 6px;
		}

		&-advanced {
			display: flex;
			flex-direction: column;

			&-toggle {
				display: inline-flex;
				align-items: center;
				gap: 4px;
				background: none;
				border: none;
				padding: 2px 0;
				font-size: 11px;
				font-weight: 600;
				color: $sp-text-label;
				cursor: pointer;
				text-transform: uppercase;
				letter-spacing: 0.4px;
				width: fit-content;
				@media (hover: hover) { &:hover { color: $sp-text-hint; } }
			}
		}

		&-footer { display: flex; gap: 5px; justify-content: flex-end; }
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
			font-size: 10px;
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
		font-size: 11px;
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
		font-size: 11px;
		background: $sp-bg-accent-soft;
		outline: none;
		color: $sp-text-secondary;
		font-family: inherit;
		&:focus { border-color: $sp-accent; background: $sp-bg-card; }
	}

	&__tag {
		&-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}

		&-bulk {
			display: flex;
			gap: 4px;

			&-btn {
				background: none;
				border: 1px solid $sp-border-input;
				border-radius: 4px;
				padding: 1px 6px;
				font-size: 10px;
				color: $sp-text-hint;
				cursor: pointer;
				@media (hover: hover) { &:hover { border-color: $sp-accent; color: $sp-accent; } }
			}
		}

		&-chips { display: flex; flex-wrap: wrap; gap: 4px; }

		&-chip {
			font-size: 11px;
			line-height: 1.4;
			padding: 2px 8px;
			border-radius: 10px;
			border: 1px solid $sp-chip-accent-border;
			background: $sp-chip-accent-bg;
			color: $sp-chip-accent-text;
			cursor: pointer;
			transition: all 0.12s;
			user-select: none;
			@media (hover: hover) {
				&:hover { background: $sp-chip-accent-hover; }
				&--off:hover { background: $sp-bg-placeholder; color: $sp-text-hint; }
			}
			&--off {
				background: $sp-bg-disabled;
				border-color: $sp-border;
				color: $sp-text-light;
				text-decoration: line-through;
			}
		}
	}

	&__tags-expand-btn {
		background: none;
		border: none;
		padding: 0;
		font-size: 10px;
		color: $sp-accent;
		cursor: pointer;
		align-self: flex-start;
		@media (hover: hover) { &:hover { text-decoration: underline; } }
	}

	&__template-vars { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }

	&__tvar-chip {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 4px;
		border: 1px solid $sp-chip-accent-border;
		background: $sp-chip-accent-bg;
		color: $sp-chip-accent-text;
		cursor: pointer;
		font-family: monospace;
		transition: background 0.1s;
		@media (hover: hover) { &:hover { background: $sp-chip-accent-hover; } }
	}

	&__action-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 10px;
		border-radius: 6px;
		border: none;
		font-size: 11px;
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
