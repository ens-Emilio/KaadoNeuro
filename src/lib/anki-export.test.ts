import { describe, it, expect } from 'vitest';
import { exportToAnkiCsv } from './anki-export.js';
import type { Deck, Flashcard } from './types.js';

const sampleDeck: Deck = {
	id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
	name: 'Test Deck',
	createdAt: '2025-01-01T00:00:00.000Z'
};

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
	return {
		id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
		deckId: sampleDeck.id,
		front: 'What is Svelte?',
		back: 'A compiler-based UI framework',
		tags: ['svelte', 'ui'],
		interval: 3,
		repetitions: 2,
		easeFactor: 2.6,
		dueDate: '2025-01-10T00:00:00.000Z',
		createdAt: '2025-01-01T00:00:00.000Z',
		...overrides
	};
}

describe('exportToAnkiCsv', () => {
	it('includes UTF-8 BOM', () => {
		const csv = exportToAnkiCsv(sampleDeck, []);
		expect(csv.charCodeAt(0)).toBe(0xfeff);
	});

	it('generates correct header', () => {
		const csv = exportToAnkiCsv(sampleDeck, []);
		expect(csv).toContain('Front,Back,Tags,Deck');
	});

	it('exports cards with tags space-separated', () => {
		const csv = exportToAnkiCsv(sampleDeck, [makeCard()]);
		expect(csv).toContain('svelte ui');
		expect(csv).toContain('Test Deck');
	});

	it('escapes fields containing commas', () => {
		const card = makeCard({ front: 'Hello, world' });
		const csv = exportToAnkiCsv(sampleDeck, [card]);
		expect(csv).toContain('"Hello, world"');
	});

	it('escapes fields containing quotes', () => {
		const card = makeCard({ front: 'Say "hello"' });
		const csv = exportToAnkiCsv(sampleDeck, [card]);
		expect(csv).toContain('"Say ""hello"""');
	});

	it('escapes fields containing newlines', () => {
		const card = makeCard({ back: 'Line one\nLine two' });
		const csv = exportToAnkiCsv(sampleDeck, [card]);
		expect(csv).toContain('"Line one\nLine two"');
	});

	it('handles empty deck', () => {
		const csv = exportToAnkiCsv(sampleDeck, []);
		const lines = csv
			.replace(/^\uFEFF/, '')
			.trim()
			.split('\n');
		expect(lines).toHaveLength(1); // header only
	});

	it('handles multiple cards', () => {
		const cards = [
			makeCard({ id: '1', front: 'Q1', back: 'A1' }),
			makeCard({ id: '2', front: 'Q2', back: 'A2' })
		];
		const csv = exportToAnkiCsv(sampleDeck, cards);
		const lines = csv
			.replace(/^\uFEFF/, '')
			.trim()
			.split('\n');
		expect(lines).toHaveLength(3); // header + 2 rows
	});
});
