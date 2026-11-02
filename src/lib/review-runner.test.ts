import { describe, expect, it } from 'vitest';
import { createReviewRunner } from './review-runner.svelte.js';
import type { Flashcard } from './types.js';

describe('review-runner keyboard handling', () => {
	it('creates a runner with correct initial state', () => {
		const mockCard: Flashcard = {
			id: 'test-card-1',
			deckId: 'test-deck',
			front: 'Front',
			back: 'Back',
			tags: [],
			dueDate: new Date().toISOString(),
			interval: 1,
			repetitions: 0,
			easeFactor: 2.5,
			createdAt: new Date().toISOString()
		};

		const runner = createReviewRunner({
			scope: { kind: 'all' },
			cards: () => [mockCard],
			limit: () => 0,
			now: () => new Date()
		});

		expect(runner.isFlipped).toBe(false);
		expect(runner.currentCard?.id).toBe('test-card-1');
		expect(runner.remaining).toBe(1);
	});

	it('flips card correctly', () => {
		const mockCard: Flashcard = {
			id: 'test-card-1',
			deckId: 'test-deck',
			front: 'Front',
			back: 'Back',
			tags: [],
			dueDate: new Date().toISOString(),
			interval: 1,
			repetitions: 0,
			easeFactor: 2.5,
			createdAt: new Date().toISOString()
		};

		const runner = createReviewRunner({
			scope: { kind: 'all' },
			cards: () => [mockCard],
			limit: () => 0,
			now: () => new Date()
		});

		runner.flip();
		expect(runner.isFlipped).toBe(true);
	});

	it('handles empty card list gracefully', () => {
		const runner = createReviewRunner({
			scope: { kind: 'all' },
			cards: () => [],
			limit: () => 0,
			now: () => new Date()
		});

		expect(runner.currentCard).toBeUndefined();
		expect(runner.remaining).toBe(0);
	});
});
