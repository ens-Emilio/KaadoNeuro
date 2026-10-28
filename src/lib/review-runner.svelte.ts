import { get } from 'svelte/store';
import { cards as cardStore, decks as deckStore, generateId, reviewLogs } from '$lib/stores.js';
import { awardStreakBonus } from '$lib/gamification-store.js';
import {
	applySessionLimit,
	getAllDueCards,
	getDueCards,
	processReview
} from '$lib/review-session.js';
import { haptic } from '$lib/haptics.js';
import type { Flashcard } from '$lib/types.js';

export type ReviewScope = { kind: 'deck'; deckId: string } | { kind: 'all' };

export interface ReviewRunnerOptions {
	scope: ReviewScope;
	/** Reactive sources: pass `() => $cards` / `() => $clock`. */
	cards: () => Flashcard[];
	limit: () => number;
	now: () => Date;
}

/** Session state shared by `/review/[deckId]` and `/review/quick`. */
export function createReviewRunner({ scope, cards: readCards, limit, now }: ReviewRunnerOptions) {
	let activeTags = $state<string[]>([]);
	let sessionActive = $state(true);
	let isFlipped = $state(false);
	let totalAtStart = $state(0);
	let sessionCount = $state(0);

	const allDueCards = $derived(
		scope.kind === 'deck'
			? getDueCards(readCards(), scope.deckId, now(), activeTags)
			: getAllDueCards(readCards(), now(), activeTags)
	);
	const dueCards = $derived(sessionActive ? applySessionLimit(allDueCards, limit()) : allDueCards);
	const currentCard: Flashcard | undefined = $derived(dueCards[0]);
	const progress = $derived(
		totalAtStart > 0 ? ((totalAtStart - dueCards.length) / totalAtStart) * 100 : 0
	);
	const counterText = $derived(
		dueCards.length > 0
			? `${totalAtStart - dueCards.length + 1} / ${totalAtStart}`
			: `0 / ${totalAtStart || 0}`
	);
	const remaining = $derived(dueCards.length);

	$effect(() => {
		if (allDueCards.length > 0 && totalAtStart === 0) {
			totalAtStart = allDueCards.length;
			sessionCount = 0;
			sessionActive = true;
		}
		if (allDueCards.length === 0 && totalAtStart > 0) sessionCount = totalAtStart;
	});

	function toggleTag(tag: string) {
		activeTags = activeTags.includes(tag)
			? activeTags.filter((value) => value !== tag)
			: [...activeTags, tag];
	}

	function flip() {
		if (isFlipped) return;
		isFlipped = true;
		haptic(10);
	}

	function continueSession() {
		sessionActive = false;
	}

	function review(quality: number) {
		const card = currentCard;
		if (!card) return;
		const deck = get(deckStore).find((d) => d.id === card.deckId);
		const { updatedCard, newLog } = processReview(card, quality, generateId, deck?.sm2Overrides);
		cardStore.update((all) => all.map((item) => (item.id === updatedCard.id ? updatedCard : item)));
		reviewLogs.update((logs) => [...logs, newLog]);
		awardStreakBonus();
		isFlipped = false;
	}

	function onKeydown(event: KeyboardEvent) {
		if (!currentCard) return;
		if (!isFlipped) {
			if (event.code === 'Space' || event.key === ' ') {
				event.preventDefault();
				flip();
			}
			return;
		}
		if (event.key === '1') review(0);
		if (event.key === '2') review(3);
		if (event.key === '3') review(4);
		if (event.key === '4') review(5);
	}

	return {
		get activeTags() {
			return activeTags;
		},
		get isFlipped() {
			return isFlipped;
		},
		get totalAtStart() {
			return totalAtStart;
		},
		get sessionCount() {
			return sessionCount;
		},
		get sessionActive() {
			return sessionActive;
		},
		get allDueCards() {
			return allDueCards;
		},
		get dueCards() {
			return dueCards;
		},
		get currentCard() {
			return currentCard;
		},
		get progress() {
			return progress;
		},
		get counterText() {
			return counterText;
		},
		get remaining() {
			return remaining;
		},
		toggleTag,
		flip,
		continueSession,
		review,
		onKeydown
	};
}
