import { describe, it, expect } from 'vitest';
import { buildDeckExport, mergeDeckImport } from './deck-export.js';
import type { Deck, Flashcard } from './types.js';

let idCounter = 0;
function fakeId(): string {
	return `00000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}`;
}

function resetIdCounter() {
	idCounter = 0;
}

const sampleDeck: Deck = {
	id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
	name: 'Test Deck',
	description: 'A test',
	createdAt: '2025-01-01T00:00:00.000Z'
};

const sampleCards: Flashcard[] = [
	{
		id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
		deckId: sampleDeck.id,
		front: 'What is Svelte?',
		back: 'A compiler-based UI framework',
		tags: ['svelte'],
		interval: 3,
		repetitions: 2,
		easeFactor: 2.6,
		dueDate: '2025-01-10T00:00:00.000Z',
		createdAt: '2025-01-01T00:00:00.000Z'
	},
	{
		id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
		deckId: sampleDeck.id,
		front: 'What is Zod?',
		back: 'A TypeScript-first schema validation library',
		tags: [],
		interval: 0,
		repetitions: 0,
		easeFactor: 2.5,
		dueDate: '2025-01-01T00:00:00.000Z',
		createdAt: '2025-01-01T00:00:00.000Z'
	}
];

describe('buildDeckExport', () => {
	it('returns null for non-existent deck', () => {
		const result = buildDeckExport('nonexistent', [sampleDeck], sampleCards, fakeId);
		expect(result).toBeNull();
	});

	it('exports deck with fresh IDs and correct card count', () => {
		resetIdCounter();
		const result = buildDeckExport(sampleDeck.id, [sampleDeck], sampleCards, fakeId);
		expect(result).not.toBeNull();
		expect(result!.deck.id).not.toBe(sampleDeck.id);
		expect(result!.cards.length).toBe(2);
		for (const card of result!.cards) {
			expect(card.deckId).toBe(result!.deck.id);
			expect(card.id).not.toBe(sampleCards.find((c) => c.front === card.front)?.id);
		}
	});

	it('preserves card content across export', () => {
		resetIdCounter();
		const result = buildDeckExport(sampleDeck.id, [sampleDeck], sampleCards, fakeId);
		expect(result!.deck.name).toBe('Test Deck');
		expect(result!.cards[0].front).toBe('What is Svelte?');
		expect(result!.cards[1].back).toBe('A TypeScript-first schema validation library');
	});
});

describe('mergeDeckImport', () => {
	it('throws on invalid JSON structure', () => {
		expect(() => mergeDeckImport({ invalid: true }, fakeId)).toThrow('Invalid deck file format');
		expect(() => mergeDeckImport(null, fakeId)).toThrow('Invalid deck file format');
		expect(() => mergeDeckImport('not json', fakeId)).toThrow('Invalid deck file format');
	});

	it('imports valid bundle with fresh IDs', () => {
		resetIdCounter();
		const exported = buildDeckExport(sampleDeck.id, [sampleDeck], sampleCards, fakeId);
		// Do NOT reset counter — import must generate distinct IDs from export
		const result = mergeDeckImport(exported, fakeId);
		expect(result.deck.id).not.toBe(sampleDeck.id);
		expect(result.deck.id).not.toBe(exported!.deck.id);
		expect(result.cards.length).toBe(2);
		for (const card of result.cards) {
			expect(card.deckId).toBe(result.deck.id);
		}
	});

	it('round-trip produces distinct valid deck', () => {
		resetIdCounter();
		const exported = buildDeckExport(sampleDeck.id, [sampleDeck], sampleCards, fakeId);
		// Do NOT reset counter — import must generate distinct IDs from export
		const imported = mergeDeckImport(exported, fakeId);

		expect(imported.deck.id).not.toBe(sampleDeck.id);
		expect(imported.cards.length).toBe(sampleCards.length);
		expect(imported.deck.name).toBe(sampleDeck.name);
		const originalIds = new Set([sampleDeck.id, ...sampleCards.map((c) => c.id)]);
		expect(originalIds.has(imported.deck.id)).toBe(false);
		for (const card of imported.cards) {
			expect(originalIds.has(card.id)).toBe(false);
		}
	});
});
