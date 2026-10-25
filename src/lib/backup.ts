import { get } from 'svelte/store';
import { cards, decks, reviewLogs } from './stores.js';
import { SnapshotSchema, type Snapshot } from './snapshot-schema.js';

export function buildSnapshot(): Snapshot {
	return {
		version: 1,
		decks: get(decks),
		cards: get(cards),
		reviewLogs: get(reviewLogs),
		exportedAt: new Date().toISOString()
	};
}

export function applySnapshot(value: unknown): Snapshot {
	const snapshot = SnapshotSchema.parse(value);
	decks.set(snapshot.decks);
	cards.set(snapshot.cards);
	reviewLogs.set(snapshot.reviewLogs);
	return snapshot;
}

export function downloadSnapshot() {
	const snapshot = buildSnapshot();
	const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `kaadoneuro-${new Date().toISOString().slice(0, 10)}.json`;
	link.click();
	URL.revokeObjectURL(url);
}
