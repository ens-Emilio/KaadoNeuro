import { get, writable } from 'svelte/store';
import { z } from 'zod';

export type FontSizeLevel = 80 | 90 | 100 | 110 | 120 | 130 | 140 | 150;

const fontSizeSchema = z.number().min(80).max(150).multipleOf(10);
const STORAGE_KEY = 'kaadoneuro_font_size';

function loadFontSize(): FontSizeLevel {
	if (typeof window === 'undefined') return 100;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const result = fontSizeSchema.safeParse(JSON.parse(raw ?? '100'));
		return result.success ? (result.data as FontSizeLevel) : 100;
	} catch {
		return 100;
	}
}

function saveFontSize(value: FontSizeLevel) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	} catch {
		// Storage may be unavailable
	}
}

export const fontSize = writable<FontSizeLevel>(loadFontSize());

if (typeof window !== 'undefined') {
	fontSize.subscribe((value) => {
		saveFontSize(value);
		document.documentElement.style.setProperty('--font-scale', `${value}%`);
	});

	// Apply initial value
	const initial = loadFontSize();
	document.documentElement.style.setProperty('--font-scale', `${initial}%`);

	// Sync across tabs
	window.addEventListener('storage', (event) => {
		if (event.key !== STORAGE_KEY) return;
		const result = fontSizeSchema.safeParse(JSON.parse(event.newValue ?? '100'));
		if (result.success) {
			fontSize.set(result.data as FontSizeLevel);
		}
	});
}

export function increaseFontSize() {
	const current = get(fontSize);
	if (current < 150) {
		fontSize.set((current + 10) as FontSizeLevel);
	}
}

export function decreaseFontSize() {
	const current = get(fontSize);
	if (current > 80) {
		fontSize.set((current - 10) as FontSizeLevel);
	}
}
