import { describe, expect, it } from 'vitest';
import { decodeDeckShare, encodeDeckShare, buildShareUrl, MAX_SHARE_CARDS } from './deck-share.js';
import type { Deck, Flashcard } from './types.js';

const deck: Deck = {
	id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
	name: 'Neuroanatomia',
	description: 'Primeiro bloco',
	createdAt: '2025-01-01T00:00:00.000Z'
};

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
	return {
		id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
		deckId: deck.id,
		front: 'Qual o nervo?',
		back: 'Vago',
		tags: ['nc'],
		interval: 2,
		repetitions: 1,
		easeFactor: 2.5,
		dueDate: '2025-01-02T00:00:00.000Z',
		createdAt: '2025-01-01T00:00:00.000Z',
		...overrides
	};
}

let counter = 0;
const nextId = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;

describe('deck sharing', () => {
	it('round-trips a deck with its cards and tags', () => {
		const token = encodeDeckShare(deck, [makeCard()]);
		const decoded = decodeDeckShare(token, nextId);

		expect(decoded).not.toBeNull();
		expect(decoded!.deck.name).toBe('Neuroanatomia');
		expect(decoded!.deck.description).toBe('Primeiro bloco');
		expect(decoded!.cards).toHaveLength(1);
		expect(decoded!.cards[0].front).toBe('Qual o nervo?');
		expect(decoded!.cards[0].tags).toEqual(['nc']);
	});

	it('assigns fresh ids so a shared deck cannot overwrite a local one', () => {
		const token = encodeDeckShare(deck, [makeCard()]);
		const decoded = decodeDeckShare(token, nextId)!;

		expect(decoded.deck.id).not.toBe(deck.id);
		expect(decoded.cards[0].deckId).toBe(decoded.deck.id);
		expect(decoded.cards[0].id).not.toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
	});

	it('starts shared cards due immediately with no review history', () => {
		const decoded = decodeDeckShare(encodeDeckShare(deck, [makeCard()]), nextId)!;

		expect(decoded.cards[0].interval).toBe(0);
		expect(decoded.cards[0].repetitions).toBe(0);
		expect(decoded.cards[0].easeFactor).toBe(2.5);
	});

	it('rejects garbage instead of throwing', () => {
		expect(decodeDeckShare('not-base64-!!', nextId)).toBeNull();
		expect(decodeDeckShare('', nextId)).toBeNull();
		expect(decodeDeckShare(btoa('{"v":2}'), nextId)).toBeNull();
	});

	it('rejects a payload whose cards lack content', () => {
		const token = btoa(JSON.stringify({ v: 1, n: 'Deck', c: [['', 'back']] }))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');
		expect(decodeDeckShare(token, nextId)).toBeNull();
	});

	it('caps the number of cards carried by a link', () => {
		const many = Array.from({ length: MAX_SHARE_CARDS + 5 }, (_, i) =>
			makeCard({ id: `card-${i}`, front: `Q${i}` })
		);
		const decoded = decodeDeckShare(encodeDeckShare(deck, many), nextId)!;
		expect(decoded.cards).toHaveLength(MAX_SHARE_CARDS);
	});

	it('builds an absolute URL rooted at the origin', () => {
		const url = buildShareUrl('https://kaado.example', deck, [makeCard()]);
		expect(url.startsWith('https://kaado.example/?share=')).toBe(true);
	});
});
