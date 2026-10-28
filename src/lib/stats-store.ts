import { derived } from 'svelte/store';
import { decks, cards, reviewLogs } from './stores.js';
import type { Deck, Flashcard, ReviewLog } from './types.js';
import { clock, localDateKey } from './clock-store.js';

export interface Stats {
	totalDecks: number;
	totalCards: number;
	reviewsToday: number;
	averageQuality: number;
	cardsByDeck: { name: string; count: number }[];
	qualityCounts: Record<number, number>;
	totalReviews: number;
}

/**
 * Store derivado que cacheia estatísticas calculadas.
 * Depende de `clock` para que "hoje" avance na virada do dia com a aba aberta.
 */
export const stats = derived(
	[decks, cards, reviewLogs, clock],
	([$decks, $cards, $logs, $now]: [Deck[], Flashcard[], ReviewLog[], Date]): Stats => {
		const totalDecks = $decks.length;
		const totalCards = $cards.length;

		const todayStr = localDateKey($now);
		let reviewsToday = 0;
		let qualitySum = 0;
		const qualityCounts: Record<number, number> = { 0: 0, 3: 0, 4: 0, 5: 0 };

		for (const log of $logs) {
			qualitySum += log.quality;
			if (qualityCounts[log.quality] !== undefined) {
				qualityCounts[log.quality]++;
			}
			if (localDateKey(new Date(log.reviewedAt)) === todayStr) {
				reviewsToday++;
			}
		}

		const averageQuality = $logs.length > 0 ? qualitySum / $logs.length : 0;

		// Cards por deck (mapa O(n) em vez de filter O(n*m))
		const cardsByDeckMap = new Map<string, number>();
		for (const card of $cards) {
			cardsByDeckMap.set(card.deckId, (cardsByDeckMap.get(card.deckId) ?? 0) + 1);
		}
		const cardsByDeck = $decks.map((d) => ({
			name: d.name,
			count: cardsByDeckMap.get(d.id) ?? 0
		}));

		return {
			totalDecks,
			totalCards,
			reviewsToday,
			averageQuality,
			cardsByDeck,
			qualityCounts,
			totalReviews: $logs.length
		};
	}
);

/**
 * Heatmap data: last 365 days of review counts keyed by YYYY-MM-DD.
 * Returns an array of { date: string, count: number } for CSS grid rendering.
 */
export const heatmapData = derived([reviewLogs, clock], ([$logs, $now]: [ReviewLog[], Date]) => {
	const counts = new Map<string, number>();
	for (const log of $logs) {
		const key = localDateKey(new Date(log.reviewedAt));
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	const days: { date: string; count: number }[] = [];
	for (let i = 364; i >= 0; i--) {
		const d = new Date($now);
		d.setDate(d.getDate() - i);
		const key = localDateKey(d);
		days.push({ date: key, count: counts.get(key) ?? 0 });
	}
	return days;
});
