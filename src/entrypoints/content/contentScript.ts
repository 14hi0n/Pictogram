import { createApp } from 'vue';
import AppContent from './ui/AppContent.vue';

function createWrapperAndMountVue(): void {
	// Host - кастомный элемент в body, без особых стилей (как у DeepL)
	const host = document.createElement('art-forwarder-inline-trigger');
	const shadowRoot = host.attachShadow({ mode: 'open' });
	document.body.appendChild(host);

	// CSS инжектируем через <link> в shadow root.
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = chrome.runtime.getURL('contentScript.css');
	shadowRoot.appendChild(link);

	const vueContainer = document.createElement('div');
	shadowRoot.appendChild(vueContainer);

	const app = createApp(AppContent);
	app.provide('shadowRoot', shadowRoot);
	app.mount(vueContainer);
}

window.addEventListener('load', createWrapperAndMountVue);
