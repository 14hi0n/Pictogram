export type ThemeMode = 'auto' | 'light' | 'dark';

export interface AccentPreset {
	id: string;
	label: string;
	color: string;
	colorDark: string;
	onColor: string;
	onColorDark: string;
	chipBg: string;
	chipBorder: string;
	chipText: string;
	chipHover: string;
	chipBgDark: string;
	chipBorderDark: string;
	chipTextDark: string;
	chipHoverDark: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
	{
		id: 'blue', label: 'Синий',
		color: '#0088cc', colorDark: '#0077b6',
		onColor: '#ffffff', onColorDark: '#ffffff',
		chipBg: '#e8f4fd', chipBorder: '#c8e6fa', chipText: '#0077b6', chipHover: '#d0eaf8',
		chipBgDark: '#1a2d3d', chipBorderDark: '#1a4060', chipTextDark: '#4db8e8', chipHoverDark: '#1e3850',
	},
	{
		id: 'purple', label: 'Фиолет',
		color: '#8b5cf6', colorDark: '#7c3aed',
		onColor: '#ffffff', onColorDark: '#ffffff',
		chipBg: '#f3effe', chipBorder: '#d8b4fe', chipText: '#7c3aed', chipHover: '#ede9fe',
		chipBgDark: '#2a1f4a', chipBorderDark: '#5a3a9a', chipTextDark: '#b085f5', chipHoverDark: '#33235a',
	},
	{
		id: 'green', label: 'Зелёный',
		color: '#10b981', colorDark: '#059669',
		onColor: '#ffffff', onColorDark: '#ffffff',
		chipBg: '#d1fae5', chipBorder: '#a7f3d0', chipText: '#059669', chipHover: '#bbf7d0',
		chipBgDark: '#0a2e1f', chipBorderDark: '#0a5c3f', chipTextDark: '#34d399', chipHoverDark: '#0d3826',
	},
	{
		id: 'orange', label: 'Оранжевый',
		color: '#f59e0b', colorDark: '#d97706',
		onColor: '#1a1a1a', onColorDark: '#ffffff',
		chipBg: '#fef3c7', chipBorder: '#fde68a', chipText: '#d97706', chipHover: '#fde68a',
		chipBgDark: '#2a1f00', chipBorderDark: '#5a4000', chipTextDark: '#fbbf24', chipHoverDark: '#332500',
	},
	{
		id: 'pink', label: 'Розовый',
		color: '#ec4899', colorDark: '#db2777',
		onColor: '#ffffff', onColorDark: '#ffffff',
		chipBg: '#fce7f3', chipBorder: '#fbcfe8', chipText: '#db2777', chipHover: '#f9a8d4',
		chipBgDark: '#2a0f1f', chipBorderDark: '#6b1035', chipTextDark: '#f472b6', chipHoverDark: '#331428',
	},
	{
		id: 'red', label: 'Красный',
		color: '#ef4444', colorDark: '#dc2626',
		onColor: '#ffffff', onColorDark: '#ffffff',
		chipBg: '#fee2e2', chipBorder: '#fecaca', chipText: '#dc2626', chipHover: '#fca5a5',
		chipBgDark: '#2a0a0a', chipBorderDark: '#5c1515', chipTextDark: '#f87171', chipHoverDark: '#330f0f',
	},
];

export const DEFAULT_THEME: ThemeMode = 'auto';
export const DEFAULT_ACCENT = 'blue';
