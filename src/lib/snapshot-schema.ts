import { z } from 'zod';

const CardSchema = z.object({
	id: z.string().min(1),
	deckId: z.string().min(1),
	front: z.string().min(1).max(20000),
	back: z.string().min(1).max(20000),
	interval: z.number().finite().min(0),
	repetitions: z.number().int().min(0),
	easeFactor: z.number().finite().min(1.3),
	dueDate: z.string().datetime(),
	createdAt: z.string().datetime()
});

const DeckSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(200),
	description: z.string().max(2000).optional(),
	createdAt: z.string().datetime()
});

const ReviewSchema = z.object({
	id: z.string().min(1),
	cardId: z.string().min(1),
	quality: z.number().int().min(0).max(5),
	reviewedAt: z.string().datetime()
});

export const SnapshotSchema = z.object({
	version: z.literal(1),
	decks: z.array(DeckSchema).max(2000),
	cards: z.array(CardSchema).max(100000),
	reviewLogs: z.array(ReviewSchema).max(500000),
	exportedAt: z.string().datetime()
});

export type Snapshot = z.infer<typeof SnapshotSchema>;

export const MAX_SNAPSHOT_BYTES = 20 * 1024 * 1024;