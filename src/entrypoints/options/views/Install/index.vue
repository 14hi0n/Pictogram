<template>
	<div class="onboarding">
		<!-- Индикатор шагов -->
		<div class="onboarding__steps">
			<div
				v-for="(label, i) in stepLabels"
				:key="i"
				class="onboarding__step"
				:class="{
					'onboarding__step--done': i < currentStep,
					'onboarding__step--active': i === currentStep,
				}"
			>
				<div class="onboarding__step-dot">
					<span v-if="i < currentStep">✓</span>
					<span v-else>{{ i + 1 }}</span>
				</div>
				<span class="onboarding__step-label">{{ label }}</span>
			</div>
		</div>

		<!-- Контент шага -->
		<div class="onboarding__content">
			<FirstWelcome v-if="currentStep === 0" @next="nextStep" />

			<SetupBotStep v-if="currentStep === 1" @next="nextStep" @back="prevStep" />

			<DoneStep v-if="currentStep === 2" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import FirstWelcome from '../FirstWelcome.vue';
import SetupBotStep from './SetupBot/index.vue';
import DoneStep from './Done.vue';

const currentStep = ref(0);
const stepLabels = ['Привет', 'Бот и каналы', 'Готово'];

function nextStep(): void {
	if (currentStep.value < stepLabels.length - 1) {
		currentStep.value++;
	}
}

function prevStep(): void {
	if (currentStep.value > 0) {
		currentStep.value--;
	}
}
</script>

<style scoped>
.onboarding {
	min-height: 100vh;
	background: #f8f9fa;
}

.onboarding__steps {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 0;
	padding: 20px;
	background: #fff;
	border-bottom: 1px solid #e8e8e8;
}

.onboarding__step {
	display: flex;
	align-items: center;
	gap: 6px;

	& + & {
		&::before {
			content: '';
			display: block;
			width: 40px;
			height: 1px;
			background: #ddd;
			margin: 0 8px;
		}
	}
}

.onboarding__step-dot {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: #e0e0e0;
	color: #999;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 13px;
	font-weight: 600;
	flex-shrink: 0;
	transition: all 0.2s;

	.onboarding__step--active & {
		background: #0088cc;
		color: #fff;
	}

	.onboarding__step--done & {
		background: #27ae60;
		color: #fff;
	}
}

.onboarding__step-label {
	font-size: 13px;
	color: #999;
	font-weight: 500;

	.onboarding__step--active & {
		color: #0088cc;
	}

	.onboarding__step--done & {
		color: #27ae60;
	}
}

.onboarding__content {
	padding: 20px;
}
</style>
