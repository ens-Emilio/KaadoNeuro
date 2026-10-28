import { describe, it, expect } from 'vitest';
import { calculateReview } from './sm2.js';
import type { Flashcard } from './types.js';

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
	return {
		id: 'c1',
		front: 'F',
		back: 'B',
		interval: 0,
		repetitions: 0,
		easeFactor: 2.5,
		dueDate: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		deckId: 'd1',
		tags: [],
		...overrides
	};
}

describe('calculateReview - SM-2', () => {
	it('primeira resposta correta (q=3) define interval=1 e repetitions=1', () => {
		const card = makeCard({ repetitions: 0, interval: 0 });
		const result = calculateReview(card, 3);
		expect(result.interval).toBe(1);
		expect(result.repetitions).toBe(1);
		// SM-2 atualiza EF mesmo na primeira revisão: EF' = 2.5 + (0.1 - 2*(0.08+2*0.02)) = 2.36
		expect(result.easeFactor).toBeCloseTo(2.36, 2);
	});

	it('segunda resposta correta (q=4) define interval=6', () => {
		const card = makeCard({ repetitions: 1, interval: 1 });
		const result = calculateReview(card, 4);
		expect(result.interval).toBe(6);
		expect(result.repetitions).toBe(2);
	});

	it('terceira resposta correta multiplica interval pelo easeFactor', () => {
		const card = makeCard({ repetitions: 2, interval: 6, easeFactor: 2.5 });
		const result = calculateReview(card, 5);
		expect(result.interval).toBe(15); // 6 * 2.5 = 15
		expect(result.repetitions).toBe(3);
	});

	it('resposta incorreta (q<3) reseta repetitions e interval para 0 e 1', () => {
		const card = makeCard({ repetitions: 5, interval: 30, easeFactor: 2.8 });
		for (const q of [0, 1, 2]) {
			const result = calculateReview(card, q);
			expect(result.repetitions).toBe(0);
			expect(result.interval).toBe(1);
		}
	});

	it('easeFactor nunca fica abaixo de 1.3 mesmo com qualidade 0 repetida', () => {
		let card = makeCard({ easeFactor: 1.3 });
		for (let i = 0; i < 10; i++) {
			const result = calculateReview(card, 0);
			expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
			card = { ...card, ...result };
		}
	});

	it('easeFactor aumenta com qualidade 5 e diminui com qualidade 3', () => {
		const base = makeCard({ easeFactor: 2.5 });
		const up = calculateReview(base, 5);
		const down = calculateReview(base, 3);
		expect(up.easeFactor).toBeGreaterThan(2.5);
		expect(down.easeFactor).toBeLessThan(2.5);
	});

	it('dueDate é sempre uma data futura válida em ISO', () => {
		const card = makeCard();
		const before = new Date();
		const result = calculateReview(card, 4);
		const after = new Date();
		const due = new Date(result.dueDate);
		expect(due.getTime()).toBeGreaterThanOrEqual(before.getTime());
		expect(due.getTime()).toBeLessThanOrEqual(after.getTime() + 6 * 86400000);
		expect(result.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('qualidade fora do range 0-5 não quebra (comportamento defensivo)', () => {
		const card = makeCard();
		expect(() => calculateReview(card, -1)).not.toThrow();
		expect(() => calculateReview(card, 10)).not.toThrow();
	});
});
