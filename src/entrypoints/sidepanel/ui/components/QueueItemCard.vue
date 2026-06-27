<template>
	<div class="card" :class="{ 'card--disabled': !item.enabled, 'card--selected': selected }">
		<!-- Шапка -->
		<div class="card__header" @click="expanded = !expanded">
			<label class="card__select" @click.stop title="Выбрать для отправки группой">
				<input type="checkbox" :checked="selected" @change="$emit('select', item.id)" />
			</label>

			<div class="card__preview">
				<img v-if="!imgFailed" :src="item.mediaUrl" class="card__img" :alt="siteDomain" @error="imgFailed = true" />
				<div v-else class="card__img-placeholder">{{ siteDomain }}</div>
			</div>

			<div class="card__meta">
				<div class="card__site">{{ siteDomain }}</div>
				<div class="card__date">{{ formattedDate }}</div>
				<div class="card__flags">
					<span v-if="allTags.length > 0 && hasAnyTagVar" class="flag flag--tags-on">Теги {{ enabledTags.length }}/{{ allTags.length }}</span>
					<span v-if="effectiveChannelName" class="flag flag--channel">{{ effectiveChannelName }}</span>
					<span v-if="isTemplateOverridden" class="flag flag--override">Свой шаблон</span>
				</div>
			</div>

			<div class="card__controls">
				<button class="icon-btn" :class="item.enabled ? 'icon-btn--active' : 'icon-btn--muted'" :title="item.enabled ? 'Выключить' : 'Включить'" @click.stop="$emit('toggle', item.id)">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
						<polyline v-if="item.enabled" points="20 6 9 17 4 12" />
						<line v-else x1="5" y1="12" x2="19" y2="12" />
					</svg>
				</button>
				<button class="icon-btn icon-btn--muted">
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
			<div v-if="templateVars.hasDesc" class="editor-field">
				<label class="editor-label">Описание</label>
				<textarea
					v-model="localDescription"
					class="editor-textarea"
					placeholder="Текст для {{desc}}"
					rows="2"
					@input="emitUpdate"
				></textarea>
			</div>

			<!-- Tags: interactive when template uses a tag variable -->
			<template v-if="allTags.length > 0">
				<div v-if="hasAnyTagVar" class="editor-field">
					<div class="tag-header">
						<label class="editor-label">Tags</label>
						<div class="tag-bulk">
							<button class="bulk-btn" @click="enableAllTags">Включить все</button>
							<button class="bulk-btn" @click="disableAllTags">Выключить все</button>
						</div>
					</div>
					<div class="tag-chips">
						<button
							v-for="tag in visibleTags"
							:key="tag"
							class="tag-chip"
							:class="{ 'tag-chip--off': localExcludedTags.includes(tag) }"
							@click="toggleTag(tag)"
						>{{ tag }}</button>
					</div>
					<button v-if="hiddenTagsCount > 0" class="tags-expand-btn" @click="tagsExpanded = true">
						Показать все ({{ allTags.length }})
					</button>
					<button v-else-if="tagsExpanded && allTags.length > TAGS_VISIBLE" class="tags-expand-btn" @click="tagsExpanded = false">
						Скрыть
					</button>
				</div>
				<p v-else-if="effectiveTemplate" class="editor-tags-hint">
					Теги найдены, но текущий шаблон их не использует.
				</p>
			</template>

			<!-- Нет интерактивных элементов: подсказка -->
			<div v-if="!hasAnyControls" class="editor-empty-hint">
				<template v-if="!effectiveTemplate">
					Шаблон не задан. Пост будет опубликован без подписи.
				</template>
				<template v-else>
					Шаблон не содержит переменных — подпись формируется из статического текста.
				</template>
			</div>

			<!-- Advanced / Override template -->
			<div class="editor-advanced">
				<button class="advanced-toggle" @click="overrideExpanded = !overrideExpanded">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:10px;height:10px;flex-shrink:0">
						<polyline v-if="overrideExpanded" points="18 15 12 9 6 15" />
						<polyline v-else points="6 9 12 15 18 9" />
					</svg>
					Advanced
				</button>
				<div v-if="overrideExpanded" class="editor-field" style="margin-top:6px">
					<label class="editor-label">Override template</label>
					<textarea
						ref="overrideEl"
						v-model="localOverrideTemplate"
						class="editor-textarea"
						placeholder="Empty = use channel master template"
						rows="3"
						@input="onOverrideInput"
					></textarea>
					<div class="template-vars">
						<button v-for="v in TEMPLATE_VARS" :key="v" class="tvar-chip" @click="insertVar(v)">{{ v }}</button>
					</div>
					<label class="editor-label" style="margin-top:8px">Source URL</label>
					<input
						v-model="localSourceUrl"
						type="url"
						class="editor-input"
						placeholder="https://..."
						@blur="emitSourceUpdate"
					/>
				</div>
			</div>

			<!-- Канал -->
			<div class="editor-field">
				<label class="editor-label">Канал</label>
				<select class="editor-select" :value="localChannelID || activeChatID || ''" @change="onChannelChange">
					<option v-for="ch in channels" :key="ch.chatID" :value="ch.chatID">{{ ch.name }}</option>
				</select>
			</div>

			<!-- Действия -->
			<div class="editor-footer">
				<button class="action-btn action-btn--danger" @click="$emit('remove', item.id)">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
					Удалить
				</button>
				<a :href="item.pageUrl" target="_blank" class="action-btn action-btn--link">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
					Открыть
				</a>
				<button class="action-btn action-btn--primary" :disabled="isSending" @click="$emit('send', localItemForSend)">
					<svg v-if="!isSending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
					<span v-if="isSending" class="action-spinner"></span>
					{{ isSending ? 'Отправка...' : 'Отправить' }}
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
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
	(e: 'select', id: string): void;
}>();

const imgFailed     = ref(false);
const localSourceUrl = ref(props.item.sourceUrl ?? '');

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
	allTags, enabledTags, visibleTags, hiddenTagsCount,
	emitUpdate, toggleTag, enableAllTags, disableAllTags,
	insertVar, onOverrideInput, onChannelChange,
} = useCardEditor(
	props,
	(id, settings) => emit('update-settings', id, settings),
	(id, channelID) => emit('update-channel', id, channelID),
);

const localItemForSend = computed<PostQueueItem>(() => ({
	...props.item,
	sourceUrl: localSourceUrl.value,
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

watch(() => props.item.sourceUrl, (s) => { localSourceUrl.value = s ?? ''; });

function emitSourceUpdate(): void {
	emit('update-source', props.item.id, localSourceUrl.value.trim());
}
</script>

<style scoped>
.card {
	background: #fff;
	border-radius: 10px;
	overflow: hidden;
	box-shadow: 0 1px 3px rgba(0,0,0,0.08);
	border: 1px solid #ebebeb;
	transition: opacity 0.2s, border-color 0.15s;

	&--disabled { opacity: 0.45; }
	&--selected { border-color: #0088cc; box-shadow: 0 0 0 2px rgba(0,136,204,0.15); }
}

.card__header {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px;
	cursor: pointer;
	user-select: none;
	&:hover { background: #fafafa; }
}

.card__select {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	cursor: pointer;
	padding: 2px;
	input[type="checkbox"] { width: 15px; height: 15px; cursor: pointer; accent-color: #0088cc; appearance: auto; }
}

.card__preview {
	position: relative;
	width: 54px;
	height: 54px;
	border-radius: 6px;
	overflow: hidden;
	flex-shrink: 0;
	background: #eee;
}

.card__img { width: 100%; height: 100%; object-fit: cover; }

.card__img-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	font-size: 9px;
	color: #bbb;
	text-align: center;
	padding: 2px;
	word-break: break-all;
	background: #f5f0ff;
}

.card__meta { flex: 1; min-width: 0; }

.card__site {
	font-size: 12px;
	font-weight: 600;
	color: #0088cc;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card__date { font-size: 11px; color: #bbb; }

.card__flags {
	display: flex;
	gap: 4px;
	margin-top: 3px;
	flex-wrap: wrap;
}

.flag {
	font-size: 10px;
	padding: 1px 5px;
	border-radius: 3px;
	font-weight: 500;
	&--tags-on { background: #e0f2fe; color: #0077b6; }
	&--channel  { background: #f0f0f0; color: #666; }
	&--override { background: #fff3e0; color: #e65100; }
}

.card__controls {
	display: flex;
	flex-direction: column;
	gap: 4px;
	flex-shrink: 0;
}

.icon-btn {
	width: 28px;
	height: 28px;
	border: 1px solid #e0e0e0;
	border-radius: 6px;
	background: #f9f9f9;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.12s;
	svg { width: 13px; height: 13px; }
	&:hover { background: #efefef; }
	&--active { background: #0088cc; border-color: #0088cc; color: #fff; }
	&--muted  { color: #ccc; &:hover { color: #666; } }
}

/* ── Редактор ── */
.card__editor {
	padding: 10px 12px 12px;
	border-top: 1px solid #f0f0f0;
	background: #fafafa;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.editor-field { display: flex; flex-direction: column; gap: 6px; }

.editor-label {
	font-size: 10px;
	font-weight: 700;
	color: #aaa;
	text-transform: uppercase;
	letter-spacing: 0.4px;
}

.editor-select,
.editor-textarea,
.editor-input {
	width: 100%;
	padding: 6px 8px;
	border: 1px solid #ddd;
	border-radius: 6px;
	font-size: 12px;
	background: #fff;
	outline: none;
	font-family: inherit;
	color: #333;
	box-sizing: border-box;
	&:focus { border-color: #0088cc; }
}
.editor-textarea { resize: vertical; }

/* ── Тег-чипы ── */
.tag-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.tag-bulk { display: flex; gap: 4px; }

.bulk-btn {
	background: none;
	border: 1px solid #ddd;
	border-radius: 4px;
	padding: 1px 6px;
	font-size: 10px;
	color: #888;
	cursor: pointer;
	&:hover { border-color: #0088cc; color: #0088cc; }
}

.tags-expand-btn {
	background: none;
	border: none;
	padding: 0;
	font-size: 10px;
	color: #0088cc;
	cursor: pointer;
	align-self: flex-start;
	&:hover { text-decoration: underline; }
}

.tag-chips { display: flex; flex-wrap: wrap; gap: 4px; }

.tag-chip {
	font-size: 11px;
	line-height: 1.4;
	padding: 2px 8px;
	border-radius: 10px;
	border: 1px solid #c8e6fa;
	background: #e8f4fd;
	color: #0077b6;
	cursor: pointer;
	transition: all 0.12s;
	user-select: none;
	&:hover { background: #d0eaf8; }
	&--off {
		background: #f5f5f5;
		border-color: #e0e0e0;
		color: #bbb;
		text-decoration: line-through;
		&:hover { background: #eeeeee; color: #999; }
	}
}

/* ── Подсказка при пустом шаблоне ── */
.editor-empty-hint {
	font-size: 11px;
	color: #aaa;
	padding: 6px 8px;
	background: #f9f9f9;
	border: 1px dashed #e0e0e0;
	border-radius: 6px;
}

.editor-tags-hint {
	font-size: 11px;
	color: #aaa;
	margin: 0;
	padding: 4px 0;
}

/* ── Advanced ── */
.editor-advanced { display: flex; flex-direction: column; }

.advanced-toggle {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	background: none;
	border: none;
	padding: 2px 0;
	font-size: 11px;
	font-weight: 600;
	color: #aaa;
	cursor: pointer;
	text-transform: uppercase;
	letter-spacing: 0.4px;
	width: fit-content;
	&:hover { color: #888; }
}

.template-vars { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }

.tvar-chip {
	font-size: 10px;
	padding: 1px 6px;
	border-radius: 4px;
	border: 1px solid #c8e6fa;
	background: #e8f4fd;
	color: #0077b6;
	cursor: pointer;
	font-family: monospace;
	transition: background 0.1s;
	&:hover { background: #d0eaf8; }
}

/* ── Кнопки действий ── */
.editor-footer { display: flex; gap: 5px; justify-content: flex-end; }

.action-btn {
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
	&:hover:not(:disabled) { opacity: 0.8; }
	&:disabled { opacity: 0.55; cursor: not-allowed; }
	&--primary { background: #0088cc; color: #fff; }
	&--danger  { background: #e74c3c; color: #fff; }
	&--link    { background: #ecf0f1; color: #444; }
}

.action-spinner {
	width: 11px; height: 11px;
	border: 2px solid rgba(255,255,255,0.35);
	border-top-color: #fff;
	border-radius: 50%;
	animation: action-spin 0.7s linear infinite;
	flex-shrink: 0;
}
@keyframes action-spin { to { transform: rotate(360deg); } }
</style>
