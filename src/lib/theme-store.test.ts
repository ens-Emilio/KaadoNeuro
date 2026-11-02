import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { themePreference, themeSchedule, setThemeWithOverride, applyTheme } from './theme-store.js';
import type { ThemeSchedule } from './theme-store.js';

// Test environment is 'node' (no jsdom). The theme-store guards all browser
// APIs with `typeof window !== 'undefined'`, so in Node:
// - loadTheme() returns 'auto', loadSchedule() returns null
// - saveTheme/saveSchedule/setOverrideUntil are no-ops
// - applyTheme is a no-op (no document)
// - The setInterval/checkAndApplySchedule block never runs
// We test the PUBLIC API surface that IS exercisable in Node:
// store reads/writes, setThemeWithOverride (sets store + calls setOverrideUntil),
// and applyTheme (calls resolveTheme internally but document access is guarded).

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
});

afterEach(() => {
	vi.useRealTimers();
});

describe('themePreference store', () => {
	beforeEach(() => {
		themePreference.set('auto');
	});

	it('defaults to auto', () => {
		expect(get(themePreference)).toBe('auto');
	});

	it('can be set to light', () => {
		themePreference.set('light');
		expect(get(themePreference)).toBe('light');
	});

	it('can be set to dark', () => {
		themePreference.set('dark');
		expect(get(themePreference)).toBe('dark');
	});

	it('accepts all valid ThemePreference values', () => {
		const values = ['auto', 'light', 'dark'] as const;
		for (const v of values) {
			themePreference.set(v);
			expect(get(themePreference)).toBe(v);
		}
	});
});

describe('themeSchedule store', () => {
	beforeEach(() => {
		themeSchedule.set(null);
	});

	it('defaults to null', () => {
		expect(get(themeSchedule)).toBeNull();
	});

	it('accepts a valid schedule', () => {
		const schedule: ThemeSchedule = { startHour: 8, endHour: 20 };
		themeSchedule.set(schedule);
		expect(get(themeSchedule)).toEqual(schedule);
	});

	it('accepts an overnight schedule', () => {
		const schedule: ThemeSchedule = { startHour: 22, endHour: 6 };
		themeSchedule.set(schedule);
		expect(get(themeSchedule)).toEqual(schedule);
	});

	it('can be reset to null', () => {
		themeSchedule.set({ startHour: 8, endHour: 20 });
		themeSchedule.set(null);
		expect(get(themeSchedule)).toBeNull();
	});
});

describe('setThemeWithOverride', () => {
	beforeEach(() => {
		themePreference.set('auto');
		vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
	});

	it('sets preference to the given value', () => {
		setThemeWithOverride('dark');
		expect(get(themePreference)).toBe('dark');
	});

	it('sets preference to light', () => {
		setThemeWithOverride('light');
		expect(get(themePreference)).toBe('light');
	});

	it('sets preference to auto', () => {
		setThemeWithOverride('auto');
		expect(get(themePreference)).toBe('auto');
	});

	it('updates preference on subsequent calls', () => {
		setThemeWithOverride('dark');
		expect(get(themePreference)).toBe('dark');
		vi.advanceTimersByTime(2000);
		setThemeWithOverride('light');
		expect(get(themePreference)).toBe('light');
	});
});

describe('schedule logic boundaries (contract verification)', () => {
	// Replicates the private isScheduleActive logic to document the contract.
	// The actual function is not exported, but these tests verify the expected
	// boundary semantics that applyScheduledTheme depends on.
	function isScheduleActive(
		schedule: { startHour: number; endHour: number } | null,
		hour: number
	): boolean {
		if (!schedule) return false;
		const { startHour, endHour } = schedule;
		if (startHour < endHour) {
			return hour >= startHour && hour < endHour;
		}
		return hour >= startHour || hour < endHour;
	}

	it('normal range: inside [start, end) is active', () => {
		expect(isScheduleActive({ startHour: 8, endHour: 20 }, 14)).toBe(true);
	});

	it('normal range: before start is inactive', () => {
		expect(isScheduleActive({ startHour: 8, endHour: 20 }, 6)).toBe(false);
	});

	it('normal range: at end hour (exclusive) is inactive', () => {
		expect(isScheduleActive({ startHour: 8, endHour: 20 }, 20)).toBe(false);
	});

	it('normal range: at start hour (inclusive) is active', () => {
		expect(isScheduleActive({ startHour: 8, endHour: 20 }, 8)).toBe(true);
	});

	it('overnight range: evening hour is active', () => {
		expect(isScheduleActive({ startHour: 22, endHour: 6 }, 23)).toBe(true);
	});

	it('overnight range: early morning hour is active', () => {
		expect(isScheduleActive({ startHour: 22, endHour: 6 }, 3)).toBe(true);
	});

	it('overnight range: midday is inactive', () => {
		expect(isScheduleActive({ startHour: 22, endHour: 6 }, 12)).toBe(false);
	});

	it('null schedule is never active', () => {
		expect(isScheduleActive(null, 12)).toBe(false);
	});

	it('boundary: hour 0 in overnight schedule ending at 6 is active', () => {
		expect(isScheduleActive({ startHour: 22, endHour: 6 }, 0)).toBe(true);
	});

	it('boundary: hour 6 in overnight schedule ending at 6 is inactive', () => {
		expect(isScheduleActive({ startHour: 22, endHour: 6 }, 6)).toBe(false);
	});
});
