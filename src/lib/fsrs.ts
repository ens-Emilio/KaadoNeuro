import type { Flashcard, FsrsState } from './types.js';

// FSRS-5 default parameters (w[0]..w[16])
const W = [
	0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61
];

export enum Rating {
	Again = 1,
	Hard = 2,
	Good = 3,
	Easy = 4
}

type CardState = 'New' | 'Learning' | 'Review' | 'Relearning';

/** Map quality 0-5 to FSRS Rating */
export function qualityToRating(quality: number): Rating {
	if (quality <= 1) return Rating.Again;
	if (quality === 2) return Rating.Hard;
	if (quality === 3) return Rating.Good;
	return Rating.Easy; // quality >= 4
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/** Initial stability for a given rating on first review */
function initStability(rating: Rating): number {
	// S0(G) = w[rating-1] for Again/Hard/Good/Easy
	return W[rating - 1];
}

/** Initial difficulty for a given rating on first review */
function initDifficulty(rating: Rating): number {
	// D0(G) = w[4] - exp(w[5] * (G - 1)) + 1
	const d = W[4] - Math.exp(W[5] * (rating - 1)) + 1;
	return clamp(d, 1, 10);
}

/** Next difficulty after reviewing with a given rating */
function nextD(d: number, rating: Rating): number {
	// D'(D,G) = w[7] * D0(3) + (1 - w[7]) * (D - w[6] * (G - 3))
	// where D0(3) = initDifficulty(Good)
	const d0Good = initDifficulty(Rating.Good);
	const newD = W[7] * d0Good + (1 - W[7]) * (d - W[6] * (rating - 3));
	return clamp(newD, 1, 10);
}

/** Stability after recall (Good or Easy) in Review state */
function nextSRecall(s: number, d: number, elapsedDays: number, rating: Rating): number {
	// S'_r(D,S,R,G) = S * (exp(w[8]) * (11 - D) * S^(-w[9]) * (exp(w[10]*(1-R)/S) - 1) * hardPenalty * easyBonus + 1)
	const r = Math.exp(-elapsedDays / s); // retrievability
	let hardPenalty = 1;
	let easyBonus = 1;
	if (rating === Rating.Hard) {
		hardPenalty = W[15];
	} else if (rating === Rating.Easy) {
		easyBonus = W[16];
	}
	const factor =
		Math.exp(W[8]) *
			(11 - d) *
			Math.pow(s, -W[9]) *
			(Math.exp((W[10] * (1 - r)) / s) - 1) *
			hardPenalty *
			easyBonus +
		1;
	return s * factor;
}

/** Stability after forgetting (Again) — short-term stability */
function nextSForget(s: number, d: number, elapsedDays: number): number {
	// S'_f(D,S,R) = w[11] * D^(-w[12]) * ((S+1)^w[13] - 1) * exp(w[14]*(1-R))
	const r = Math.exp(-elapsedDays / s);
	const newS =
		W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
	return Math.max(newS, 0.01);
}

/** Calculate interval in days from stability and desired retention (default 0.9) */
function stabilityToInterval(s: number, requestRetention = 0.9): number {
	// I = s * ln(requestRetention) / ln(0.9)
	// Simplified: I = s * (ln(R) / ln(0.9)) but standard FSRS uses:
	// R = 0.9 => I = s (by definition when retention target is 0.9)
	// General: I = s * ln(R) / ln(0.9)
	const interval = (s * Math.log(requestRetention)) / Math.log(0.9);
	return Math.max(Math.round(interval), 1);
}

function newState(prevState: CardState, rating: Rating): CardState {
	switch (prevState) {
		case 'New':
			return 'Learning';
		case 'Learning':
		case 'Relearning':
			return rating >= Rating.Good ? 'Review' : 'Learning';
		case 'Review':
			return rating === Rating.Again ? 'Relearning' : 'Review';
		default:
			return 'Learning';
	}
}

export interface FsrsReviewResult {
	fsrsState: FsrsState;
	interval: number;
	dueDate: string;
}

/**
 * Calculate next review parameters using FSRS-5.
 * @param card The flashcard being reviewed
 * @param quality Quality rating 0-5 (0=errei, 3=difícil, 4=bom, 5=fácil)
 */
export function calculateFsrsReview(card: Flashcard, quality: number): FsrsReviewResult {
	const rating = qualityToRating(quality);
	const now = new Date();

	// Get or initialize FSRS state
	const prev = card.fsrsState;
	const isFirstReview = !prev || prev.state === 'New';

	let s: number;
	let d: number;
	let elapsedDays: number;
	let reps: number;
	let lapses: number;

	if (isFirstReview) {
		s = initStability(rating);
		d = initDifficulty(rating);
		elapsedDays = 0;
		reps = 0;
		lapses = 0;
	} else {
		s = prev.stability;
		d = prev.difficulty;
		reps = prev.reps;
		lapses = prev.lapses;

		// Calculate elapsed days since last review
		if (prev.lastReview) {
			const lastReviewDate = new Date(prev.lastReview);
			elapsedDays = Math.max((now.getTime() - lastReviewDate.getTime()) / (24 * 60 * 60 * 1000), 0);
		} else {
			elapsedDays = prev.elapsedDays;
		}
	}

	const prevState: CardState = prev?.state ?? 'New';
	const nextState = newState(prevState, rating);

	// Update stability and difficulty based on state and rating
	let newS: number;
	let newD: number;

	if (prevState === 'Review' && rating === Rating.Again) {
		// Forgetting in Review state
		newS = nextSForget(s, d, elapsedDays);
		newD = nextD(d, rating);
		lapses += 1;
	} else if (prevState === 'Review' && rating >= Rating.Good) {
		// Recall in Review state
		newS = nextSRecall(s, d, elapsedDays, rating);
		newD = nextD(d, rating);
	} else if (prevState === 'New') {
		// First review — already initialized above
		newS = s;
		newD = d;
	} else if (prevState === 'Learning' || prevState === 'Relearning') {
		// Short-term reviews during learning/relearning
		if (rating === Rating.Again) {
			// Failed again — reset stability slightly
			newS = Math.max(s * 0.5, 0.01);
			newD = nextD(d, rating);
			if (prevState === 'Relearning') lapses += 1;
		} else {
			// Passed — increase stability
			newS = nextSRecall(s, d, elapsedDays, rating);
			newD = nextD(d, rating);
		}
	} else {
		// Fallback
		newS = s;
		newD = d;
	}

	// Clamp values
	newS = Math.max(newS, 0.01);
	newD = clamp(newD, 1, 10);
	reps += 1;

	const interval = stabilityToInterval(newS);

	const dueDate = new Date(now);
	dueDate.setDate(dueDate.getDate() + interval);

	const fsrsState: FsrsState = {
		stability: newS,
		difficulty: newD,
		elapsedDays: 0, // Reset; will be recalculated on next review
		scheduledDays: interval,
		reps,
		lapses,
		state: nextState,
		lastReview: now.toISOString()
	};

	return {
		fsrsState,
		interval,
		dueDate: dueDate.toISOString()
	};
}
