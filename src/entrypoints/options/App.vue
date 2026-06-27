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

<style>
body {
	background: #f8f9fa !important;
	color: #333 !important;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

a {
	border-bottom: none !important;
}

.page__wrapper {
	border: none !important;
	background: transparent !important;
	min-height: auto !important;
}
</style>
