import { describe, expect, it } from 'vitest';
import { clock, localDateKey } from './clock-store.js';

describe('clock-store', () => {
	it('uses local calendar days, not UTC', () => {
		const local = new Date(2026, 0, 2, 23, 30);
		expect(localDateKey(local)).toBe('2026-01-02');
	});

	it('pads month and day', () => {
		expect(localDateKey(new Date(2026, 8, 5, 12))).toBe('2026-09-05');
	});

	it('emits the current date immediately', () => {
		let value: Date | undefined;
		const stop = clock.subscribe((next) => {
			value = next;
		});
		stop();
		expect(value).toBeInstanceOf(Date);
	});
});
