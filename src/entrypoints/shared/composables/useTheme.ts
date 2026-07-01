import { ref } from 'vue';
import { ThemeMode, AccentPreset, ACCENT_PRESETS, DEFAULT_THEME, DEFAULT_ACCENT } from '@/shared/constants/theme';
import { UserSettingsManager } from '@/services/UserSettingsManager';

// Singleton state - shared across all useTheme() calls in the same page
const settingsManager = new UserSettingsManager();
const themeMode = ref<ThemeMode>(DEFAULT_THEME);
const accentId = ref<string>(DEFAULT_ACCENT);
let mediaQuery: MediaQueryList | null = null;

function resolveEffective(mode: ThemeMode): 'light' | 'dark' {
	if (mode === 'auto') {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
	return mode;
}

function hexToRgba(hex: string, alpha: number): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyToDom(mode: ThemeMode, accent: string): void {
	const effective = resolveEffective(mode);
	document.documentElement.setAttribute('data-theme', effective);

	const preset: AccentPreset = ACCENT_PRESETS.find((p) => p.id === accent) ?? ACCENT_PRESETS[0];
	const isDark = effective === 'dark';
	const s = document.documentElement.style;

	s.setProperty('--sp-primary', preset.color);
	s.setProperty('--sp-primary-dark', preset.colorDark);
	s.setProperty('--sp-primary-a15', hexToRgba(preset.color, 0.15));
	s.setProperty('--sp-primary-a27', hexToRgba(preset.color, 0.27));

	s.setProperty('--sp-chip-bg',     isDark ? preset.chipBgDark     : preset.chipBg);
	s.setProperty('--sp-chip-border', isDark ? preset.chipBorderDark : preset.chipBorder);
	s.setProperty('--sp-chip-text',   isDark ? preset.chipTextDark   : preset.chipText);
	s.setProperty('--sp-chip-hover',  isDark ? preset.chipHoverDark  : preset.chipHover);
	s.setProperty('--sp-on-primary',  isDark ? preset.onColorDark    : preset.onColor);
}

function onSystemThemeChange(): void {
	if (themeMode.value === 'auto') {
		applyToDom('auto', accentId.value);
	}
}

export function useTheme() {
	async function initTheme(): Promise<void> {
		const settings = await settingsManager.getSettings();
		themeMode.value = settings.theme;
		accentId.value = settings.accentColor;

		applyToDom(themeMode.value, accentId.value);

		mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', onSystemThemeChange);
	}

	async function setTheme(mode: ThemeMode): Promise<void> {
		themeMode.value = mode;
		applyToDom(mode, accentId.value);
		await settingsManager.setTheme(mode);
	}

	async function setAccentColor(id: string): Promise<void> {
		accentId.value = id;
		applyToDom(themeMode.value, id);
		await settingsManager.setAccentColor(id);
	}

	function cleanup(): void {
		mediaQuery?.removeEventListener('change', onSystemThemeChange);
	}

	return { themeMode, accentId, initTheme, setTheme, setAccentColor, cleanup };
}
