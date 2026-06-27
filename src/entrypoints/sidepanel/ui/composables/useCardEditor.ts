import { ref, computed, watch, nextTick } from 'vue';
import { Channel } from '@/models/Channel';
import { PostSettings } from '@/models/PostSettings';
import { TagItem } from '@/models/TagItem';
import { getTemplateVariables } from '@/utils/telegram/templateVariables';
import { TEMPLATE_VARS } from '@/shared/constants/templates';

export interface CardEditorItem {
	id: string;
	targetChannelID?: string | null;
	settings: PostSettings;
	hashtags: TagItem[];
}

export function useCardEditor(
	props: Readonly<{
		item: CardEditorItem;
		channels: Channel[];
		activeChatID: string | null;
	}>,
	onUpdateSettings: (id: string, settings: PostSettings) => void,
	onUpdateChannel: (id: string, channelID: string | null) => void,
) {
	const TAGS_VISIBLE = 12;

	const expanded          = ref(false);
	const overrideExpanded  = ref(false);
	const tagsExpanded      = ref(false);
	const overrideEl        = ref<HTMLTextAreaElement | null>(null);
	const localChannelID    = ref<string>(props.item.targetChannelID ?? '');

	const localDescription       = ref(props.item.settings.customDescription ?? '');
	const localExcludedTags      = ref<string[]>([...(props.item.settings.excludedTags ?? [])]);
	const localOverrideTemplate  = ref(props.item.settings.captionTemplate ?? '');
	const localTagSelectionMode  = ref<'auto' | 'manual'>(props.item.settings.tagSelectionMode ?? 'auto');
	const localCaptionTemplateMode = ref<'channel_default' | 'custom'>(
		(() => {
			if (props.item.settings.captionTemplateMode) return props.item.settings.captionTemplateMode;
			return props.item.settings.captionTemplate?.trim() ? 'custom' : 'channel_default';
		})()
	);

	const effectiveChannel = computed(() => {
		const id = localChannelID.value || props.activeChatID || '';
		return props.channels.find((ch: Channel) => ch.chatID === id) ?? null;
	});

	const effectiveTemplate = computed(() => {
		if (localCaptionTemplateMode.value === 'custom') return localOverrideTemplate.value;
		return effectiveChannel.value?.defaults.captionTemplate ?? '';
	});

	const isTemplateOverridden = computed(() => localCaptionTemplateMode.value === 'custom');

	const templateVars = computed(() => getTemplateVariables(effectiveTemplate.value));

	const effectiveChannelName = computed(() =>
		localChannelID.value ? (effectiveChannel.value?.name ?? null) : null
	);

	const hasAnyTagVar = computed(() =>
		templateVars.value.hasTags || templateVars.value.hasAllTags
	);

	const hasTagsHint = computed(() =>
		allTags.value.length > 0 && !!effectiveTemplate.value && !hasAnyTagVar.value
	);

	const hasAnyControls = computed(() =>
		templateVars.value.hasDesc || hasAnyTagVar.value || hasTagsHint.value
	);

	const characterTags = computed(() =>
		props.item.hashtags
			.filter((g: TagItem) => g.label !== 'copyright')
			.flatMap((g: TagItem) => g.tags)
	);
	const copyrightTags = computed(() =>
		props.item.hashtags.find((g: TagItem) => g.label === 'copyright')?.tags ?? []
	);
	const allTags = computed(() => [...characterTags.value, ...copyrightTags.value]);

	const enabledTags  = computed(() => allTags.value.filter(t => !localExcludedTags.value.includes(t)));
	const disabledTags = computed(() => allTags.value.filter(t => localExcludedTags.value.includes(t)));

	const visibleTags = computed(() => {
		if (tagsExpanded.value || allTags.value.length <= TAGS_VISIBLE) return allTags.value;
		return [...enabledTags.value, ...disabledTags.value.slice(0, TAGS_VISIBLE)];
	});

	const hiddenTagsCount = computed(() => {
		if (tagsExpanded.value || allTags.value.length <= TAGS_VISIBLE) return 0;
		return allTags.value.length - visibleTags.value.length;
	});

	watch(() => props.item.settings, (s) => {
		localDescription.value         = s.customDescription ?? '';
		localExcludedTags.value        = [...(s.excludedTags ?? [])];
		localOverrideTemplate.value    = s.captionTemplate ?? '';
		localTagSelectionMode.value    = s.tagSelectionMode ?? 'auto';
		localCaptionTemplateMode.value = s.captionTemplateMode ?? (s.captionTemplate?.trim() ? 'custom' : 'channel_default');
	}, { deep: true });

	function buildSettings(): PostSettings {
		return {
			customDescription:   localDescription.value,
			captionTemplate:     localOverrideTemplate.value,
			captionTemplateMode: localCaptionTemplateMode.value,
			includeCharacterTags: true,
			includeCopyrightTags: true,
			disableLinks: false,
			excludedTags:        [...localExcludedTags.value],
			tagSelectionMode:    localTagSelectionMode.value,
		};
	}

	function emitUpdate(): void {
		onUpdateSettings(props.item.id, buildSettings());
	}

	function toggleTag(tag: string): void {
		const idx = localExcludedTags.value.indexOf(tag);
		if (idx === -1) localExcludedTags.value.push(tag);
		else localExcludedTags.value.splice(idx, 1);
		localTagSelectionMode.value = 'manual';
		emitUpdate();
	}

	function enableAllTags(): void {
		localExcludedTags.value = [];
		localTagSelectionMode.value = 'manual';
		emitUpdate();
	}

	function disableAllTags(): void {
		localExcludedTags.value = [...allTags.value];
		localTagSelectionMode.value = 'manual';
		emitUpdate();
	}

	function insertVar(variable: string): void {
		const el   = overrideEl.value;
		const text = localOverrideTemplate.value;
		if (!el) {
			localOverrideTemplate.value = text + variable;
			localCaptionTemplateMode.value = 'custom';
			emitUpdate();
			return;
		}
		const start = el.selectionStart ?? text.length;
		const end   = el.selectionEnd   ?? text.length;
		localOverrideTemplate.value = text.slice(0, start) + variable + text.slice(end);
		localCaptionTemplateMode.value = 'custom';
		emitUpdate();
		nextTick(() => { el.selectionStart = el.selectionEnd = start + variable.length; el.focus(); });
	}

	function onOverrideInput(): void {
		localCaptionTemplateMode.value = localOverrideTemplate.value.trim() ? 'custom' : 'channel_default';
		emitUpdate();
	}

	function onChannelChange(event: Event): void {
		const value = (event.target as HTMLSelectElement).value;
		localChannelID.value = value;
		onUpdateChannel(props.item.id, value || null);
	}

	return {
		TAGS_VISIBLE,
		TEMPLATE_VARS,
		expanded,
		overrideExpanded,
		tagsExpanded,
		overrideEl,
		localChannelID,
		localDescription,
		localExcludedTags,
		localOverrideTemplate,
		localTagSelectionMode,
		localCaptionTemplateMode,
		effectiveChannel,
		effectiveTemplate,
		isTemplateOverridden,
		templateVars,
		effectiveChannelName,
		hasAnyTagVar,
		hasTagsHint,
		hasAnyControls,
		characterTags,
		copyrightTags,
		allTags,
		enabledTags,
		disabledTags,
		visibleTags,
		hiddenTagsCount,
		buildSettings,
		emitUpdate,
		toggleTag,
		enableAllTags,
		disableAllTags,
		insertVar,
		onOverrideInput,
		onChannelChange,
	};
}
