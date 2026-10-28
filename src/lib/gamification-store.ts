import { derived } from 'svelte/store';
import { persisted } from 'svelte-local-storage-store';
import { z } from 'zod';
import { reviewLogs } from './stores.js';

const XP_PER_CARD = 10;
const STREAK_BONUS_XP = 50;

export const gamificationSchema = z.object({
	bonusXp: z.number().int().nonnegative(),
	lastStreakDate: z.string().optional()
});

export type GamificationState = z.infer<typeof gamificationSchema>;

/**
 * Persisted gamification state: only stores bonus XP (streak awards)
 * and the last date a streak bonus was claimed.
 * Base XP is always derived from reviewLogs to stay consistent.
 */
export const gamification = persisted<GamificationState>(
	'kaadoneuro_gamification',
	{ bonusXp: 0 },
	{
		serializer: {
			stringify: (value) => JSON.stringify(value),
			parse: (raw) => {
				try {
					const parsed = JSON.parse(raw ?? '{}');
					const result = gamificationSchema.safeParse(parsed);
					return result.success ? result.data : { bonusXp: 0 };
				} catch {
					return { bonusXp: 0 };
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

function getLocalDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Awards the daily streak bonus XP if not yet awarded today.
 * Call this when a review completes and streak > 0.
 * Idempotent: safe to call multiple times per day.
 */
export function awardStreakBonus(): void {
	const today = getLocalDateString(new Date());
	gamification.update((state) => {
		if (state.lastStreakDate === today) return state;
		return {
			bonusXp: state.bonusXp + STREAK_BONUS_XP,
			lastStreakDate: today
		};
	});
}
