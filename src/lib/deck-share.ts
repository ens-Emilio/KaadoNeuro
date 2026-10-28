import { z } from 'zod';
import { deckSchema, flashcardSchema } from './storage-schema.js';
import type { Deck, Flashcard } from './types.js';

/** Query parameter that carries a shared deck on the home route. */
export const SHARE_PARAM = 'share';

/**
 * Longest share token we accept. Browsers and chat clients truncate long URLs
 * well before this; anything larger is a sign the caller should export a file.
 */
export const MAX_SHARE_TOKEN_LENGTH = 12000;

/**
 * Hard ceiling on cards in one shared deck. A link is a transport, not a backup:
 * 100 cards keeps the base64url token inside MAX_SHARE_TOKEN_LENGTH, and larger
 * decks should use the JSON export instead.
 */
export const MAX_SHARE_CARDS = 100;

const shareCardSchema = z.tuple([
	z.string().max(4000),
	z.string().max(8000),
	z.array(z.string().max(80)).max(20).optional()
]);

const sharePayloadSchema = z.object({
	v: z.literal(1),
	n: z.string().min(1).max(120),
	d: z.string().max(2000).optional(),
	c: z.array(shareCardSchema).max(MAX_SHARE_CARDS)
});

export type SharePayload = z.infer<typeof sharePayloadSchema>;

function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): Uint8Array {
	const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

/**
 * Encode a deck as a compact base64url token.
 * Cards travel as `[front, back, tags]` tuples because most of the URL budget
 * is spent on escaping, not on data.
 */
export function encodeDeckShare(deck: Deck, cards: Flashcard[]): string {
	const payload: SharePayload = {
		v: 1,
		n: deck.name,
		...(deck.description ? { d: deck.description } : {}),
		c: cards
			.slice(0, MAX_SHARE_CARDS)
			.map((card): [string, string, string[]?] =>
				card.tags.length > 0 ? [card.front, card.back, card.tags] : [card.front, card.back]
			)
	};
	return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

/**
 * Decode an untrusted share token into a validated deck bundle.
 * Returns null for anything malformed: a share link must never throw at a call site.
 */
export function decodeDeckShare(
	token: string,
	generateId: () => string
): { deck: Deck; cards: Flashcard[] } | null {
	if (!token || token.length > MAX_SHARE_TOKEN_LENGTH) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(token)));
	} catch {
		return null;
	}

	const result = sharePayloadSchema.safeParse(parsed);
	if (!result.success) return null;

	const { n, d, c } = result.data;
	const now = new Date().toISOString();
	const deckId = generateId();

	const deckCandidate = {
		id: deckId,
		name: n,
		...(d ? { description: d } : {}),
		createdAt: now
	};
	const deckParsed = deckSchema.safeParse(deckCandidate);
	if (!deckParsed.success) return null;

	const cards: Flashcard[] = [];
	for (const [front, back, tags] of c) {
		const candidate = {
			id: generateId(),
			deckId,
			front,
			back,
			tags: tags ?? [],
			interval: 0,
			repetitions: 0,
			easeFactor: 2.5,
			dueDate: now,
			createdAt: now
		};
		const cardParsed = flashcardSchema.safeParse(candidate);
		if (!cardParsed.success) return null;
		cards.push(cardParsed.data);
	}

	return { deck: deckParsed.data, cards };
}

/** Absolute URL for a shared deck, rooted at the app's origin. */
export function buildShareUrl(origin: string, deck: Deck, cards: Flashcard[]): string {
	const token = encodeDeckShare(deck, cards);
	const url = new URL('/', origin);
	url.searchParams.set(SHARE_PARAM, token);
	return url.toString();
}
