import { get, writable } from 'svelte/store';
import { z } from 'zod';

export type ThemePreference = 'auto' | 'light' | 'dark';

export interface ThemeSchedule {
	startHour: number;
	endHour: number;
}

const themeSchema = z.enum(['auto', 'light', 'dark']);
const STORAGE_KEY = 'kaadoneuro_theme';

const scheduleSchema = z.object({
	startHour: z.number().int().min(0).max(23),
	endHour: z.number().int().min(0).max(23)
});

const SCHEDULE_KEY = 'kaadoneuro_theme_schedule';
const OVERRIDE_KEY = 'kaadoneuro_theme_override_until';

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

function loadSchedule(): ThemeSchedule | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(SCHEDULE_KEY);
		if (!raw) return null;
		const result = scheduleSchema.safeParse(JSON.parse(raw));
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}

function saveSchedule(value: ThemeSchedule | null) {
	if (typeof window === 'undefined') return;
	try {
		if (value) {
			localStorage.setItem(SCHEDULE_KEY, JSON.stringify(value));
		} else {
			localStorage.removeItem(SCHEDULE_KEY);
		}
	} catch {
		// Storage may be unavailable
	}
}

function getOverrideUntil(): string | null {
	if (typeof window === 'undefined') return null;
	try {
		return localStorage.getItem(OVERRIDE_KEY);
	} catch {
		return null;
	}
}

function setOverrideUntil(until: string | null) {
	if (typeof window === 'undefined') return;
	try {
		if (until) {
			localStorage.setItem(OVERRIDE_KEY, until);
		} else {
			localStorage.removeItem(OVERRIDE_KEY);
		}
	} catch {
		// Storage may be unavailable
	}
}

function isScheduleActive(schedule: ThemeSchedule | null, now: Date): boolean {
	if (!schedule) return false;
	const hour = now.getHours();
	const { startHour, endHour } = schedule;
	if (startHour < endHour) {
		return hour >= startHour && hour < endHour;
	}
	// Overnight schedule (e.g., 22:00 to 06:00)
	return hour >= startHour || hour < endHour;
}

function applyScheduledTheme(
	schedule: ThemeSchedule | null,
	currentPref: ThemePreference,
	now: Date
): ThemePreference {
	const overrideUntil = getOverrideUntil();
	if (overrideUntil && new Date(overrideUntil) > now) {
		return currentPref; // Manual override still active
	}
	if (isScheduleActive(schedule, now)) {
		return 'dark';
	}
	return 'light';
}

// Track manual overrides to prevent immediate schedule reversion
let lastManualSet: number = 0;

export function setThemeWithOverride(pref: ThemePreference) {
	themePreference.set(pref);
	// Set override for 12 hours to prevent schedule from immediately reverting
	const until = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
	setOverrideUntil(until);
	lastManualSet = Date.now();
}

export const themePreference = writable<ThemePreference>(loadTheme());
export const themeSchedule = writable<ThemeSchedule | null>(loadSchedule());

if (typeof window !== 'undefined') {
	// Persist local changes. `storage` events do not fire in the originating tab,
	// so this cannot loop back into `themePreference`.
	themePreference.subscribe(saveTheme);
	themeSchedule.subscribe(saveSchedule);

	// Another tab changed the preference: mirror it here.
	window.addEventListener('storage', (event) => {
		if (event.key === STORAGE_KEY) {
			const result = themeSchema.safeParse(JSON.parse(event.newValue ?? '"auto"'));
			themePreference.set(result.success ? result.data : 'auto');
		} else if (event.key === SCHEDULE_KEY) {
			const raw = event.newValue;
			if (!raw) {
				themeSchedule.set(null);
			} else {
				const result = scheduleSchema.safeParse(JSON.parse(raw));
				themeSchedule.set(result.success ? result.data : null);
			}
		}
	});

	// In 'auto' mode the resolved theme must follow the OS setting live.
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (get(themePreference) === 'auto') applyTheme('auto');
	});

	// Apply scheduled theme on load and every minute
	function checkAndApplySchedule() {
		const schedule = loadSchedule();
		const currentPref = get(themePreference);
		const now = new Date();

		// Only auto-switch if user hasn't manually overridden recently (within last 5 minutes)
		if (Date.now() - lastManualSet > 5 * 60 * 1000) {
			const scheduledPref = applyScheduledTheme(schedule, currentPref, now);
			if (scheduledPref !== currentPref) {
				themePreference.set(scheduledPref);
			}
		}
	}

	// Check on load
	checkAndApplySchedule();

	// Check every minute
	const intervalId = setInterval(checkAndApplySchedule, 60 * 1000);

	// Cleanup on page unload (though this rarely fires in SPAs)
	window.addEventListener('beforeunload', () => {
		clearInterval(intervalId);
	});
}
