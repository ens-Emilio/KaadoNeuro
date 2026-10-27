import { persisted } from 'svelte-local-storage-store';
import { z } from 'zod';

export type ThemePreference = 'auto' | 'light' | 'dark';

const themeSchema = z.enum(['auto', 'light', 'dark']);

function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
	if (pref !== 'auto') return pref;
	if (typeof window === 'undefined') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(pref: ThemePreference) {
	const resolved = resolveTheme(pref);
	document.documentElement.setAttribute('data-theme', resolved);
}

export const themePreference = persisted<ThemePreference>('kaadoneuro_theme', 'auto', {
	serializer: {
		stringify: (v) => JSON.stringify(v),
		parse: (raw) => {
			const result = themeSchema.safeParse(JSON.parse(raw ?? '"auto"'));
			return result.success ? result.data : 'auto';
		}
	}
});