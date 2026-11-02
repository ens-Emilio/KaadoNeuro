import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { fontSize, increaseFontSize, decreaseFontSize } from './font-size-store.js';

describe('font-size-store', () => {
	it('defaults to 100%', () => {
		expect(get(fontSize)).toBe(100);
	});

	it('increases font size by 10% up to 150%', () => {
		fontSize.set(100);
		increaseFontSize();
		expect(get(fontSize)).toBe(110);
		increaseFontSize();
		expect(get(fontSize)).toBe(120);
		fontSize.set(140);
		increaseFontSize();
		expect(get(fontSize)).toBe(150);
		increaseFontSize(); // Should not exceed 150
		expect(get(fontSize)).toBe(150);
	});

	it('decreases font size by 10% down to 80%', () => {
		fontSize.set(100);
		decreaseFontSize();
		expect(get(fontSize)).toBe(90);
		decreaseFontSize();
		expect(get(fontSize)).toBe(80);
		decreaseFontSize(); // Should not go below 80
		expect(get(fontSize)).toBe(80);
	});
});
