import { z } from 'zod';

// Schemas de validação para dados persistidos no localStorage.
// Usados para validar na leitura e migrar dados de versões antigas ou corrompidos.

export const flashcardSchema = z.object({
	id: z.string().uuid(),
	deckId: z.string().uuid(),
	front: z.string().min(1),
	back: z.string().min(1),
	tags: z.array(z.string()).default([]),
	interval: z.number().int().nonnegative(),
	repetitions: z.number().int().nonnegative(),
	easeFactor: z.number().positive(),
	dueDate: z.string().datetime(),
	createdAt: z.string().datetime()
});

export const deckSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	description: z.string().optional(),
	createdAt: z.string().datetime()
});

export const reviewLogSchema = z.object({
	id: z.string().uuid(),
	cardId: z.string().uuid(),
	quality: z.number().int().min(0).max(5),
	reviewedAt: z.string().datetime()
});

export const decksArraySchema = z.array(deckSchema);
export const cardsArraySchema = z.array(flashcardSchema);
export const reviewLogsArraySchema = z.array(reviewLogSchema);

export type StoredDeck = z.infer<typeof deckSchema>;
export type StoredFlashcard = z.infer<typeof flashcardSchema>;
export type StoredReviewLog = z.infer<typeof reviewLogSchema>;

/**
 * Valida e filtra um array de dados persistidos.
 * Registra warnings no console para itens inválidos e retorna apenas os válidos.
 * Se a entrada não for um array, retorna o fallback vazio.
 */
export function safeParseArray<T>(
	data: unknown,
	schema: z.ZodType<T[]>,
	label: string,
	fallback: T[] = []
): T[] {
	if (!Array.isArray(data)) {
		console.warn(`[storage] ${label}: dado não é array, resetando para padrão.`);
		return fallback;
	}

	const result = schema.safeParse(data);
	if (result.success) {
		return result.data;
	}

	// Filtra item por item para preservar o máximo de dados válidos.
	// Como ZodType<T[]> genérico não expõe .element, validamos cada item
	// envolvendo-o em um array temporário e reusando o schema de array original.
	const validItems: T[] = [];
	let invalidCount = 0;
	for (const item of data) {
		const itemResult = schema.safeParse([item]);
		if (itemResult.success && itemResult.data.length === 1) {
			validItems.push(itemResult.data[0]);
		} else {
			invalidCount++;
		}
	}

	if (invalidCount > 0) {
		console.warn(
			`[storage] ${label}: ${invalidCount} item(ns) inválido(s) removido(s) durante migração.`
		);
	}

	return validItems;
}