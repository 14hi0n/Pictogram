<template>
	<div class="page">
		<div class="container page__wrapper">
			<InstallView />
		</div>
	</div>
</template>

<script setup lang="ts">
import InstallView from './views/Install/index.vue';
</script>

<style lang="scss">
body {
	background: $sp-bg-light !important;
	color: $sp-text !important;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

a {
	border-bottom: none !important;
}

@media (max-width: 768px) {
	input, textarea, select {
		font-size: 16px !important;
	}
}

.page__wrapper {
	border: none !important;
	background: transparent !important;
	min-height: auto !important;
}

@media (max-width: 540px) {
	.page {
		margin: 0 !important;
	}
	.container {
		box-sizing: border-box !important;
		min-width: 0 !important;
		width: 100% !important;
	}
}
</style>
