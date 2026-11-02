import type { Snapshot } from './snapshot-schema.js';

export interface ConflictResult {
	hasConflict: boolean;
	localModified: boolean;
	remoteModified: boolean;
}

/**
 * Detect if local and remote have both changed since last sync.
 * @param lastSyncedAt - ISO timestamp of last successful sync (0 if never)
 * @param localExportedAt - exportedAt from current local snapshot
 * @param remoteExportedAt - exportedAt from remote snapshot
 */
export function detectConflict(
	lastSyncedAt: string | undefined,
	localExportedAt: string,
	remoteExportedAt: string
): ConflictResult {
	const lastSync = lastSyncedAt ? new Date(lastSyncedAt).getTime() : 0;
	const localTs = new Date(localExportedAt).getTime();
	const remoteTs = new Date(remoteExportedAt).getTime();

	const localModified = localTs > lastSync;
	const remoteModified = remoteTs > lastSync;

	return {
		hasConflict: localModified && remoteModified,
		localModified,
		remoteModified
	};
}

export type MergeStrategy = 'keepLocal' | 'keepRemote' | 'merge';

/**
 * Merge two snapshots using per-card newest-wins strategy.
 * Decks and reviewLogs use simple newer-timestamp-wins.
 * Cards are merged by ID: for each unique card ID, keep the one with later createdAt.
 */
export function mergeSnapshots(local: Snapshot, remote: Snapshot): Snapshot {
	const localTs = new Date(local.exportedAt).getTime();
	const remoteTs = new Date(remote.exportedAt).getTime();
	const newerSnapshot = localTs >= remoteTs ? local : remote;

	// Merge cards by ID — newest createdAt wins
	const cardMap = new Map<string, Snapshot['cards'][number]>();
	for (const card of [...remote.cards, ...local.cards]) {
		const existing = cardMap.get(card.id);
		if (!existing || new Date(card.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
			cardMap.set(card.id, card);
		}
	}

	// Merge decks by ID — from newer snapshot, but include all unique IDs
	const deckMap = new Map<string, Snapshot['decks'][number]>();
	const primaryDecks = newerSnapshot.decks;
	const secondaryDecks = localTs >= remoteTs ? remote.decks : local.decks;
	for (const deck of [...secondaryDecks, ...primaryDecks]) {
		if (!deckMap.has(deck.id)) deckMap.set(deck.id, deck);
	}

	// Review logs: concat and dedupe by id
	const reviewMap = new Map<string, Snapshot['reviewLogs'][number]>();
	for (const log of [...remote.reviewLogs, ...local.reviewLogs]) {
		if (!reviewMap.has(log.id)) reviewMap.set(log.id, log);
	}

	return {
		version: 1,
		decks: Array.from(deckMap.values()),
		cards: Array.from(cardMap.values()),
		reviewLogs: Array.from(reviewMap.values()),
		exportedAt: new Date().toISOString()
	};
}

/**
 * Resolve a conflict using the chosen strategy.
 */
export function resolveConflict(
	local: Snapshot,
	remote: Snapshot,
	strategy: MergeStrategy
): Snapshot {
	if (strategy === 'keepLocal') return { ...local, exportedAt: new Date().toISOString() };
	if (strategy === 'keepRemote') return { ...remote, exportedAt: new Date().toISOString() };
	return mergeSnapshots(local, remote);
}
