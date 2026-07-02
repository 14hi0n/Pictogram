<template>
	<div
		class="base-queue-card"
		:class="[
			`base-queue-card--${variant}`,
			{ 'base-queue-card--disabled': !enabled, 'base-queue-card--selected': selected },
		]"
	>
		<!-- Шапка -->
		<div class="base-queue-card__header" @click="$emit('update:expanded', !expanded)">
			<AppCheckbox
				class="base-queue-card__select"
				:model-value="selected ?? false"
				:variant="checkboxVariant"
				title="Выбрать для отправки группой"
				@update:model-value="$emit('select', id)"
				@click.stop
			/>

			<div class="base-queue-card__preview">
				<slot name="preview" />
			</div>

			<div class="base-queue-card__meta">
				<div class="base-queue-card__title">{{ title }}</div>
				<div class="base-queue-card__date">{{ formattedDate }}</div>
				<div class="base-queue-card__flags">
					<span v-if="allTags.length > 0 && hasAnyTagVar" class="base-queue-card__flag base-queue-card__flag--tags-on">Теги {{ enabledTags.length }}/{{ allTags.length }}</span>
					<span v-if="effectiveChannelName" class="base-queue-card__flag base-queue-card__flag--channel">{{ effectiveChannelName }}</span>
					<span v-if="isTemplateOverridden" class="base-queue-card__flag base-queue-card__flag--override">Свой шаблон</span>
				</div>
			</div>

			<div class="base-queue-card__controls">
				<button class="base-queue-card__control-btn" :class="enabled ? 'base-queue-card__control-btn--active' : 'base-queue-card__control-btn--muted'" :title="enabled ? 'Выключить' : 'Включить'" @click.stop="$emit('toggle', id)">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
						<polyline v-if="enabled" points="20 6 9 17 4 12" />
						<line v-else x1="5" y1="12" x2="19" y2="12" />
					</svg>
				</button>
				<button class="base-queue-card__control-btn base-queue-card__control-btn--muted">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline v-if="expanded" points="18 15 12 9 6 15" />
						<polyline v-else points="6 9 12 15 18 9" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Редактор -->
		<div v-if="expanded" class="base-queue-card__editor">
			<slot name="editor-top" />

			<!-- Описание: только если {{desc}} в шаблоне -->
			<div v-if="templateVars.hasDesc" class="base-queue-card__editor-field">
				<label class="base-queue-card__editor-label">Описание</label>
				<textarea
					:value="description"
					class="base-queue-card__editor-textarea"
					placeholder="Текст для {{desc}}"
					rows="4"
					@input="$emit('update:description', ($event.target as HTMLTextAreaElement).value)"
				></textarea>
			</div>

			<!-- Tags: interactive when template uses a tag variable -->
			<template v-if="allTags.length > 0">
				<div v-if="hasAnyTagVar" class="base-queue-card__editor-field">
					<div class="base-queue-card__tag-header">
						<label class="base-queue-card__editor-label">Tags</label>
						<div class="base-queue-card__tag-bulk">
							<button class="base-queue-card__tag-bulk-btn" @click="onEnableAllTags">Включить все</button>
							<button class="base-queue-card__tag-bulk-btn" @click="onDisableAllTags">Выключить все</button>
						</div>
					</div>
					<div class="base-queue-card__tag-chips">
						<button
							v-for="tag in visibleTags"
							:key="tag"
							class="base-queue-card__tag-chip"
							:class="{ 'base-queue-card__tag-chip--off': uiExcludedTags.includes(tag) }"
							@click="onToggleTag(tag)"
						>{{ tag }}</button>
					</div>
					<button v-if="hiddenTagsCount > 0" class="base-queue-card__tags-expand-btn" @click="$emit('update:tagsExpanded', true)">
						Показать все ({{ allTags.length }})
					</button>
					<button v-else-if="tagsExpanded && allTags.length > tagsVisible" class="base-queue-card__tags-expand-btn" @click="$emit('update:tagsExpanded', false)">
						Скрыть
					</button>
				</div>
				<p v-else-if="effectiveTemplate" class="base-queue-card__editor-tags-hint">
					Теги найдены, но текущий шаблон их не использует.
				</p>
			</template>

			<!-- Нет интерактивных элементов: подсказка -->
			<div v-if="!hasAnyControls" class="base-queue-card__editor-empty-hint">
				<template v-if="!effectiveTemplate">
					Шаблон не задан. Пост будет опубликован без подписи.
				</template>
				<template v-else>
					Шаблон не содержит переменных - подпись формируется из статического текста.
				</template>
			</div>

			<!-- Advanced / Override template -->
			<div class="base-queue-card__editor-advanced">
				<button class="base-queue-card__editor-advanced-toggle" @click="$emit('update:overrideExpanded', !overrideExpanded)">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:10px;height:10px;flex-shrink:0">
						<polyline v-if="overrideExpanded" points="18 15 12 9 6 15" />
						<polyline v-else points="6 9 12 15 18 9" />
					</svg>
					Advanced
				</button>
				<div v-if="overrideExpanded" class="base-queue-card__editor-field" style="margin-top:6px">
					<div class="base-queue-card__editor-label-row">
						<label class="base-queue-card__editor-label">Override template</label>
						<button v-if="isSyncNeeded" class="base-queue-card__editor-sync-btn" @click="onSyncToGlobal">↺ Синхронизировать</button>
					</div>
					<textarea
						:ref="(el) => setOverrideElRef(el as HTMLTextAreaElement | null)"
						:value="overrideTemplate"
						class="base-queue-card__editor-textarea"
						placeholder="Шаблон канала не задан"
						rows="8"
						@input="$emit('update:overrideTemplate', ($event.target as HTMLTextAreaElement).value)"
					></textarea>
					<div class="base-queue-card__template-vars">
						<button v-for="v in TEMPLATE_VARS" :key="v" class="base-queue-card__tvar-chip" @click="onInsertVar(v)">{{ v }}</button>
					</div>
					<slot name="advanced-extra" />
				</div>
			</div>

			<!-- Канал -->
			<div class="base-queue-card__editor-field">
				<label class="base-queue-card__editor-label">Канал</label>
				<select class="base-queue-card__editor-select" :value="channelId || activeChatID || ''" @change="onChannelChange">
					<option v-for="ch in channels" :key="ch.chatID" :value="ch.chatID">{{ ch.name }}</option>
				</select>
			</div>

			<!-- Действия -->
			<div class="base-queue-card__editor-footer">
				<slot name="footer-actions" :isSending="isSending ?? false" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppCheckbox from './AppCheckbox.vue';
import { Channel } from '@/models/Channel';
import { TemplateVariables } from '@/utils/telegram/templateVariables';
import { TEMPLATE_VARS } from '@/shared/constants/templates';

const props = withDefaults(defineProps<{
	variant: 'single' | 'group';
	id: string;
	enabled: boolean;
	selected?: boolean;
	isSending?: boolean;
	addedAt: number;
	title: string;
	channels: Channel[];
	activeChatID: string | null;

	expanded: boolean;
	overrideExpanded: boolean;
	tagsExpanded: boolean;
	description: string;
	overrideTemplate: string;
	channelId: string;

	templateVars: TemplateVariables;
	hasAnyTagVar: boolean;
	hasAnyControls: boolean;
	allTags: string[];
	uiExcludedTags: string[];
	enabledTags: string[];
	visibleTags: string[];
	hiddenTagsCount: number;
	tagsVisible: number;
	effectiveTemplate: string;
	isTemplateOverridden: boolean;
	effectiveChannelName: string | null;
	isSyncNeeded: boolean;

	onToggleTag: (tag: string) => void;
	onEnableAllTags: () => void;
	onDisableAllTags: () => void;
	onInsertVar: (variable: string) => void;
	onSyncToGlobal: () => void;
	onChannelChange: (event: Event) => void;
	/** Форвардит ref DOM-элемента override-textarea в composable потребителя (useCardEditor.overrideEl), чтобы insertVar() могла вставлять переменную по позиции курсора. */
	setOverrideElRef: (el: HTMLTextAreaElement | null) => void;
}>(), {
	selected: false,
	isSending: false,
});

defineEmits<{
	(e: 'update:expanded', value: boolean): void;
	(e: 'update:overrideExpanded', value: boolean): void;
	(e: 'update:tagsExpanded', value: boolean): void;
	(e: 'update:description', value: string): void;
	(e: 'update:overrideTemplate', value: string): void;
	(e: 'toggle', id: string): void;
	(e: 'select', id: string): void;
}>();

defineSlots<{
	preview(): any;
	'editor-top'(): any;
	'advanced-extra'(): any;
	'footer-actions'(props: { isSending: boolean }): any;
}>();

const checkboxVariant = computed(() => (props.variant === 'group' ? 'accent' : 'primary'));

const formattedDate = computed(() =>
	new Date(props.addedAt).toLocaleDateString('ru-RU', {
		day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
	})
);
</script>

<style scoped lang="scss">
.base-queue-card {
	background: $sp-bg-card;
	border-radius: 10px;
	overflow: hidden;
	box-shadow: 0 1px 3px rgba(0,0,0,0.08);
	transition: opacity 0.2s, border-color 0.15s;

	&--disabled { opacity: 0.45; }

	&--single {
		border: 1px solid $sp-border-card;
		&.base-queue-card--selected { border-color: $sp-primary; box-shadow: 0 0 0 2px $sp-primary-a15; }
	}

	&--group {
		border: 2px solid $sp-border-accent;
		&.base-queue-card--selected { border-color: $sp-accent; box-shadow: 0 0 0 2px $sp-accent-a20; }
	}

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

	&__preview { flex-shrink: 0; }

	&__meta { flex: 1; min-width: 0; }

	&__title {
		font-size: 0.857rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&--single &__title { color: $sp-primary; }
	&--group  &__title { color: $sp-accent; font-weight: 700; }

	&__date { font-size: 0.786rem; color: $sp-text-light; }

	&__flags {
		display: flex;
		gap: 4px;
		margin-top: 3px;
		flex-wrap: wrap;
	}

	&__flag {
		font-size: 0.714rem;
		padding: 1px 5px;
		border-radius: 3px;
		font-weight: 500;
		&--tags-on  { background: $sp-bg-accent; color: $sp-accent-dark; }
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
		&--muted { color: $sp-text-faint; }
	}

	&--single &__control-btn--active { background: $sp-primary; border-color: $sp-primary; color: $sp-on-primary; }
	&--group  &__control-btn--active { background: $sp-accent;  border-color: $sp-accent;  color: $sp-on-accent; }

	&__editor {
		padding: 10px 12px 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;

		&-field { display: flex; flex-direction: column; gap: 6px; }

		&-label {
			font-size: 0.714rem;
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

		&-select,
		&-textarea,
		&-input {
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
		}
		&-textarea { resize: vertical; }

		&-tags-hint {
			font-size: 0.786rem;
			color: $sp-text-label;
			margin: 0;
			padding: 4px 0;
		}

		&-empty-hint {
			font-size: 0.786rem;
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
				font-size: 0.786rem;
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

	&--single &__editor { border-top: 1px solid $sp-border-light; background: $sp-bg-editor; }
	&--group  &__editor { border-top: 1px solid $sp-bg-accent;   background: $sp-bg-accent-soft; }

	&--single &__editor-select:focus,
	&--single &__editor-textarea:focus,
	&--single &__editor-input:focus { border-color: $sp-primary; }
	&--group &__editor-select:focus,
	&--group &__editor-textarea:focus,
	&--group &__editor-input:focus { border-color: $sp-accent; }

	&--single &__editor-sync-btn { color: $sp-primary; }
	&--group  &__editor-sync-btn { color: $sp-accent; }

	&__editor-sync-btn {
		background: none;
		border: none;
		padding: 0;
		font-size: 0.714rem;
		cursor: pointer;
		font-weight: 600;
		@media (hover: hover) { &:hover { text-decoration: underline; } }
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
				font-size: 0.714rem;
				color: $sp-text-hint;
				cursor: pointer;
			}
		}

		&-chips { display: flex; flex-wrap: wrap; gap: 4px; }

		&-chip {
			font-size: $sp-font-tags;
			line-height: 1.4;
			padding: 2px 8px;
			border-radius: 10px;
			cursor: pointer;
			transition: all 0.12s;
			user-select: none;
			@media (hover: hover) {
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

	&--single &__tag-bulk-btn:hover { border-color: $sp-primary; color: $sp-primary; }
	&--group  &__tag-bulk-btn:hover { border-color: $sp-accent;  color: $sp-accent; }

	&--single &__tag-chip:not(&__tag-chip--off) {
		border: 1px solid $sp-chip-border;
		background: $sp-chip-bg;
		color: $sp-chip-text;
		@media (hover: hover) { &:hover { background: $sp-chip-hover; } }
	}
	&--group &__tag-chip:not(&__tag-chip--off) {
		border: 1px solid $sp-chip-accent-border;
		background: $sp-chip-accent-bg;
		color: $sp-chip-accent-text;
		@media (hover: hover) { &:hover { background: $sp-chip-accent-hover; } }
	}
	&__tag-chip--off { border: 1px solid $sp-border; }

	&__tags-expand-btn {
		background: none;
		border: none;
		padding: 0;
		font-size: 0.714rem;
		cursor: pointer;
		align-self: flex-start;
		@media (hover: hover) { &:hover { text-decoration: underline; } }
	}
	&--single &__tags-expand-btn { color: $sp-primary; }
	&--group  &__tags-expand-btn { color: $sp-accent; }

	&__template-vars { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }

	&__tvar-chip {
		font-size: 0.714rem;
		padding: 1px 6px;
		border-radius: 4px;
		cursor: pointer;
		font-family: monospace;
		transition: background 0.1s;
	}
	&--single &__tvar-chip {
		border: 1px solid $sp-chip-border;
		background: $sp-chip-bg;
		color: $sp-chip-text;
		@media (hover: hover) { &:hover { background: $sp-chip-hover; } }
	}
	&--group &__tvar-chip {
		border: 1px solid $sp-chip-accent-border;
		background: $sp-chip-accent-bg;
		color: $sp-chip-accent-text;
		@media (hover: hover) { &:hover { background: $sp-chip-accent-hover; } }
	}
}
</style>
