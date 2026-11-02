import { describe, it, expect } from 'vitest';
import { calculateFsrsReview, qualityToRating, Rating } from './fsrs.js';
import type { Flashcard, FsrsState } from './types.js';

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

describe('FSRS-5 Algorithm', () => {
	describe('qualityToRating mapping', () => {
		it('maps quality 0 and 1 to Again', () => {
			expect(qualityToRating(0)).toBe(Rating.Again);
			expect(qualityToRating(1)).toBe(Rating.Again);
		});

		it('maps quality 2 to Hard', () => {
			expect(qualityToRating(2)).toBe(Rating.Hard);
		});

		it('maps quality 3 to Good', () => {
			expect(qualityToRating(3)).toBe(Rating.Good);
		});

		it('maps quality 4 and 5 to Easy', () => {
			expect(qualityToRating(4)).toBe(Rating.Easy);
			expect(qualityToRating(5)).toBe(Rating.Easy);
		});
	});

	describe('state transitions', () => {
		it('New card transitions to Learning on any rating', () => {
			const card = makeCard();
			const result = calculateFsrsReview(card, 3);
			expect(result.fsrsState.state).toBe('Learning');
			expect(result.fsrsState.reps).toBe(1);
		});

		it('Learning card transitions to Review on Good rating', () => {
			const card = makeCard({
				fsrsState: {
					stability: 1,
					difficulty: 5,
					elapsedDays: 0,
					scheduledDays: 1,
					reps: 1,
					lapses: 0,
					state: 'Learning',
					lastReview: new Date(Date.now() - 86400000).toISOString()
				}
			});
			const result = calculateFsrsReview(card, 3);
			expect(result.fsrsState.state).toBe('Review');
		});

		it('Learning card stays in Learning on Again rating', () => {
			const card = makeCard({
				fsrsState: {
					stability: 1,
					difficulty: 5,
					elapsedDays: 0,
					scheduledDays: 1,
					reps: 1,
					lapses: 0,
					state: 'Learning',
					lastReview: new Date(Date.now() - 86400000).toISOString()
				}
			});
			const result = calculateFsrsReview(card, 0);
			expect(result.fsrsState.state).toBe('Learning');
		});

		it('Review card transitions to Relearning on Again rating', () => {
			const card = makeCard({
				fsrsState: {
					stability: 10,
					difficulty: 5,
					elapsedDays: 10,
					scheduledDays: 10,
					reps: 5,
					lapses: 0,
					state: 'Review',
					lastReview: new Date(Date.now() - 10 * 86400000).toISOString()
				}
			});
			const result = calculateFsrsReview(card, 0);
			expect(result.fsrsState.state).toBe('Relearning');
			expect(result.fsrsState.lapses).toBe(1);
		});

		it('Review card stays in Review on Good rating', () => {
			const card = makeCard({
				fsrsState: {
					stability: 10,
					difficulty: 5,
					elapsedDays: 10,
					scheduledDays: 10,
					reps: 5,
					lapses: 0,
					state: 'Review',
					lastReview: new Date(Date.now() - 10 * 86400000).toISOString()
				}
			});
			const result = calculateFsrsReview(card, 3);
			expect(result.fsrsState.state).toBe('Review');
			expect(result.fsrsState.lapses).toBe(0);
		});

		it('Relearning card transitions to Review on Good rating', () => {
			const card = makeCard({
				fsrsState: {
					stability: 5,
					difficulty: 5,
					elapsedDays: 1,
					scheduledDays: 1,
					reps: 6,
					lapses: 1,
					state: 'Relearning',
					lastReview: new Date(Date.now() - 86400000).toISOString()
				}
			});
			const result = calculateFsrsReview(card, 3);
			expect(result.fsrsState.state).toBe('Review');
		});
	});

	describe('interval calculations', () => {
		it('first review with Again returns short interval', () => {
			const card = makeCard();
			const result = calculateFsrsReview(card, 0);
			expect(result.interval).toBeGreaterThanOrEqual(1);
			expect(result.interval).toBeLessThanOrEqual(5);
		});

		it('first review with Good returns interval around 2-3 days', () => {
			const card = makeCard();
			const result = calculateFsrsReview(card, 3);
			expect(result.interval).toBeGreaterThanOrEqual(1);
			expect(result.interval).toBeLessThanOrEqual(10);
		});

		it('first review with Easy returns longer interval', () => {
			const card = makeCard();
			const goodResult = calculateFsrsReview(card, 3);
			const easyResult = calculateFsrsReview(card, 5);
			expect(easyResult.interval).toBeGreaterThan(goodResult.interval);
		});

		it('interval increases with successful reviews', () => {
			let card = makeCard();
			const result1 = calculateFsrsReview(card, 3);
			card = { ...card, ...result1 };

			const result2 = calculateFsrsReview(card, 3);
			card = { ...card, ...result2 };

			const result3 = calculateFsrsReview(card, 3);
			expect(result3.interval).toBeGreaterThanOrEqual(result2.interval);
		});
	});

	describe('difficulty bounds', () => {
		it('difficulty stays within [1, 10] bounds', () => {
			let card = makeCard();
			for (let i = 0; i < 20; i++) {
				const result = calculateFsrsReview(card, 0);
				expect(result.fsrsState.difficulty).toBeGreaterThanOrEqual(1);
				expect(result.fsrsState.difficulty).toBeLessThanOrEqual(10);
				card = { ...card, ...result };
			}
		});

		it('difficulty increases on Again rating', () => {
			const card = makeCard({
				fsrsState: {
					stability: 10,
					difficulty: 5,
					elapsedDays: 10,
					scheduledDays: 10,
					reps: 5,
					lapses: 0,
					state: 'Review',
					lastReview: new Date(Date.now() - 10 * 86400000).toISOString()
				}
			});
			const result = calculateFsrsReview(card, 0);
			expect(result.fsrsState.difficulty).toBeGreaterThan(5);
		});

		it('difficulty decreases on Easy rating', () => {
			const card = makeCard({
				fsrsState: {
					stability: 10,
					difficulty: 7,
					elapsedDays: 10,
					scheduledDays: 10,
					reps: 5,
					lapses: 0,
					state: 'Review',
					lastReview: new Date(Date.now() - 10 * 86400000).toISOString()
				}
			});
			const result = calculateFsrsReview(card, 5);
			expect(result.fsrsState.difficulty).toBeLessThan(7);
		});
	});

	describe('stability updates', () => {
		it('stability is positive after first review', () => {
			const card = makeCard();
			const result = calculateFsrsReview(card, 3);
			expect(result.fsrsState.stability).toBeGreaterThan(0);
		});

		it('stability increases on successful recall', () => {
			const card = makeCard({
				fsrsState: {
					stability: 10,
					difficulty: 5,
					elapsedDays: 10,
					scheduledDays: 10,
					reps: 5,
					lapses: 0,
					state: 'Review',
					lastReview: new Date(Date.now() - 10 * 86400000).toISOString()
				}
			});
			const result = calculateFsrsReview(card, 3);
			expect(result.fsrsState.stability).toBeGreaterThan(10);
		});

		it('stability decreases on forget (Again in Review)', () => {
			const card = makeCard({
				fsrsState: {
					stability: 10,
					difficulty: 5,
					elapsedDays: 10,
					scheduledDays: 10,
					reps: 5,
					lapses: 0,
					state: 'Review',
					lastReview: new Date(Date.now() - 10 * 86400000).toISOString()
				}
			});
			const result = calculateFsrsReview(card, 0);
			expect(result.fsrsState.stability).toBeLessThan(10);
		});
	});

	describe('due date calculation', () => {
		it('dueDate is always a future ISO date string', () => {
			const card = makeCard();
			const before = new Date();
			const result = calculateFsrsReview(card, 3);
			const after = new Date();
			const due = new Date(result.dueDate);

			expect(due.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(due.getTime()).toBeLessThanOrEqual(after.getTime() + 365 * 86400000);
			expect(result.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});

		it('dueDate respects interval calculation', () => {
			const card = makeCard();
			const result = calculateFsrsReview(card, 3);
			const due = new Date(result.dueDate);
			const now = new Date();
			const daysDiff = Math.round((due.getTime() - now.getTime()) / 86400000);

			expect(daysDiff).toBe(result.interval);
		});
	});
});
