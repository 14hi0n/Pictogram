<template>
	<div class="welcome">
		<!-- <div class="welcome__icon"></div> -->
		<h1 class="welcome__title">{{ APP_NAME }}</h1>
		<p class="welcome__subtitle">
			Расширение для быстрой отправки артов в твой Телеграм канал.
		</p>

		<div class="welcome__features">
			<div class="welcome__feature">
				<!-- <span class="welcome__feature-icon"></span> -->
				<div>
					<strong>Быстрая отправка</strong>
					<p>Одна кнопка рядом с изображением и арт уже в канале.</p>
				</div>
			</div>
			<div class="welcome__feature">
				<!-- <span class="welcome__feature-icon"></span> -->
				<div>
					<strong>Очередь постов</strong>
					<p>Добавляй в очередь, редактируй теги и описание перед отправкой.</p>
				</div>
			</div>
			<div class="welcome__feature">
				<!-- <span class="welcome__feature-icon"></span> -->
				<div>
					<strong>Через бота</strong>
					<p>Используется только Bot API, без входа в аккаунт.</p>
				</div>
			</div>
		</div>

		<div class="welcome__sites">
			<strong>Поддерживаемые сайты:</strong>
			<div class="welcome__sites-list">
				<span class="welcome__sites-badge">danbooru</span>
				<span class="welcome__sites-badge">pixiv</span>
				<span class="welcome__sites-badge">zerochan</span>
			</div>
		</div>

		<button class="welcome__btn" @click="$emit('next')">
			Начать настройку
		</button>
	</div>
</template>

<script setup lang="ts">
import { APP_NAME } from '@/shared/constants/app';
defineEmits<{ (e: 'next'): void }>();
</script>

<style scoped lang="scss">
.welcome {
	text-align: center;
	padding: 40px 20px;
	max-width: 500px;
	margin: 0 auto;

	&__icon { font-size: 60px; margin-bottom: 16px; }

	&__title {
		font-size: 24px;
		font-weight: 700;
		color: $sp-text-title;
		margin-bottom: 10px;
	}

	&__subtitle {
		font-size: 15px;
		color: $sp-text-muted;
		line-height: 1.6;
		margin-bottom: 30px;
	}

	&__features {
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 24px;
	}

	&__feature {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		strong { display: block; font-size: 14px; color: $sp-text; margin-bottom: 2px; }
		p { font-size: 13px; color: $sp-text-hint; margin: 0; }

		&-icon { font-size: 22px; flex-shrink: 0; margin-top: 2px; }
	}

	&__sites {
		font-size: 13px;
		color: $sp-text-muted;
		margin-bottom: 28px;
		strong { display: block; margin-bottom: 8px; }

		&-list {
			display: flex;
			gap: 6px;
			flex-wrap: wrap;
			justify-content: center;
		}

		&-badge {
			padding: 3px 10px;
			background: $sp-chip-bg;
			color: $sp-primary;
			border-radius: 20px;
			font-size: 12px;
			font-weight: 500;
		}
	}

	&__btn {
		padding: 12px 32px;
		background: $sp-primary;
		color: $sp-on-primary;
		border: none;
		border-radius: 8px;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
		@media (hover: hover) { &:hover { background: $sp-primary-dark; } }
	}
}
</style>
