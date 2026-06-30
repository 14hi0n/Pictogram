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

<style scoped lang="scss">
.done {
	text-align: center;
	padding: 40px 20px;
	max-width: 480px;
	margin: 0 auto;

	&__icon { font-size: 64px; margin-bottom: 16px; }

	&__title {
		font-size: 26px;
		font-weight: 700;
		color: $sp-text-title;
		margin-bottom: 12px;
	}

	&__text {
		font-size: 15px;
		color: $sp-text-secondary;
		line-height: 1.6;
		margin-bottom: 20px;
	}

	&__sites {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 28px;
	}

	&__site-link {
		padding: 5px 14px;
		background: $sp-primary;
		color: $sp-on-primary;
		border-radius: 20px;
		font-size: 13px;
		text-decoration: none;
		font-weight: 500;
		transition: opacity 0.15s;
		@media (hover: hover) { &:hover { opacity: 0.85; } }
	}

	&__tips {
		background: $sp-bg-light;
		border-radius: 8px;
		padding: 16px;
		text-align: left;
		margin-bottom: 28px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	&__tip {
		font-size: 13px;
		color: $sp-text-secondary;
		line-height: 1.5;
		strong { color: $sp-primary; }
	}

	&__btn {
		padding: 10px 30px;
		background: $sp-border-light;
		color: $sp-text;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		cursor: pointer;
		transition: background 0.15s;
		@media (hover: hover) { &:hover { background: $sp-border; } }
	}
}
</style>
