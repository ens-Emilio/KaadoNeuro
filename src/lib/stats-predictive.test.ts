import { describe, it, expect } from 'vitest';
import {
	estimateRecallProbability,
	computeAverageRetention,
	predictReviewsDue,
	computeCurrentStreak,
	computeLongestStreak,
	computePredictiveStats
} from './stats-predictive.js';
import type { Flashcard, ReviewLog } from './types.js';

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
	return {
		id: 'c1',
		deckId: 'd1',
		front: 'f',
		back: 'b',
		tags: [],
		interval: 7,
		repetitions: 3,
		easeFactor: 2.5,
		dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
		createdAt: new Date().toISOString(),
		...overrides
	};
}

function makeLog(cardId: string, daysAgo: number, quality = 4): ReviewLog {
	return {
		id: `l-${cardId}-${daysAgo}`,
		cardId,
		quality,
		reviewedAt: new Date(Date.now() - daysAgo * 86400000).toISOString()
	};
}

describe('estimateRecallProbability', () => {
	it('returns 1 when elapsed is 0', () => {
		expect(estimateRecallProbability(7, 0)).toBe(1);
	});

	it('returns ~0.9 when elapsed equals interval', () => {
		const p = estimateRecallProbability(7, 7);
		expect(p).toBeCloseTo(0.9, 2);
	});

	it('decreases as elapsed increases beyond interval', () => {
		const p1 = estimateRecallProbability(7, 7);
		const p2 = estimateRecallProbability(7, 14);
		expect(p2).toBeLessThan(p1);
	});

	it('returns 0 for zero interval with positive elapsed', () => {
		expect(estimateRecallProbability(0, 1)).toBe(0);
	});

	it('returns 1 for zero interval and zero elapsed', () => {
		expect(estimateRecallProbability(0, 0)).toBe(1);
	});

	it('clamps result to [0, 1]', () => {
		expect(estimateRecallProbability(1, 1000)).toBeGreaterThanOrEqual(0);
		expect(estimateRecallProbability(1000, 0)).toBeLessThanOrEqual(1);
	});
});

describe('computeAverageRetention', () => {
	it('returns 0 for empty cards array', () => {
		expect(computeAverageRetention([], new Date())).toBe(0);
	});

	it('computes average across multiple cards', () => {
		const now = new Date();
		const cards = [
			makeCard({
				id: 'c1',
				interval: 7,
				dueDate: new Date(now.getTime() + 7 * 86400000).toISOString()
			}),
			makeCard({
				id: 'c2',
				interval: 14,
				dueDate: new Date(now.getTime() + 14 * 86400000).toISOString()
			})
		];
		const retention = computeAverageRetention(cards, now);
		expect(retention).toBeGreaterThan(0);
		expect(retention).toBeLessThanOrEqual(1);
	});
});

describe('predictReviewsDue', () => {
	it('counts cards due within the window', () => {
		const now = new Date();
		const cards = [
			makeCard({ id: 'c1', dueDate: new Date(now.getTime() + 2 * 86400000).toISOString() }),
			makeCard({ id: 'c2', dueDate: new Date(now.getTime() + 5 * 86400000).toISOString() }),
			makeCard({ id: 'c3', dueDate: new Date(now.getTime() + 10 * 86400000).toISOString() })
		];
		expect(predictReviewsDue(cards, 7, now)).toBe(2);
	});

	it('includes already overdue cards', () => {
		const now = new Date();
		const cards = [
			makeCard({ id: 'c1', dueDate: new Date(now.getTime() - 1 * 86400000).toISOString() })
		];
		expect(predictReviewsDue(cards, 7, now)).toBe(1);
	});

	it('returns 0 when no cards are due', () => {
		const now = new Date();
		const cards = [
			makeCard({ id: 'c1', dueDate: new Date(now.getTime() + 30 * 86400000).toISOString() })
		];
		expect(predictReviewsDue(cards, 7, now)).toBe(0);
	});
});

describe('computeCurrentStreak', () => {
	it('returns 0 for no logs', () => {
		expect(computeCurrentStreak([], new Date())).toBe(0);
	});

	it('returns 1 when only today has reviews', () => {
		const logs = [makeLog('c1', 0)];
		expect(computeCurrentStreak(logs, new Date())).toBe(1);
	});

	it('counts consecutive days including today', () => {
		const logs = [makeLog('c1', 0), makeLog('c1', 1), makeLog('c1', 2)];
		expect(computeCurrentStreak(logs, new Date())).toBe(3);
	});

	it('returns 0 when last review was more than 1 day ago', () => {
		const logs = [makeLog('c1', 3)];
		expect(computeCurrentStreak(logs, new Date())).toBe(0);
	});

	it('continues streak if last review was yesterday', () => {
		const logs = [makeLog('c1', 1), makeLog('c1', 2)];
		expect(computeCurrentStreak(logs, new Date())).toBe(2);
	});
});

describe('computeLongestStreak', () => {
	it('returns 0 for no logs', () => {
		expect(computeLongestStreak([])).toBe(0);
	});

	it('finds longest consecutive run', () => {
		const logs = [
			makeLog('c1', 10),
			makeLog('c1', 9),
			makeLog('c1', 8),
			makeLog('c1', 5),
			makeLog('c1', 4)
		];
		expect(computeLongestStreak(logs)).toBe(3);
	});

	it('handles single review day', () => {
		expect(computeLongestStreak([makeLog('c1', 5)])).toBe(1);
	});
});

describe('computePredictiveStats', () => {
	it('returns zeros for empty data', () => {
		const stats = computePredictiveStats([], [], new Date());
		expect(stats.averageRetention).toBe(0);
		expect(stats.reviewsDueNext7Days).toBe(0);
		expect(stats.currentStreak).toBe(0);
		expect(stats.longestStreak).toBe(0);
		expect(stats.totalCardsReviewed).toBe(0);
	});

	it('counts unique reviewed cards', () => {
		const logs = [makeLog('c1', 0), makeLog('c1', 1), makeLog('c2', 0)];
		const stats = computePredictiveStats([], logs, new Date());
		expect(stats.totalCardsReviewed).toBe(2);
	});
});
