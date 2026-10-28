import { get, writable } from 'svelte/store';
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
	} catch {
		// Storage may be unavailable (private mode or quota); theme remains in memory.
	}
}

export const themePreference = writable<ThemePreference>(loadTheme());

if (typeof window !== 'undefined') {
	// Persist local changes. `storage` events do not fire in the originating tab,
	// so this cannot loop back into `themePreference`.
	themePreference.subscribe(saveTheme);

	// Another tab changed the preference: mirror it here.
	window.addEventListener('storage', (event) => {
		if (event.key !== STORAGE_KEY) return;
		const result = themeSchema.safeParse(JSON.parse(event.newValue ?? '"auto"'));
		themePreference.set(result.success ? result.data : 'auto');
	});

	// In 'auto' mode the resolved theme must follow the OS setting live.
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (get(themePreference) === 'auto') applyTheme('auto');
	});
}
