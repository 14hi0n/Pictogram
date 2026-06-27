<template>
	<div class="welcome">
		<!-- <div class="welcome__icon">🍈</div> -->
		<h1 class="welcome__title">{{ APP_NAME }}</h1>
		<p class="welcome__subtitle">
			Расширение для быстрой отправки артов в ТГ.
		</p>

		<div class="welcome__features">
			<div class="welcome__feature">
				<!-- <span class="welcome__feature-icon">⚡</span> -->
				<div>
					<strong>Быстрая отправка</strong>
					<p>Одна кнопка рядом с изображением и арт уже в канале.</p>
				</div>
			</div>
			<div class="welcome__feature">
				<!-- <span class="welcome__feature-icon">📋</span> -->
				<div>
					<strong>Очередь постов</strong>
					<p>Добавляй в очередь, редактируй теги и описание перед отправкой.</p>
				</div>
			</div>
			<div class="welcome__feature">
				<!-- <span class="welcome__feature-icon">🤖</span> -->
				<div>
					<strong>Через бота</strong>
					<p>Используется только Bot API, без входа в аккаунт.</p>
				</div>
			</div>
		</div>

		<div class="welcome__sites">
			<strong>Поддерживаемые сайты:</strong>
			<div class="welcome__sites-list">
				<span class="site-badge">danbooru</span>
				<span class="site-badge">pixiv</span>
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

<style scoped>
.welcome {
	text-align: center;
	padding: 40px 20px;
	max-width: 500px;
	margin: 0 auto;
}

.welcome__icon {
	font-size: 60px;
	margin-bottom: 16px;
}

.welcome__title {
	font-size: 24px;
	font-weight: 700;
	color: #1a1a2e;
	margin-bottom: 10px;
}

.welcome__subtitle {
	font-size: 15px;
	color: #666;
	line-height: 1.6;
	margin-bottom: 30px;
}

.welcome__features {
	text-align: left;
	display: flex;
	flex-direction: column;
	gap: 16px;
	margin-bottom: 24px;
}

.welcome__feature {
	display: flex;
	gap: 12px;
	align-items: flex-start;

	strong {
		display: block;
		font-size: 14px;
		color: #333;
		margin-bottom: 2px;
	}

	p {
		font-size: 13px;
		color: #888;
		margin: 0;
	}
}

.welcome__feature-icon {
	font-size: 22px;
	flex-shrink: 0;
	margin-top: 2px;
}

.welcome__sites {
	font-size: 13px;
	color: #666;
	margin-bottom: 28px;

	strong {
		display: block;
		margin-bottom: 8px;
	}
}

.welcome__sites-list {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
	justify-content: center;
}

.site-badge {
	padding: 3px 10px;
	background: #e8f4fd;
	color: #0088cc;
	border-radius: 20px;
	font-size: 12px;
	font-weight: 500;
}

.welcome__btn {
	padding: 12px 32px;
	background: #0088cc;
	color: #fff;
	border: none;
	border-radius: 8px;
	font-size: 15px;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.15s;

	&:hover {
		background: #0077b5;
	}
}
</style>
