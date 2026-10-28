import { describe, expect, it } from 'vitest';
import { safeParseArray } from './storage-schema.js';
import { cardsArraySchema, decksArraySchema, reviewLogsArraySchema } from './storage-schema.js';

describe('storage migration', () => {
	it('returns an empty fallback for corrupt JSON input', () => {
		expect(safeParseArray([], decksArraySchema, 'decks')).toEqual([]);
	});

	it('drops invalid cards while preserving valid ones', () => {
		const valid = {
			id: '11111111-1111-4111-8111-111111111111',
			deckId: '22222222-2222-4222-8222-222222222222',
			front: 'Q',
			back: 'A',
			tags: [],
			interval: 0,
			repetitions: 0,
			easeFactor: 2.5,
			dueDate: new Date().toISOString(),
			createdAt: new Date().toISOString()
		};
		const parsed = safeParseArray([valid, { id: 'broken' }], cardsArraySchema, 'cards');
		expect(parsed).toEqual([valid]);
	});

	it('defaults missing tags on persisted cards', () => {
		const card = {
			id: '11111111-1111-4111-8111-111111111111',
			deckId: '22222222-2222-4222-8222-222222222222',
			front: 'Q',
			back: 'A',
			interval: 0,
			repetitions: 0,
			easeFactor: 2.5,
			dueDate: new Date().toISOString(),
			createdAt: new Date().toISOString()
		};
		const parsed = safeParseArray([card], cardsArraySchema, 'cards');
		expect(parsed[0]?.tags).toEqual([]);
	});

	it('rejects non-array persisted roots', () => {
		expect(safeParseArray({}, reviewLogsArraySchema, 'reviewLogs')).toEqual([]);
	});
});
