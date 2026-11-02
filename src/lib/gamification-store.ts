import { derived } from 'svelte/store';
import { persisted } from 'svelte-local-storage-store';
import { z } from 'zod';
import { reviewLogs } from './stores.js';
import type { Flashcard, ReviewLog } from './types.js';
import { hapticBadgeUnlock } from './haptics.js';

const XP_PER_CARD = 10;
const STREAK_BONUS_XP = 50;

// ── Badge Catalog ──────────────────────────────────────────────────────────────

export interface BadgeDefinition {
	id: string;
	nameKey: string;
	descKey: string;
	icon: string; // emoji
	condition: BadgeCondition;
}

export type BadgeCondition =
	| { type: 'first_review' }
	| { type: 'streak_days'; days: number }
	| { type: 'total_reviews'; count: number }
	| { type: 'master_scheduler'; minCards: number; minIntervalDays: number }
	| { type: 'time_of_day'; beforeHour?: number; afterHour?: number }
	| { type: 'perfect_session'; minCards: number }
	| { type: 'deck_mastery'; minCardsInDeck: number; minIntervalDays: number }
	| { type: 'tag_explorer'; uniqueTags: number }
	| { type: 'speed_demon'; maxSecondsPerCard: number; minCards: number }
	| { type: 'marathon'; singleSessionCards: number }
	| { type: 'consistency'; weeksWithMinReviews: number; minReviewsPerWeek: number }
	| { type: 'collector'; totalCards: number }
	| { type: 'quality_streak'; consecutivePerfect: number };

// ── Badge Factory Functions ────────────────────────────────────────────────────

function makeStreakBadges(): BadgeDefinition[] {
	const tiers = [
		3, 7, 14, 21, 30, 45, 60, 90, 120, 150, 180, 210, 250, 300, 365, 500, 730, 1000, 1200, 1500
	];
	return tiers.map((days) => ({
		id: `streak_${days}`,
		nameKey: `badge.streak_${days}`,
		descKey: `badge.streak_${days}_desc`,
		icon: days >= 365 ? '🏆' : days >= 90 ? '🔥' : days >= 30 ? '⚡' : '📆',
		condition: { type: 'streak_days' as const, days }
	}));
}

function makeReviewCountBadges(): BadgeDefinition[] {
	const tiers = [
		10, 25, 50, 100, 200, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000,
		50000, 75000, 100000, 200000, 500000
	];
	return tiers.map((count) => ({
		id: `reviews_${count}`,
		nameKey: `badge.reviews_${count}`,
		descKey: `badge.reviews_${count}_desc`,
		icon: count >= 10000 ? '👑' : count >= 1000 ? '💎' : count >= 500 ? '🌟' : '📝',
		condition: { type: 'total_reviews' as const, count }
	}));
}

function makeCollectorBadges(): BadgeDefinition[] {
	const tiers = [
		5, 10, 20, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000,
		15000
	];
	return tiers.map((total) => ({
		id: `collector_${total}`,
		nameKey: `badge.collector_${total}`,
		descKey: `badge.collector_${total}_desc`,
		icon: total >= 5000 ? '🏛️' : total >= 1000 ? '📚' : total >= 100 ? '🗂️' : '📇',
		condition: { type: 'collector' as const, totalCards: total }
	}));
}

function makeTagExplorerBadges(): BadgeDefinition[] {
	const tiers = [2, 3, 5, 7, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300];
	return tiers.map((tags) => ({
		id: `tag_explorer_${tags}`,
		nameKey: `badge.tag_explorer_${tags}`,
		descKey: `badge.tag_explorer_${tags}_desc`,
		icon: tags >= 100 ? '🌍' : tags >= 50 ? '🗺️' : tags >= 20 ? '🏷️' : '🔖',
		condition: { type: 'tag_explorer' as const, uniqueTags: tags }
	}));
}

function makeDeckMasteryBadges(): BadgeDefinition[] {
	const tiers = [
		{ cards: 5, interval: 3 },
		{ cards: 10, interval: 7 },
		{ cards: 15, interval: 7 },
		{ cards: 25, interval: 14 },
		{ cards: 30, interval: 14 },
		{ cards: 50, interval: 30 },
		{ cards: 75, interval: 30 },
		{ cards: 100, interval: 30 },
		{ cards: 150, interval: 45 },
		{ cards: 200, interval: 60 },
		{ cards: 300, interval: 60 },
		{ cards: 500, interval: 90 },
		{ cards: 750, interval: 120 },
		{ cards: 1000, interval: 180 }
	];
	return tiers.map(({ cards, interval }) => ({
		id: `deck_mastery_${cards}_${interval}`,
		nameKey: `badge.deck_mastery_${cards}_${interval}`,
		descKey: `badge.deck_mastery_${cards}_${interval}_desc`,
		icon: cards >= 500 ? '🎓' : cards >= 100 ? '📖' : '📘',
		condition: { type: 'deck_mastery' as const, minCardsInDeck: cards, minIntervalDays: interval }
	}));
}

function makePerfectSessionBadges(): BadgeDefinition[] {
	const tiers = [
		3, 5, 7, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500
	];
	return tiers.map((minCards) => ({
		id: `perfect_session_${minCards}`,
		nameKey: `badge.perfect_session_${minCards}`,
		descKey: `badge.perfect_session_${minCards}_desc`,
		icon: minCards >= 100 ? '✨' : minCards >= 50 ? '💫' : '⭐',
		condition: { type: 'perfect_session' as const, minCards }
	}));
}

function makeMarathonBadges(): BadgeDefinition[] {
	const tiers = [
		10, 15, 20, 25, 30, 40, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1500
	];
	return tiers.map((cards) => ({
		id: `marathon_${cards}`,
		nameKey: `badge.marathon_${cards}`,
		descKey: `badge.marathon_${cards}_desc`,
		icon: cards >= 500 ? '🏅' : cards >= 200 ? '🏃' : '🚶',
		condition: { type: 'marathon' as const, singleSessionCards: cards }
	}));
}

function makeConsistencyBadges(): BadgeDefinition[] {
	const tiers = [
		{ weeks: 1, reviews: 3 },
		{ weeks: 2, reviews: 7 },
		{ weeks: 3, reviews: 10 },
		{ weeks: 4, reviews: 14 },
		{ weeks: 6, reviews: 18 },
		{ weeks: 8, reviews: 20 },
		{ weeks: 10, reviews: 22 },
		{ weeks: 12, reviews: 25 },
		{ weeks: 16, reviews: 28 },
		{ weeks: 20, reviews: 30 },
		{ weeks: 24, reviews: 32 },
		{ weeks: 30, reviews: 35 },
		{ weeks: 40, reviews: 40 },
		{ weeks: 52, reviews: 45 },
		{ weeks: 60, reviews: 50 },
		{ weeks: 72, reviews: 55 },
		{ weeks: 80, reviews: 60 },
		{ weeks: 90, reviews: 65 },
		{ weeks: 100, reviews: 70 },
		{ weeks: 104, reviews: 75 }
	];
	return tiers.map(({ weeks, reviews }) => ({
		id: `consistency_${weeks}w_${reviews}`,
		nameKey: `badge.consistency_${weeks}w_${reviews}`,
		descKey: `badge.consistency_${weeks}w_${reviews}_desc`,
		icon: weeks >= 52 ? '📅' : weeks >= 12 ? '🗓️' : '📋',
		condition: {
			type: 'consistency' as const,
			weeksWithMinReviews: weeks,
			minReviewsPerWeek: reviews
		}
	}));
}

function makeQualityStreakBadges(): BadgeDefinition[] {
	const tiers = [
		3, 5, 7, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600, 750,
		1000, 1500
	];
	return tiers.map((consecutive) => ({
		id: `quality_streak_${consecutive}`,
		nameKey: `badge.quality_streak_${consecutive}`,
		descKey: `badge.quality_streak_${consecutive}_desc`,
		icon: consecutive >= 100 ? '💯' : consecutive >= 50 ? '🎯' : '✅',
		condition: { type: 'quality_streak' as const, consecutivePerfect: consecutive }
	}));
}

function makeSpeedDemonBadges(): BadgeDefinition[] {
	const tiers = [
		{ sec: 60, cards: 3 },
		{ sec: 45, cards: 5 },
		{ sec: 40, cards: 8 },
		{ sec: 35, cards: 10 },
		{ sec: 30, cards: 12 },
		{ sec: 25, cards: 15 },
		{ sec: 22, cards: 18 },
		{ sec: 20, cards: 20 },
		{ sec: 18, cards: 25 },
		{ sec: 15, cards: 30 },
		{ sec: 12, cards: 40 },
		{ sec: 10, cards: 50 },
		{ sec: 8, cards: 60 },
		{ sec: 6, cards: 75 },
		{ sec: 5, cards: 100 },
		{ sec: 4, cards: 120 }
	];
	return tiers.map(({ sec, cards }) => ({
		id: `speed_demon_${sec}s_${cards}`,
		nameKey: `badge.speed_demon_${sec}s_${cards}`,
		descKey: `badge.speed_demon_${sec}s_${cards}_desc`,
		icon: sec <= 10 ? '⚡' : sec <= 15 ? '🏎️' : '🚀',
		condition: { type: 'speed_demon' as const, maxSecondsPerCard: sec, minCards: cards }
	}));
}

// ── Generated Catalog ──────────────────────────────────────────────────────────
// ── Generated Catalog ──────────────────────────────────────────────────────────

const GENERATED_BADGES: readonly BadgeDefinition[] = [
	...makeStreakBadges(),
	...makeReviewCountBadges(),
	...makeCollectorBadges(),
	...makeTagExplorerBadges(),
	...makeDeckMasteryBadges(),
	...makePerfectSessionBadges(),
	...makeMarathonBadges(),
	...makeConsistencyBadges(),
	...makeQualityStreakBadges(),
	...makeSpeedDemonBadges()
];

const LEGACY_BADGES: readonly BadgeDefinition[] = [
	{
		id: 'first_steps',
		nameKey: 'badge.first_steps',
		descKey: 'badge.first_steps_desc',
		icon: '🌱',
		condition: { type: 'first_review' }
	},
	{
		id: 'master_scheduler',
		nameKey: 'badge.master_scheduler',
		descKey: 'badge.master_scheduler_desc',
		icon: '📅',
		condition: { type: 'master_scheduler', minCards: 50, minIntervalDays: 30 }
	},
	{
		id: 'early_bird',
		nameKey: 'badge.early_bird',
		descKey: 'badge.early_bird_desc',
		icon: '🐦',
		condition: { type: 'time_of_day', beforeHour: 8 }
	},
	{
		id: 'night_owl',
		nameKey: 'badge.night_owl',
		descKey: 'badge.night_owl_desc',
		icon: '🦉',
		condition: { type: 'time_of_day', afterHour: 22 }
	}
];

export const BADGE_CATALOG: readonly BadgeDefinition[] = [...LEGACY_BADGES, ...GENERATED_BADGES];

// ── Persisted State ────────────────────────────────────────────────────────────

export const gamificationSchema = z.object({
	bonusXp: z.number().int().nonnegative(),
	lastStreakDate: z.string().optional(),
	unlockedBadges: z.record(z.string(), z.string())
});

export type GamificationState = z.infer<typeof gamificationSchema>;

export const gamification = persisted<GamificationState>(
	'kaadoneuro_gamification',
	{ bonusXp: 0, unlockedBadges: {} },
	{
		serializer: {
			stringify: (value) => JSON.stringify(value),
			parse: (raw) => {
				try {
					const parsed = JSON.parse(raw ?? '{}');
					const result = gamificationSchema.safeParse(parsed);
					if (result.success) {
						return {
							...result.data,
							unlockedBadges: result.data.unlockedBadges ?? {}
						};
					}
					return { bonusXp: 0, unlockedBadges: {} };
				} catch {
					return { bonusXp: 0, unlockedBadges: {} };
				}
			}
		}
	}
);

/** Total XP = (review count × 10) + persisted bonus XP. */
export const xp = derived(
	[reviewLogs, gamification],
	([$logs, $gam]) => $logs.length * XP_PER_CARD + $gam.bonusXp
);

/** Level = floor(sqrt(xp / 100)). */
export const level = derived(xp, ($xp) => Math.floor(Math.sqrt($xp / 100)));

// ── Streak Bonus ───────────────────────────────────────────────────────────────

function getLocalDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Awards the daily streak bonus XP if not yet awarded today.
 * Idempotent: safe to call multiple times per day.
 */
export function awardStreakBonus(): void {
	const today = getLocalDateString(new Date());
	gamification.update((state) => {
		if (state.lastStreakDate === today) return state;
		return {
			...state,
			bonusXp: state.bonusXp + STREAK_BONUS_XP,
			lastStreakDate: today
		};
	});
}

// ── Badge Evaluation ───────────────────────────────────────────────────────────

/**
 * Compute current streak from review logs (mirrors stores.ts logic).
 * Pure function for testability.
 */
export function computeStreak(logs: ReviewLog[], now: Date): number {
	if (logs.length === 0) return 0;

	const uniqueDates = Array.from(
		new Set(logs.map((l) => getLocalDateString(new Date(l.reviewedAt))))
	).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

	if (uniqueDates.length === 0) return 0;

	const today = getLocalDateString(now);
	const yesterday = getLocalDateString(new Date(now.getTime() - 86400000));

	if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

	let streak = 1;
	let lastDateStr = uniqueDates[0];

	for (let i = 1; i < uniqueDates.length; i++) {
		const currentDateStr = uniqueDates[i];
		const diffTime = Math.abs(new Date(lastDateStr).getTime() - new Date(currentDateStr).getTime());
		const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
		if (diffDays === 1) {
			streak++;
			lastDateStr = currentDateStr;
		} else {
			break;
		}
	}

	return streak;
}

/**
 * Check whether a single badge condition is met.
 * Pure function — no store access, fully testable.
 */
export function checkBadgeCondition(
	condition: BadgeCondition,
	cards: Flashcard[],
	logs: ReviewLog[],
	now: Date
): boolean {
	switch (condition.type) {
		case 'first_review':
			return logs.length > 0;
		case 'streak_days':
			return computeStreak(logs, now) >= condition.days;
		case 'total_reviews':
			return logs.length >= condition.count;
		case 'master_scheduler':
			return (
				cards.filter((c) => c.interval > condition.minIntervalDays).length >= condition.minCards
			);
		case 'time_of_day': {
			const hour = now.getHours();
			if (condition.beforeHour !== undefined && hour < condition.beforeHour) return true;
			if (condition.afterHour !== undefined && hour >= condition.afterHour) return true;
			return false;
		}
		case 'perfect_session': {
			// Sessão perfeita: pelo menos minCards revisões com quality >= 4 nas últimas 24h
			const cutoff = now.getTime() - 86400000;
			const recentLogs = logs.filter((l) => new Date(l.reviewedAt).getTime() > cutoff);
			const perfectCount = recentLogs.filter((l) => l.quality >= 4).length;
			return perfectCount >= condition.minCards;
		}
		case 'deck_mastery': {
			// Domínio de deck: pelo menos minCardsInDeck cards em um único deck com interval >= minIntervalDays
			const deckCounts = new Map<string, number>();
			for (const card of cards) {
				if (card.interval >= condition.minIntervalDays) {
					deckCounts.set(card.deckId, (deckCounts.get(card.deckId) ?? 0) + 1);
				}
			}
			for (const count of deckCounts.values()) {
				if (count >= condition.minCardsInDeck) return true;
			}
			return false;
		}
		case 'tag_explorer': {
			// Explorador de tags: cards criados cobrem pelo menos uniqueTags tags distintas
			const tagSet = new Set<string>();
			for (const card of cards) {
				if (Array.isArray(card.tags)) {
					for (const tag of card.tags) {
						if (typeof tag === 'string' && tag.trim().length > 0) {
							tagSet.add(tag.trim());
						}
					}
				}
			}
			return tagSet.size >= condition.uniqueTags;
		}
		case 'speed_demon': {
			// Demônio da velocidade: revisou minCards cards com média <= maxSecondsPerCard por card
			// Estimativa: tempo total entre primeira e última review / número de reviews
			if (logs.length < condition.minCards) return false;
			const sorted = [...logs].sort(
				(a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime()
			);
			const first = new Date(sorted[0].reviewedAt).getTime();
			const last = new Date(sorted[sorted.length - 1].reviewedAt).getTime();
			const durationSec = (last - first) / 1000;
			const avgSec = durationSec / sorted.length;
			return avgSec <= condition.maxSecondsPerCard;
		}
		case 'marathon': {
			// Maratona: pelo menos singleSessionCards reviews em uma única sessão (janela de 2h)
			if (logs.length < condition.singleSessionCards) return false;
			const sorted = [...logs].sort(
				(a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime()
			);
			const WINDOW_MS = 2 * 60 * 60 * 1000; // 2 horas
			let windowStart = 0;
			for (let i = 0; i < sorted.length; i++) {
				while (
					new Date(sorted[i].reviewedAt).getTime() -
						new Date(sorted[windowStart].reviewedAt).getTime() >
					WINDOW_MS
				) {
					windowStart++;
				}
				if (i - windowStart + 1 >= condition.singleSessionCards) return true;
			}
			return false;
		}
		case 'consistency': {
			// Consistência: pelo menos weeksWithMinReviews semanas com >= minReviewsPerWeek reviews
			if (logs.length === 0) return false;
			const weekCounts = new Map<string, number>();
			for (const log of logs) {
				const d = new Date(log.reviewedAt);
				// Chave da semana: ISO year-week
				const jan1 = new Date(d.getFullYear(), 0, 1);
				const weekNum = Math.ceil(
					((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
				);
				const key = `${d.getFullYear()}-W${weekNum}`;
				weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
			}
			let qualifyingWeeks = 0;
			for (const count of weekCounts.values()) {
				if (count >= condition.minReviewsPerWeek) qualifyingWeeks++;
			}
			return qualifyingWeeks >= condition.weeksWithMinReviews;
		}
		case 'collector': {
			// Colecionador: total de cards criados >= totalCards
			return cards.length >= condition.totalCards;
		}
		case 'quality_streak': {
			// Sequência de qualidade: consecutivePerfect reviews consecutivos com quality >= 4
			if (logs.length === 0) return false;
			const sorted = [...logs].sort(
				(a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime()
			);
			let currentRun = 0;
			for (const log of sorted) {
				if (log.quality >= 4) {
					currentRun++;
					if (currentRun >= condition.consecutivePerfect) return true;
				} else {
					currentRun = 0;
				}
			}
			return false;
		}
	}
}

/**
 * Evaluate all badges and unlock any newly earned ones.
 * Returns array of newly unlocked badge IDs (for toast notifications).
 */
export function evaluateBadges(
	cards: Flashcard[],
	logs: ReviewLog[],
	now: Date = new Date()
): string[] {
	const newlyUnlocked: string[] = [];

	gamification.update((state) => {
		const unlocked = { ...state.unlockedBadges };
		let changed = false;

		for (const badge of BADGE_CATALOG) {
			if (unlocked[badge.id]) continue;
			if (checkBadgeCondition(badge.condition, cards, logs, now)) {
				unlocked[badge.id] = now.toISOString();
				newlyUnlocked.push(badge.id);
				changed = true;
			}
		}

		if (!changed) return state;
		return { ...state, unlockedBadges: unlocked };
	});

	if (newlyUnlocked.length > 0) {
		hapticBadgeUnlock();
	}

	return newlyUnlocked;
}
