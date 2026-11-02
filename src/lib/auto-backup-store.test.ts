import { describe, it, expect } from 'vitest';
import { isBackupDue, type AutoBackupSettings } from './auto-backup-store.js';

function settings(overrides: Partial<AutoBackupSettings> = {}): AutoBackupSettings {
	return {
		enabled: true,
		intervalDays: 7,
		lastBackupAt: null,
		...overrides
	};
}

describe('isBackupDue', () => {
	it('returns false when disabled', () => {
		expect(isBackupDue(settings({ enabled: false }), new Date())).toBe(false);
	});

	it('returns true when enabled and no previous backup', () => {
		expect(isBackupDue(settings({ lastBackupAt: null }), new Date())).toBe(true);
	});

	it('returns true when last backup exceeds interval', () => {
		const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
		expect(isBackupDue(settings({ lastBackupAt: eightDaysAgo }), new Date())).toBe(true);
	});

	it('returns false when last backup is within interval', () => {
		const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
		expect(isBackupDue(settings({ lastBackupAt: threeDaysAgo }), new Date())).toBe(false);
	});

	it('returns true at exact interval boundary', () => {
		const exactlySevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
		expect(isBackupDue(settings({ lastBackupAt: exactlySevenDaysAgo }), new Date())).toBe(true);
	});

	it('respects custom interval days', () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
		expect(isBackupDue(settings({ intervalDays: 1, lastBackupAt: twoDaysAgo }), new Date())).toBe(
			true
		);
		expect(isBackupDue(settings({ intervalDays: 30, lastBackupAt: twoDaysAgo }), new Date())).toBe(
			false
		);
	});

	it('treats invalid lastBackupAt as needing backup', () => {
		expect(isBackupDue(settings({ lastBackupAt: 'not-a-date' }), new Date())).toBe(true);
	});

	it('works with frozen time for deterministic testing', () => {
		const fixedNow = new Date('2025-06-15T12:00:00.000Z');
		const sixDaysBefore = new Date('2025-06-09T12:00:00.000Z').toISOString();
		const sevenDaysBefore = new Date('2025-06-08T12:00:00.000Z').toISOString();

		expect(isBackupDue(settings({ lastBackupAt: sixDaysBefore }), fixedNow)).toBe(false);
		expect(isBackupDue(settings({ lastBackupAt: sevenDaysBefore }), fixedNow)).toBe(true);
	});
});
