import { writable } from 'svelte/store';
import { z } from 'zod';

export type ThemePreference = 'auto' | 'light' | 'dark';

const themeSchema = z.enum(['auto', 'light', 'dark']);
const STORAGE_KEY = 'kaadoneuro_theme';

function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
	if (pref !== 'auto') return pref;
	if (typeof window === 'undefined') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(pref: ThemePreference) {
	const resolved = resolveTheme(pref);
	document.documentElement.setAttribute('data-theme', resolved);
}

function loadTheme(): ThemePreference {
	if (typeof window === 'undefined') return 'auto';
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const result = themeSchema.safeParse(JSON.parse(raw ?? '"auto"'));
		return result.success ? result.data : 'auto';
	} catch {
		return 'auto';
	}
}

function saveTheme(value: ThemePreference) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	} catch {}
}

export const themePreference = writable<ThemePreference>(loadTheme());

// Subscribe to persist changes to localStorage
if (typeof window !== 'undefined') {
	themePreference.subscribe(saveTheme);
}