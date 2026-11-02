import { describe, it, expect, beforeEach } from 'vitest';
import {
	checkBadgeCondition,
	computeStreak,
	BADGE_CATALOG,
	type BadgeCondition
} from './gamification-store.js';
import type { Flashcard, ReviewLog } from './types.js';

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
	return {
		id: 'card-1',
		deckId: 'deck-1',
		front: 'Q',
		back: 'A',
		tags: [],
		interval: 1,
		repetitions: 0,
		easeFactor: 2.5,
		dueDate: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		...overrides
	};
}

function makeLog(date: Date, cardId = 'card-1'): ReviewLog {
	return {
		id: `log-${Math.random()}`,
		cardId,
		quality: 4,
		reviewedAt: date.toISOString()
	};
}

describe('computeStreak', () => {
	it('returns 0 when no logs exist', () => {
		expect(computeStreak([], new Date())).toBe(0);
	});

	it('returns 1 when only today has reviews', () => {
		const now = new Date('2025-06-15T12:00:00.000Z');
		const logs = [makeLog(new Date('2025-06-15T10:00:00.000Z'))];
		expect(computeStreak(logs, now)).toBe(1);
	});

	it('returns consecutive streak count', () => {
		const now = new Date('2025-06-15T12:00:00.000Z');
		const logs = [
			makeLog(new Date('2025-06-15T10:00:00.000Z')),
			makeLog(new Date('2025-06-14T10:00:00.000Z')),
			makeLog(new Date('2025-06-13T10:00:00.000Z'))
		];
		expect(computeStreak(logs, now)).toBe(3);
	});

	it('breaks streak when gap > 1 day', () => {
		const now = new Date('2025-06-15T12:00:00.000Z');
		const logs = [
			makeLog(new Date('2025-06-15T10:00:00.000Z')),
			makeLog(new Date('2025-06-13T10:00:00.000Z')), // gap
			makeLog(new Date('2025-06-12T10:00:00.000Z'))
		];
		expect(computeStreak(logs, now)).toBe(1);
	});

	it('returns 0 when last review was > 2 days ago', () => {
		const now = new Date('2025-06-15T12:00:00.000Z');
		const logs = [makeLog(new Date('2025-06-12T10:00:00.000Z'))];
		expect(computeStreak(logs, now)).toBe(0);
	});

	it('handles multiple reviews on same day as single streak day', () => {
		const now = new Date('2025-06-15T12:00:00.000Z');
		const logs = [
			makeLog(new Date('2025-06-15T10:00:00.000Z')),
			makeLog(new Date('2025-06-15T11:00:00.000Z')),
			makeLog(new Date('2025-06-14T10:00:00.000Z'))
		];
		expect(computeStreak(logs, now)).toBe(2);
	});
});

describe('checkBadgeCondition', () => {
	describe('first_review', () => {
		const condition: BadgeCondition = { type: 'first_review' };

		it('returns false when no logs', () => {
			expect(checkBadgeCondition(condition, [], [], new Date())).toBe(false);
		});

		it('returns true when at least one log exists', () => {
			const logs = [makeLog(new Date())];
			expect(checkBadgeCondition(condition, [], logs, new Date())).toBe(true);
		});
	});

	describe('streak_days', () => {
		const condition: BadgeCondition = { type: 'streak_days', days: 7 };

		it('returns false when streak < 7', () => {
			const now = new Date('2025-06-15T12:00:00.000Z');
			const logs = [
				makeLog(new Date('2025-06-15T10:00:00.000Z')),
				makeLog(new Date('2025-06-14T10:00:00.000Z')),
				makeLog(new Date('2025-06-13T10:00:00.000Z'))
			];
			expect(checkBadgeCondition(condition, [], logs, now)).toBe(false);
		});

		it('returns true when streak >= 7', () => {
			const now = new Date(2025, 5, 15, 12, 0, 0);
			const logs = Array.from({ length: 7 }, (_, i) =>
				makeLog(new Date(2025, 5, 15 - i, 10, 0, 0))
			);
			expect(checkBadgeCondition(condition, [], logs, now)).toBe(true);
		});
	});

	describe('total_reviews', () => {
		const condition: BadgeCondition = { type: 'total_reviews', count: 100 };

		it('returns false when count < 100', () => {
			const logs = Array.from({ length: 50 }, () => makeLog(new Date()));
			expect(checkBadgeCondition(condition, [], logs, new Date())).toBe(false);
		});

		it('returns true when count >= 100', () => {
			const logs = Array.from({ length: 100 }, () => makeLog(new Date()));
			expect(checkBadgeCondition(condition, [], logs, new Date())).toBe(true);
		});
	});

	describe('master_scheduler', () => {
		const condition: BadgeCondition = {
			type: 'master_scheduler',
			minCards: 50,
			minIntervalDays: 30
		};

		it('returns false when fewer than 50 cards have interval > 30', () => {
			const cards = Array.from({ length: 30 }, (_, i) =>
				makeCard({ id: `card-${i}`, interval: 45 })
			);
			expect(checkBadgeCondition(condition, cards, [], new Date())).toBe(false);
		});

		it('returns true when 50+ cards have interval > 30', () => {
			const cards = Array.from({ length: 50 }, (_, i) =>
				makeCard({ id: `card-${i}`, interval: 45 })
			);
			expect(checkBadgeCondition(condition, cards, [], new Date())).toBe(true);
		});

		it('excludes cards with interval <= 30', () => {
			const cards = [
				...Array.from({ length: 30 }, (_, i) => makeCard({ id: `card-${i}`, interval: 45 })),
				...Array.from({ length: 20 }, (_, i) => makeCard({ id: `card-${i + 30}`, interval: 20 }))
			];
			expect(checkBadgeCondition(condition, cards, [], new Date())).toBe(false);
		});
	});

	describe('time_of_day', () => {
		it('early_bird: returns true when hour < 8', () => {
			const condition: BadgeCondition = { type: 'time_of_day', beforeHour: 8 };
			const now = new Date(2025, 5, 15, 7, 30, 0);
			expect(checkBadgeCondition(condition, [], [], now)).toBe(true);
		});

		it('early_bird: returns false when hour >= 8', () => {
			const condition: BadgeCondition = { type: 'time_of_day', beforeHour: 8 };
			const now = new Date(2025, 5, 15, 9, 0, 0);
			expect(checkBadgeCondition(condition, [], [], now)).toBe(false);
		});

		it('night_owl: returns true when hour >= 22', () => {
			const condition: BadgeCondition = { type: 'time_of_day', afterHour: 22 };
			const now = new Date(2025, 5, 15, 22, 30, 0);
			expect(checkBadgeCondition(condition, [], [], now)).toBe(true);
		});

		it('night_owl: returns false when hour < 22', () => {
			const condition: BadgeCondition = { type: 'time_of_day', afterHour: 22 };
			const now = new Date(2025, 5, 15, 20, 0, 0);
			expect(checkBadgeCondition(condition, [], [], now)).toBe(false);
		});
	});
});

describe('BADGE_CATALOG', () => {
	it('contains all required badges', () => {
		const badgeIds = BADGE_CATALOG.map((b) => b.id);
		expect(badgeIds).toContain('first_steps');
		expect(badgeIds).toContain('streak_7');
		expect(badgeIds).toContain('century_club');
		expect(badgeIds).toContain('master_scheduler');
		expect(badgeIds).toContain('early_bird');
		expect(badgeIds).toContain('night_owl');
	});

	it('each badge has required fields', () => {
		for (const badge of BADGE_CATALOG) {
			expect(badge.id).toBeTruthy();
			expect(badge.nameKey).toBeTruthy();
			expect(badge.descKey).toBeTruthy();
			expect(badge.icon).toBeTruthy();
			expect(badge.condition).toBeDefined();
		}
	});
});
