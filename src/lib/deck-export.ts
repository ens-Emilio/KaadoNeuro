import { z } from 'zod';
import { deckSchema, flashcardSchema } from './storage-schema.js';
import type { Deck, Flashcard } from './types.js';

const exportBundleSchema = z.object({
	deck: deckSchema,
	cards: z.array(flashcardSchema)
});

export type DeckExportBundle = z.infer<typeof exportBundleSchema>;

/**
 * Build a JSON-serializable export bundle for one deck.
 * Caller passes current store snapshots; this function is pure.
 */
export function buildDeckExport(
	id: string,
	allDecks: Deck[],
	allCards: Flashcard[],
	generateId: () => string
): DeckExportBundle | null {
	const deck = allDecks.find((d) => d.id === id);
	if (!deck) return null;

	const deckCards = allCards.filter((c) => c.deckId === id);
	const newDeckId = generateId();
	const now = new Date().toISOString();

	return {
		deck: { ...deck, id: newDeckId, createdAt: now },
		cards: deckCards.map((card) => ({
			...card,
			id: generateId(),
			deckId: newDeckId,
			createdAt: now
		}))
	};
}

/**
 * Validate and merge a deck bundle into stores.
 * Always assigns fresh IDs to prevent collisions.
 * Returns card count on success; throws user-friendly message on failure.
 */
export function mergeDeckImport(
	json: unknown,
	generateId: () => string
): { deck: Deck; cards: Flashcard[] } {
	const parsed = exportBundleSchema.safeParse(json);
	if (!parsed.success) {
		throw new Error('Invalid deck file format');
	}

	const { deck, cards: importedCards } = parsed.data;
	const newDeckId = generateId();
	const now = new Date().toISOString();

	const newDeck: Deck = { ...deck, id: newDeckId, createdAt: now };
	const newCards: Flashcard[] = importedCards.map((card) => ({
		...card,
		id: generateId(),
		deckId: newDeckId,
		createdAt: now
	}));

	return { deck: newDeck, cards: newCards };
}
