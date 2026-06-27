import { ref } from 'vue';

export function usePositioning() {
	const panelX = ref(0);
	const panelY = ref(0);
	let observer: ResizeObserver | null = null;

	function posFromRect(el: HTMLElement): { x: number; y: number } | null {
		if (!document.body.contains(el)) return null;
		const r = el.getBoundingClientRect();
		if (r.width === 0 && r.height === 0) return null;
		const sx = window.scrollX || window.pageXOffset;
		const sy = window.scrollY || window.pageYOffset;
		return { x: r.right - 50 + sx, y: r.top + 8 + sy };
	}

	function updateSingle(el: HTMLElement): void {
		const pos = posFromRect(el);
		if (pos) { panelX.value = pos.x; panelY.value = pos.y; }
	}

	function updatePanels<T extends { element: HTMLElement; panelX: number; panelY: number }>(
		panels: T[]
	): void {
		for (const p of panels) {
			const pos = posFromRect(p.element);
			if (pos) { p.panelX = pos.x; p.panelY = pos.y; }
		}
	}

	function startObserving(targets: (Element | null | undefined)[], onResize: () => void): void {
		observer = new ResizeObserver(onResize);
		for (const el of targets) if (el) observer.observe(el);
	}

	function stopObserving(): void {
		observer?.disconnect();
		observer = null;
	}

	return { panelX, panelY, updateSingle, updatePanels, startObserving, stopObserving };
}
