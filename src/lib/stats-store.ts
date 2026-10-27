import { derived } from 'svelte/store';
import { decks, cards, reviewLogs } from './stores.js';

/**
 * Store derivado que cacheia estatísticas calculadas.
 * Evita recálculo completo de $reviewLogs a cada render da página de stats.
 */
export const stats = derived(
	[decks, cards, reviewLogs],
	([$decks, $cards, $logs]) => {
		const totalDecks = $decks.length;
		const totalCards = $cards.length;

		// Reviews de hoje (fuso local)
		const now = new Date();
		const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		let reviewsToday = 0;
		let qualitySum = 0;
		const qualityCounts: Record<number, number> = { 0: 0, 3: 0, 4: 0, 5: 0 };

		for (const log of $logs) {
			qualitySum += log.quality;
			if (qualityCounts[log.quality] !== undefined) {
				qualityCounts[log.quality]++;
			}
			// Comparação por string local para evitar problemas de fuso
			const d = new Date(log.reviewedAt);
			const logDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
			if (logDateStr === todayStr) {
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