import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	_patterns,
	haptic,
	hapticCardFlip,
	hapticCorrect,
	hapticWrong,
	hapticBadgeUnlock,
	hapticSessionComplete
} from './haptics.js';

describe('haptic patterns', () => {
	it('cardFlip is [10]', () => {
		expect(_patterns.cardFlip).toEqual([10]);
	});

	it('correct is [10, 30, 10]', () => {
		expect(_patterns.correct).toEqual([10, 30, 10]);
	});

	it('wrong is [30, 50, 30]', () => {
		expect(_patterns.wrong).toEqual([30, 50, 30]);
	});

	it('badgeUnlock is celebration pattern', () => {
		expect(_patterns.badgeUnlock).toEqual([10, 30, 10, 30, 10, 50, 10]);
	});

	it('sessionComplete is [10, 30, 10, 30, 10]', () => {
		expect(_patterns.sessionComplete).toEqual([10, 30, 10, 30, 10]);
	});
});

describe('haptic feature detection', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('calls navigator.vibrate when supported', () => {
		const mockVibrate = vi.fn();
		Object.defineProperty(globalThis, 'navigator', {
			value: { vibrate: mockVibrate },
			writable: true,
			configurable: true
		});

		haptic([10, 20]);
		expect(mockVibrate).toHaveBeenCalledWith([10, 20]);
	});

	it('does not throw when navigator.vibrate is absent', () => {
		Object.defineProperty(globalThis, 'navigator', {
			value: {},
			writable: true,
			configurable: true
		});

		expect(() => haptic([10])).not.toThrow();
	});

	it('does not throw when navigator is undefined', () => {
		const original = globalThis.navigator;
		Object.defineProperty(globalThis, 'navigator', {
			value: undefined,
			writable: true,
			configurable: true
		});

		expect(() => haptic([10])).not.toThrow();

		Object.defineProperty(globalThis, 'navigator', {
			value: original,
			writable: true,
			configurable: true
		});
	});
});

describe('typed haptic functions call correct patterns', () => {
	let mockVibrate: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockVibrate = vi.fn();
		Object.defineProperty(globalThis, 'navigator', {
			value: { vibrate: mockVibrate },
			writable: true,
			configurable: true
		});
		// Enable haptics for these tests (default is true)
	});

	it('hapticCardFlip uses cardFlip pattern', () => {
		hapticCardFlip();
		expect(mockVibrate).toHaveBeenCalledWith([10]);
	});

	it('hapticCorrect uses correct pattern', () => {
		hapticCorrect();
		expect(mockVibrate).toHaveBeenCalledWith([10, 30, 10]);
	});

	it('hapticWrong uses wrong pattern', () => {
		hapticWrong();
		expect(mockVibrate).toHaveBeenCalledWith([30, 50, 30]);
	});

	it('hapticBadgeUnlock uses badgeUnlock pattern', () => {
		hapticBadgeUnlock();
		expect(mockVibrate).toHaveBeenCalledWith([10, 30, 10, 30, 10, 50, 10]);
	});

	it('hapticSessionComplete uses sessionComplete pattern', () => {
		hapticSessionComplete();
		expect(mockVibrate).toHaveBeenCalledWith([10, 30, 10, 30, 10]);
	});
});
