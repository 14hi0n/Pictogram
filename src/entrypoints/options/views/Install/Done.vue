<template>
	<div class="done">
		<!-- <div class="done__icon">🎉</div> -->
		<h2 class="done__title">Всё готово!</h2>
		<p class="done__text">
			Расширение настроено.
		</p>

		<div class="done__sites">
			<a href="https://danbooru.donmai.us" target="_blank" class="done__site-link">danbooru</a>
			<a href="https://www.pixiv.net" target="_blank" class="done__site-link">pixiv</a>
		</div>

		<div class="done__tips">
			<div class="done__tip">
				<strong>Отправить сейчас</strong> - синяя кнопка - мгновенная отправка в активный канал.
			</div>
			<div class="done__tip">
				<strong>В очередь</strong> - серая кнопка - добавляет в боковую панель для редактирования.
			</div>
			<div class="done__tip">
				Нажми на иконку расширения в панели браузера, чтобы открыть боковую панель.
			</div>
		</div>

		<button class="done__btn" @click="closeTab">Закрыть</button>
	</div>
</template>

<script setup lang="ts">
function closeTab(): void {
	window.close();
}
</script>

<style scoped>
.done {
	text-align: center;
	padding: 40px 20px;
	max-width: 480px;
	margin: 0 auto;
}

.done__icon {
	font-size: 64px;
	margin-bottom: 16px;
}

.done__title {
	font-size: 26px;
	font-weight: 700;
	color: #1a1a2e;
	margin-bottom: 12px;
}

.done__text {
	font-size: 15px;
	color: #555;
	line-height: 1.6;
	margin-bottom: 20px;
}

.done__sites {
	display: flex;
	justify-content: center;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 28px;
}

.done__site-link {
	padding: 5px 14px;
	background: #0088cc;
	color: #fff;
	border-radius: 20px;
	font-size: 13px;
	text-decoration: none;
	font-weight: 500;
	transition: opacity 0.15s;

	@media (hover: hover) {
		&:hover { opacity: 0.85; }
	}
}

.done__tips {
	background: #f8f9fa;
	border-radius: 8px;
	padding: 16px;
	text-align: left;
	margin-bottom: 28px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.done__tip {
	font-size: 13px;
	color: #555;
	line-height: 1.5;

	strong {
		color: #0088cc;
	}
}

.done__btn {
	padding: 10px 30px;
	background: #f0f0f0;
	color: #333;
	border: none;
	border-radius: 8px;
	font-size: 14px;
	cursor: pointer;
	transition: background 0.15s;

	@media (hover: hover) {
		&:hover { background: #e0e0e0; }
	}
}
</style>
