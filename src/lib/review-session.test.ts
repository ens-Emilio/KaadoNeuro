import { describe, it, expect, vi } from 'vitest';
import { processReview, getDueCards, sessionProgress } from './review-session.js';
import type { Flashcard } from './types.js';

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
	return {
		id: 'c1',
		deckId: 'd1',
		front: 'Frente',
		back: 'Verso',
		tags: [],
		interval: 0,
		repetitions: 0,
		easeFactor: 2.5,
		dueDate: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		...overrides
	};
}

describe('processReview', () => {
	it('retorna card atualizado e log para qualidade 0 (errei)', () => {
		const card = makeCard({ interval: 5, repetitions: 3, easeFactor: 2.5 });
		const genId = vi.fn(() => 'log-1');

		const result = processReview(card, 0, genId);

		expect(result.updatedCard.id).toBe('c1');
		expect(result.updatedCard.interval).toBe(1); // SM-2 reseta para 1 em quality < 3
		expect(result.updatedCard.repetitions).toBe(0);
		expect(result.newLog.quality).toBe(0);
		expect(result.newLog.cardId).toBe('c1');
		expect(result.newLog.id).toBe('log-1');
		expect(genId).toHaveBeenCalledOnce();
	});

	it('mantém progressão para qualidade 3 (difícil)', () => {
		const card = makeCard({ interval: 1, repetitions: 1, easeFactor: 2.5 });
		const result = processReview(card, 3, () => 'log-2');

		expect(result.updatedCard.repetitions).toBe(2);
		expect(result.updatedCard.interval).toBeGreaterThanOrEqual(1);
		expect(result.newLog.quality).toBe(3);
	});

	it('aumenta intervalo para qualidade 4 (bom)', () => {
		const card = makeCard({ interval: 1, repetitions: 1, easeFactor: 2.5 });
		const result = processReview(card, 4, () => 'log-3');

		expect(result.updatedCard.repetitions).toBe(2);
		expect(result.updatedCard.interval).toBeGreaterThan(1);
		expect(result.newLog.quality).toBe(4);
	});

	it('aumenta intervalo e ease factor para qualidade 5 (fácil)', () => {
		const card = makeCard({ interval: 1, repetitions: 1, easeFactor: 2.5 });
		const result = processReview(card, 5, () => 'log-4');

		expect(result.updatedCard.repetitions).toBe(2);
		expect(result.updatedCard.easeFactor).toBeGreaterThan(2.5);
		expect(result.newLog.quality).toBe(5);
	});

	it('lança erro para qualidade fora do intervalo 0-5', () => {
		const card = makeCard();
		expect(() => processReview(card, -1, () => 'x')).toThrow(/Qualidade inválida/);
		expect(() => processReview(card, 6, () => 'x')).toThrow(/Qualidade inválida/);
		expect(() => processReview(card, 2.5, () => 'x')).toThrow(/Qualidade inválida/);
	});
});

describe('getDueCards', () => {
	it('filtra apenas cards do deck e vencidos', () => {
		const now = new Date('2026-01-15T12:00:00Z');
		const cards: Flashcard[] = [
			makeCard({ id: '1', deckId: 'd1', dueDate: '2026-01-14T00:00:00Z' }),
			makeCard({ id: '2', deckId: 'd1', dueDate: '2026-01-16T00:00:00Z' }), // futuro
			makeCard({ id: '3', deckId: 'd2', dueDate: '2026-01-14T00:00:00Z' }), // outro deck
			makeCard({ id: '4', deckId: 'd1', dueDate: '2026-01-15T12:00:00Z' }) // agora
		];

		const result = getDueCards(cards, 'd1', now);

		expect(result.map((c) => c.id)).toEqual(['1', '4']);
	});

	it('ordena por dueDate ascendente (mais urgente primeiro)', () => {
		const now = new Date('2026-01-20T12:00:00Z');
		const cards: Flashcard[] = [
			makeCard({ id: 'a', deckId: 'd1', dueDate: '2026-01-18T00:00:00Z' }),
			makeCard({ id: 'b', deckId: 'd1', dueDate: '2026-01-10T00:00:00Z' }),
			makeCard({ id: 'c', deckId: 'd1', dueDate: '2026-01-15T00:00:00Z' })
		];

		const result = getDueCards(cards, 'd1', now);

		expect(result.map((c) => c.id)).toEqual(['b', 'c', 'a']);
	});

	it('retorna array vazio quando não há cards vencidos', () => {
		const result = getDueCards([], 'd1');
		expect(result).toEqual([]);
	});

	it('filtra por activeTags quando fornecido', () => {
		const now = new Date('2026-01-15T12:00:00Z');
		const cards: Flashcard[] = [
			makeCard({ id: '1', deckId: 'd1', dueDate: '2026-01-14T00:00:00Z', tags: ['math'] }),
			makeCard({ id: '2', deckId: 'd1', dueDate: '2026-01-14T00:00:00Z', tags: ['science'] }),
			makeCard({ id: '3', deckId: 'd1', dueDate: '2026-01-14T00:00:00Z', tags: ['math', 'science'] }),
			makeCard({ id: '4', deckId: 'd1', dueDate: '2026-01-14T00:00:00Z', tags: [] })
		];

		const result = getDueCards(cards, 'd1', now, ['math']);
		expect(result.map((c) => c.id)).toEqual(['1', '3']);
	});
});

describe('sessionProgress', () => {
	it('calcula porcentagem correta', () => {
		expect(sessionProgress(10, 5)).toBe(50);
		expect(sessionProgress(10, 0)).toBe(100);
		expect(sessionProgress(10, 10)).toBe(0);
	});

	it('retorna 0 quando totalAtStart é 0 ou negativo', () => {
		expect(sessionProgress(0, 0)).toBe(0);
		expect(sessionProgress(-1, 0)).toBe(0);
	});
});