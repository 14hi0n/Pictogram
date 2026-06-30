<template>
	<label
		class="app-checkbox"
		:class="[
			`app-checkbox--${variant}`,
			{
				'app-checkbox--checked':       modelValue && !indeterminate,
				'app-checkbox--indeterminate': indeterminate,
				'app-checkbox--disabled':      disabled,
			},
		]"
	>
		<input
			ref="inputEl"
			class="app-checkbox__input"
			type="checkbox"
			:checked="modelValue"
			:disabled="disabled"
			@change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
		/>
		<span class="app-checkbox__box">
			<svg v-if="!indeterminate" class="app-checkbox__icon" viewBox="0 0 10 8" fill="none">
				<polyline points="1 4 3.5 6.5 9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			<svg v-else class="app-checkbox__icon app-checkbox__icon--dash" viewBox="0 0 10 2" fill="none">
				<line x1="1" y1="1" x2="9" y2="1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
			</svg>
		</span>
		<slot />
	</label>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';

const props = withDefaults(defineProps<{
	modelValue: boolean;
	variant?: 'primary' | 'accent';
	indeterminate?: boolean;
	disabled?: boolean;
}>(), {
	variant: 'primary',
	indeterminate: false,
	disabled: false,
});

defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

const inputEl = ref<HTMLInputElement | null>(null);

watchEffect(() => {
	if (inputEl.value) inputEl.value.indeterminate = props.indeterminate;
});
</script>

<style scoped lang="scss">
.app-checkbox {
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	cursor: pointer;
	user-select: none;

	&--primary {
		--checkbox-color: var(--sp-primary);
		--checkbox-on:    var(--sp-on-primary);
		--checkbox-ring:  var(--sp-primary-a15);
	}

	&--accent {
		--checkbox-color: var(--sp-accent);
		--checkbox-on:    var(--sp-on-accent);
		--checkbox-ring:  var(--sp-accent-a20);
	}

	&__input {
		position: absolute;
		width: 0;
		height: 0;
		overflow: hidden;
		opacity: 0;
		margin: 0;
		padding: 0;
		pointer-events: none;
	}

	&__box {
		width: 15px;
		height: 15px;
		border-radius: 4px;
		border: 1.5px solid var(--sp-border-input);
		background: var(--sp-bg-card);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
		color: transparent;
	}

	&__icon {
		width: 10px;
		height: 8px;
		&--dash { height: 2px; }
	}

	&--checked &__box,
	&--indeterminate &__box {
		background: var(--checkbox-color);
		border-color: var(--checkbox-color);
		color: var(--checkbox-on);
	}

	&__input:focus-visible ~ &__box {
		box-shadow: 0 0 0 3px var(--checkbox-ring);
		border-color: var(--checkbox-color);
	}

	@media (hover: hover) {
		&:hover:not(.app-checkbox--disabled) &__box {
			border-color: var(--checkbox-color);
		}
	}

	&--disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
}
</style>
