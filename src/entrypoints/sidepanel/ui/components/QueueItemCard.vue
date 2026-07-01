<template>
	<div class="card" :class="{ 'card--disabled': !item.enabled, 'card--selected': selected }">
		<!-- Шапка -->
		<div class="card__header" @click="expanded = !expanded">
			<AppCheckbox
				class="card__select"
				:model-value="selected ?? false"
				variant="primary"
				title="Выбрать для отправки группой"
				@update:model-value="$emit('select', item.id)"
				@click.stop
			/>

			<div class="card__preview">
				<img v-if="!imgFailed" :src="imgSrc" class="card__img" :alt="siteDomain" @error="onImgError" />
				<div v-else class="card__img-placeholder">{{ siteDomain }}</div>
			</div>

			<div class="card__meta">
				<div class="card__site">{{ siteDomain }}</div>
				<div class="card__date">{{ formattedDate }}</div>
				<div class="card__flags">
					<span v-if="allTags.length > 0 && hasAnyTagVar" class="card__flag card__flag--tags-on">Теги {{ enabledTags.length }}/{{ allTags.length }}</span>
					<span v-if="effectiveChannelName" class="card__flag card__flag--channel">{{ effectiveChannelName }}</span>
					<span v-if="isTemplateOverridden" class="card__flag card__flag--override">Свой шаблон</span>
				</div>
			</div>

			<div class="card__controls">
				<button class="card__control-btn" :class="item.enabled ? 'card__control-btn--active' : 'card__control-btn--muted'" :title="item.enabled ? 'Выключить' : 'Включить'" @click.stop="$emit('toggle', item.id)">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
						<polyline v-if="item.enabled" points="20 6 9 17 4 12" />
						<line v-else x1="5" y1="12" x2="19" y2="12" />
					</svg>
				</button>
				<button class="card__control-btn card__control-btn--muted">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline v-if="expanded" points="18 15 12 9 6 15" />
						<polyline v-else points="6 9 12 15 18 9" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Редактор -->
		<div v-if="expanded" class="card__editor">

			<!-- Описание: только если {{desc}} в шаблоне -->
			<div v-if="templateVars.hasDesc" class="card__editor-field">
				<label class="card__editor-label">Описание</label>
				<textarea
					v-model="localDescription"
					class="card__editor-textarea"
					placeholder="Текст для {{desc}}"
					rows="4"
					@input="emitUpdate"
				></textarea>
			</div>

			<!-- Tags: interactive when template uses a tag variable -->
			<template v-if="allTags.length > 0">
				<div v-if="hasAnyTagVar" class="card__editor-field">
					<div class="card__tag-header">
						<label class="card__editor-label">Tags</label>
						<div class="card__tag-bulk">
							<button class="card__tag-bulk-btn" @click="enableAllTags">Включить все</button>
							<button class="card__tag-bulk-btn" @click="disableAllTags">Выключить все</button>
						</div>
					</div>
					<div class="card__tag-chips">
						<button
							v-for="tag in visibleTags"
							:key="tag"
							class="card__tag-chip"
							:class="{ 'card__tag-chip--off': uiExcludedTags.includes(tag) }"
							@click="toggleTag(tag)"
						>{{ tag }}</button>
					</div>
					<button v-if="hiddenTagsCount > 0" class="card__tags-expand-btn" @click="tagsExpanded = true">
						Показать все ({{ allTags.length }})
					</button>
					<button v-else-if="tagsExpanded && allTags.length > TAGS_VISIBLE" class="card__tags-expand-btn" @click="tagsExpanded = false">
						Скрыть
					</button>
				</div>
				<p v-else-if="effectiveTemplate" class="card__editor-tags-hint">
					Теги найдены, но текущий шаблон их не использует.
				</p>
			</template>

			<!-- Нет интерактивных элементов: подсказка -->
			<div v-if="!hasAnyControls" class="card__editor-empty-hint">
				<template v-if="!effectiveTemplate">
					Шаблон не задан. Пост будет опубликован без подписи.
				</template>
				<template v-else>
					Шаблон не содержит переменных - подпись формируется из статического текста.
				</template>
			</div>

			<!-- Advanced / Override template -->
			<div class="card__editor-advanced">
				<button class="card__editor-advanced-toggle" @click="overrideExpanded = !overrideExpanded">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:10px;height:10px;flex-shrink:0">
						<polyline v-if="overrideExpanded" points="18 15 12 9 6 15" />
						<polyline v-else points="6 9 12 15 18 9" />
					</svg>
					Advanced
				</button>
				<div v-if="overrideExpanded" class="card__editor-field" style="margin-top:6px">
					<div class="card__editor-label-row">
						<label class="card__editor-label">Override template</label>
						<button v-if="isSyncNeeded" class="card__editor-sync-btn" @click="syncToGlobal">↺ Синхронизировать</button>
					</div>
					<textarea
						ref="overrideEl"
						v-model="overrideTemplateDraft"
						class="card__editor-textarea"
						placeholder="Шаблон канала не задан"
						rows="8"
					></textarea>
					<div class="card__template-vars">
						<button v-for="v in TEMPLATE_VARS" :key="v" class="card__tvar-chip" @click="insertVar(v)">{{ v }}</button>
					</div>
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
				</div>
			</div>

			<!-- Канал -->
			<div class="card__editor-field">
				<label class="card__editor-label">Канал</label>
				<select class="card__editor-select" :value="localChannelID || activeChatID || ''" @change="onChannelChange">
					<option v-for="ch in channels" :key="ch.chatID" :value="ch.chatID">{{ ch.name }}</option>
				</select>
			</div>

			<!-- Действия -->
			<div class="card__editor-footer">
				<button class="card__action-btn card__action-btn--danger" @click="$emit('remove', item.id)">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
					Удалить
				</button>
				<a :href="item.pageUrl" target="_blank" class="card__action-btn card__action-btn--link">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
					Открыть
				</a>
				<button class="card__action-btn card__action-btn--primary" :disabled="isSending" @click="$emit('send', localItemForSend)">
					<svg v-if="!isSending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
					<span v-if="isSending" class="card__action-spinner"></span>
					{{ isSending ? 'Отправка...' : 'Отправить' }}
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AppCheckbox from '@/entrypoints/shared/components/AppCheckbox.vue';
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

const formattedDate = new Date(props.item.addedAt).toLocaleDateString('ru-RU', {
	day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

const {
	TAGS_VISIBLE, TEMPLATE_VARS,
	expanded, overrideExpanded, tagsExpanded, overrideEl,
	localChannelID, localDescription, localExcludedTags, localOverrideTemplate,
	effectiveTemplate, isTemplateOverridden, templateVars,
	effectiveChannelName, hasAnyTagVar, hasAnyControls,
	allTags, uiExcludedTags, enabledTags, visibleTags, hiddenTagsCount,
	emitUpdate, toggleTag, enableAllTags, disableAllTags,
	insertVar, overrideTemplateDraft, isSyncNeeded, syncToGlobal, onChannelChange,
} = useCardEditor(
	props,
	(id, settings) => emit('update-settings', id, settings),
	(id, channelID) => emit('update-channel', id, channelID),
);

const localItemForSend = computed<PostQueueItem>(() => ({
	...props.item,
	sourceUrl:  localSourceUrl.value,
	authorName: localAuthorName.value || props.item.authorName,
	authorUrl:  localAuthorUrl.value  || props.item.authorUrl,
	settings: {
		customDescription:   localDescription.value,
		captionTemplate:     localOverrideTemplate.value,
		captionTemplateMode: localOverrideTemplate.value.trim() ? 'custom' : 'channel_default',
		includeCharacterTags: true,
		includeCopyrightTags: true,
		disableLinks: false,
		excludedTags:        [...localExcludedTags.value],
		tagSelectionMode:    'manual',
	},
}));

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
	background: $sp-bg-card;
	border-radius: 10px;
	overflow: hidden;
	box-shadow: 0 1px 3px rgba(0,0,0,0.08);
	border: 1px solid $sp-border-card;
	transition: opacity 0.2s, border-color 0.15s;

	&--disabled { opacity: 0.45; }
	&--selected { border-color: $sp-primary; box-shadow: 0 0 0 2px $sp-primary-a15; }

	&__header {
		display: flex;
		align-items: center;
		gap: 10px;
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
	}

	&__preview {
		position: relative;
		width: 54px;
		height: 54px;
		border-radius: 6px;
		overflow: hidden;
		flex-shrink: 0;
		background: $sp-bg-placeholder;
	}

	&__img { width: 100%; height: 100%; object-fit: cover; }

	&__img-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		font-size: 9px;
		color: $sp-text-light;
		text-align: center;
		padding: 2px;
		word-break: break-all;
		background: $sp-chip-accent-bg;
	}

	&__meta { flex: 1; min-width: 0; }

	&__site {
		font-size: 12px;
		font-weight: 600;
		color: $sp-primary;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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
		&--override { background: $sp-chip-bg; color: $sp-notice-icon; }
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
		&--active { background: $sp-primary; border-color: $sp-primary; color: $sp-on-primary; }
		&--muted  { color: $sp-text-faint; }
	}

	&__editor {
		padding: 10px 12px 12px;
		border-top: 1px solid $sp-border-light;
		background: $sp-bg-editor;
		display: flex;
		flex-direction: column;
		gap: 10px;

		&-field { display: flex; flex-direction: column; gap: 6px; }

		&-label {
			font-size: 10px;
			font-weight: 700;
			color: $sp-text-label;
			text-transform: uppercase;
			letter-spacing: 0.4px;
		}

		&-label-row {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}

		&-sync-btn {
			background: none;
			border: none;
			padding: 0;
			font-size: 10px;
			color: $sp-primary;
			cursor: pointer;
			font-weight: 600;
			@media (hover: hover) { &:hover { text-decoration: underline; } }
		}

		&-select,
		&-textarea,
		&-input {
			width: 100%;
			padding: 6px 8px;
			border: 1px solid $sp-border-input;
			border-radius: 6px;
			font-size: 12px;
			background: $sp-bg-card;
			outline: none;
			font-family: inherit;
			color: $sp-text;
			box-sizing: border-box;
			&:focus { border-color: $sp-primary; }
		}
		&-textarea { resize: vertical; }

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
				@media (hover: hover) { &:hover { border-color: $sp-primary; color: $sp-primary; } }
			}
		}

		&-chips { display: flex; flex-wrap: wrap; gap: 4px; }

		&-chip {
			font-size: 11px;
			line-height: 1.4;
			padding: 2px 8px;
			border-radius: 10px;
			border: 1px solid $sp-chip-border;
			background: $sp-chip-bg;
			color: $sp-chip-text;
			cursor: pointer;
			transition: all 0.12s;
			user-select: none;
			@media (hover: hover) {
				&:hover { background: $sp-chip-hover; }
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
		color: $sp-primary;
		cursor: pointer;
		align-self: flex-start;
		@media (hover: hover) { &:hover { text-decoration: underline; } }
	}

	&__template-vars { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }

	&__tvar-chip {
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
