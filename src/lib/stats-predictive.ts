/**
 * Predictive statistics: forgetting curve recall probability and aggregate metrics.
 * Pure functions — no store or DOM dependencies.
 */
import type { Flashcard, ReviewLog } from './types.js';

/**
 * Estimate recall probability using an exponential forgetting curve.
 *
 * Model: P(t) = 0.9 ^ (t / S)
 * where t = elapsed days since last review, S = stability proxy (card interval).
 * This approximates SM-2/FSRS behavior without requiring full model state.
 *
 * @param intervalDays - Card's current review interval (stability proxy)
 * @param elapsedDays - Days since the card was last reviewed
 * @returns Probability of recall [0, 1]
 */
export function estimateRecallProbability(intervalDays: number, elapsedDays: number): number {
	if (intervalDays <= 0) return elapsedDays <= 0 ? 1 : 0;
	if (elapsedDays <= 0) return 1;
	const p = Math.pow(0.9, elapsedDays / intervalDays);
	return Math.max(0, Math.min(1, p));
}

/**
 * Compute average retention rate across all cards based on their current
 * interval and time since last review.
 */
export function computeAverageRetention(cards: Flashcard[], now: Date): number {
	if (cards.length === 0) return 0;

	// Build map of last review date per card
	let sum = 0;
	let count = 0;

	for (const card of cards) {
		const due = new Date(card.dueDate);
		const lastReview = new Date(due.getTime() - card.interval * 86400000);
		const elapsed = (now.getTime() - lastReview.getTime()) / 86400000;
		sum += estimateRecallProbability(card.interval, Math.max(0, elapsed));
		count++;
	}

	return count > 0 ? sum / count : 0;
}

/**
 * Count cards predicted to be due for review within the next N days.
 * Uses each card's dueDate directly.
 */
export function predictReviewsDue(cards: Flashcard[], daysAhead: number, now: Date): number {
	const cutoff = new Date(now.getTime() + daysAhead * 86400000);
	let count = 0;
	for (const card of cards) {
		const due = new Date(card.dueDate);
		if (due <= cutoff) count++;
	}
	return count;
}

/**
 * Compute current streak (consecutive days with at least one review).
 * Uses local date strings to respect user timezone.
 */
export function computeCurrentStreak(logs: ReviewLog[], now: Date): number {
	if (logs.length === 0) return 0;

	const toDateStr = (d: Date) => {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	};

	const uniqueDates = Array.from(new Set(logs.map((l) => toDateStr(new Date(l.reviewedAt))))).sort(
		(a, b) => (b > a ? 1 : b < a ? -1 : 0)
	);

	if (uniqueDates.length === 0) return 0;

	const today = toDateStr(now);
	const yesterday = toDateStr(new Date(now.getTime() - 86400000));

	if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

	let streak = 1;
	for (let i = 1; i < uniqueDates.length; i++) {
		const prev = new Date(uniqueDates[i - 1]);
		const curr = new Date(uniqueDates[i]);
		const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
		if (diffDays === 1) {
			streak++;
		} else {
			break;
		}
	}
	return streak;
}

/**
 * Compute longest ever streak of consecutive review days.
 */
export function computeLongestStreak(logs: ReviewLog[]): number {
	if (logs.length === 0) return 0;

	const toDateStr = (d: Date) => {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	};

	const uniqueDates = Array.from(new Set(logs.map((l) => toDateStr(new Date(l.reviewedAt))))).sort(
		(a, b) => (a > b ? 1 : a < b ? -1 : 0)
	);

	if (uniqueDates.length === 0) return 0;

	let longest = 1;
	let current = 1;

	for (let i = 1; i < uniqueDates.length; i++) {
		const prev = new Date(uniqueDates[i - 1]);
		const curr = new Date(uniqueDates[i]);
		const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
		if (diffDays === 1) {
			current++;
			if (current > longest) longest = current;
		} else {
			current = 1;
		}
	}
	return longest;
}

/**
 * Aggregate predictive statistics snapshot.
 */
export interface PredictiveStats {
	averageRetention: number;
	reviewsDueNext7Days: number;
	currentStreak: number;
	longestStreak: number;
	totalCardsReviewed: number;
}

/**
 * Compute all predictive stats in one pass-friendly call.
 */
export function computePredictiveStats(
	cards: Flashcard[],
	logs: ReviewLog[],
	now: Date
): PredictiveStats {
	const reviewedCardIds = new Set(logs.map((l) => l.cardId));
	return {
		averageRetention: computeAverageRetention(cards, now),
		reviewsDueNext7Days: predictReviewsDue(cards, 7, now),
		currentStreak: computeCurrentStreak(logs, now),
		longestStreak: computeLongestStreak(logs),
		totalCardsReviewed: reviewedCardIds.size
	};
}
