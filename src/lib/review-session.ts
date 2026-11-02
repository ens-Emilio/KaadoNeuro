/**
 * Lógica pura da sessão de review, extraída do componente para ser testável.
 * Não depende de Svelte, DOM ou stores — recebe dados e retorna novos estados.
 */
import type { Flashcard, ReviewLog, Deck } from './types.js';
import { calculateFsrsReview } from './fsrs.js';
import { calculateReview } from './sm2.js';

export interface ReviewResult {
	updatedCard: Flashcard;
	newLog: ReviewLog;
}

/**
 * Processa uma resposta do usuário para um card, retornando o card atualizado
 * e o log de review correspondente. Função pura: sem efeitos colaterais.
 *
 * @param card - O card sendo revisado
 * @param quality - Nota de 0 a 5 (0=errei, 3=difícil, 4=bom, 5=fácil)
 * @param generateId - Função que gera IDs únicos (injetada para testabilidade)
 */
export function processReview(
	card: Flashcard,
	quality: number,
	generateId: () => string,
	overrides?: Deck['sm2Overrides'],
	algorithm?: 'sm2' | 'fsrs'
): ReviewResult {
	if (quality < 0 || quality > 5 || !Number.isInteger(quality)) {
		throw new Error(`Invalid quality: ${quality}. Expected an integer from 0 to 5.`);
	}

	let updatedCard: Flashcard;

	if (algorithm === 'fsrs') {
		const fsrsResult = calculateFsrsReview(card, quality);
		updatedCard = {
			...card,
			interval: fsrsResult.interval,
			dueDate: fsrsResult.dueDate,
			fsrsState: fsrsResult.fsrsState
		};
	} else {
		const updatedFields = calculateReview(card, quality, overrides);
		updatedCard = { ...card, ...updatedFields };
	}

	const newLog: ReviewLog = {
		id: generateId(),
		cardId: card.id,
		quality,
		reviewedAt: new Date().toISOString()
	};

	return { updatedCard, newLog };
}

/**
 * Filtra e ordena cards vencidos para um deck específico.
 * Retorna array ordenado por dueDate ascendente (mais urgente primeiro).
 */
export function getDueCards(
	cards: Flashcard[],
	deckId: string,
	now: Date = new Date(),
	activeTags: string[] = []
): Flashcard[] {
	return cards
		.filter((c) => {
			if (c.deckId !== deckId) return false;
			if (new Date(c.dueDate) > now) return false;
			if (activeTags.length > 0) {
				const cardTags = Array.isArray(c.tags) ? c.tags : [];
				return activeTags.some((t) => cardTags.includes(t));
			}
			return true;
		})
		.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

/**
 * Calcula o progresso da sessão como porcentagem (0–100).
 */
export function sessionProgress(totalAtStart: number, remaining: number): number {
	if (totalAtStart <= 0) return 0;
	return ((totalAtStart - remaining) / totalAtStart) * 100;
}

/**
 * Aplica um limite máximo de cards por sessão.
 * Se limit for 0 ou negativo, retorna todos os cards (sem limite).
 */
export function applySessionLimit(cards: Flashcard[], limit: number): Flashcard[] {
	if (limit <= 0) return cards;
	return cards.slice(0, limit);
}

/**
 * Filtra e ordena cards vencidos de TODOS os decks.
 * Usado pela Revisão Rápida (Quick Review).
 */
export function getAllDueCards(
	cards: Flashcard[],
	now: Date = new Date(),
	activeTags: string[] = []
): Flashcard[] {
	return cards
		.filter((c) => {
			if (new Date(c.dueDate) > now) return false;
			if (activeTags.length > 0) {
				const cardTags = Array.isArray(c.tags) ? c.tags : [];
				return activeTags.some((t) => cardTags.includes(t));
			}
			return true;
		})
		.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

/**
 * Filters cards that are overdue (past their dueDate) regardless of normal scheduling.
 * Used for dedicated "Overdue Review" mode.
 */
export function getOverdueCards(
	cards: Flashcard[],
	deckId: string | undefined,
	now: Date = new Date(),
	activeTags: string[] = []
): Flashcard[] {
	return cards
		.filter((c) => {
			if (deckId && c.deckId !== deckId) return false;
			if (new Date(c.dueDate) >= now) return false; // Only cards strictly past due
			if (activeTags.length > 0) {
				const cardTags = Array.isArray(c.tags) ? c.tags : [];
				return activeTags.some((t) => cardTags.includes(t));
			}
			return true;
		})
		.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

/**
 * Counts overdue cards across all decks or a specific deck.
 * Returns the count for UI badges.
 */
export function countOverdueCards(
	cards: Flashcard[],
	deckId: string | undefined,
	now: Date = new Date(),
	activeTags: string[] = []
): number {
	return cards.filter((c) => {
		if (deckId && c.deckId !== deckId) return false;
		if (new Date(c.dueDate) >= now) return false;
		if (activeTags.length > 0) {
			const cardTags = Array.isArray(c.tags) ? c.tags : [];
			return activeTags.some((t) => cardTags.includes(t));
		}
		return true;
	}).length;
}

/**
 * Processes a review for an overdue card without altering the SM-2 interval calculation.
 * Treats the review as if it happened on the original due date.
 * This preserves the card's scheduled interval instead of recalculating from today.
 */
export function processOverdueReview(
	card: Flashcard,
	quality: number,
	generateId: () => string,
	overrides?: Deck['sm2Overrides']
): ReviewResult {
	if (quality < 0 || quality > 5 || !Number.isInteger(quality)) {
		throw new Error(`Invalid quality: ${quality}. Expected an integer from 0 to 5.`);
	}

	// Calculate what the card's parameters WOULD have been if reviewed on its dueDate
	const dueDate = new Date(card.dueDate);

	// Create a temporary card with the dueDate as "now" for SM-2 calculation
	const tempCard: Flashcard = {
		...card,
		dueDate: dueDate.toISOString()
	};

	const updatedFields = calculateReview(tempCard, quality, overrides);

	// The interval is calculated correctly, but we need to set the NEW dueDate
	// relative to the ORIGINAL dueDate, not today
	const newDueDate = new Date(dueDate);
	newDueDate.setDate(newDueDate.getDate() + updatedFields.interval);

	const updatedCard: Flashcard = {
		...card,
		interval: updatedFields.interval,
		repetitions: updatedFields.repetitions,
		easeFactor: updatedFields.easeFactor,
		dueDate: newDueDate.toISOString()
	};

	const newLog: ReviewLog = {
		id: generateId(),
		cardId: card.id,
		quality,
		reviewedAt: new Date().toISOString()
	};

	return { updatedCard, newLog };
}
