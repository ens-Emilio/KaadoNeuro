import { persisted } from 'svelte-local-storage-store';

export const hapticsEnabled = persisted<boolean>('kaadoneuro_haptics_enabled', true);

const PATTERNS = {
	cardFlip: [10],
	correct: [10, 30, 10],
	wrong: [30, 50, 30],
	badgeUnlock: [10, 30, 10, 30, 10, 50, 10],
	sessionComplete: [10, 30, 10, 30, 10]
} as const;

export type HapticPattern = keyof typeof PATTERNS;

/** Low-level vibrate wrapper with feature detection. */
export function haptic(pattern: number | number[]): void {
	try {
		if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
			navigator.vibrate(pattern);
		}
	} catch {
		// Haptics are optional; unsupported or denied vibration is a no-op.
	}
}

/** Settings-aware haptic: respects user preference. */
function playIfEnabled(pattern: readonly number[]): void {
	let enabled = true;
	const unsub = hapticsEnabled.subscribe((v) => {
		enabled = v;
	});
	unsub();
	if (enabled) haptic([...pattern]);
}

export function hapticCardFlip(): void {
	playIfEnabled(PATTERNS.cardFlip);
}

export function hapticCorrect(): void {
	playIfEnabled(PATTERNS.correct);
}

export function hapticWrong(): void {
	playIfEnabled(PATTERNS.wrong);
}

export function hapticBadgeUnlock(): void {
	playIfEnabled(PATTERNS.badgeUnlock);
}

export function hapticSessionComplete(): void {
	playIfEnabled(PATTERNS.sessionComplete);
}

/** Exported for testing: raw pattern arrays without settings check. */
export const _patterns = PATTERNS;
