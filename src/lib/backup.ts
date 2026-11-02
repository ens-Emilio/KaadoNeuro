import { get } from 'svelte/store';
import { cards, decks, reviewLogs } from './stores.js';
import { SnapshotSchema, type Snapshot } from './snapshot-schema.js';

async function computeChecksum(jsonString: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(jsonString);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function buildSnapshot(): Promise<Snapshot & { checksum: string }> {
	const snapshot = {
		version: 1 as const,
		decks: get(decks),
		cards: get(cards),
		reviewLogs: get(reviewLogs),
		exportedAt: new Date().toISOString()
	};
	const jsonString = JSON.stringify(snapshot, null, 2);
	const checksum = await computeChecksum(jsonString);
	return { ...snapshot, checksum };
}

export async function applySnapshot(value: unknown): Promise<Snapshot> {
	const parsed = SnapshotSchema.parse(value);
	if (parsed.checksum !== undefined) {
		// Verify checksum by recomputing from the original data (without checksum field)
		const snapshotWithoutChecksum = {
			version: parsed.version,
			decks: parsed.decks,
			cards: parsed.cards,
			reviewLogs: parsed.reviewLogs,
			exportedAt: parsed.exportedAt
		};
		const jsonString = JSON.stringify(snapshotWithoutChecksum, null, 2);
		const expectedChecksum = await computeChecksum(jsonString);
		if (parsed.checksum !== expectedChecksum) {
			throw new Error(
				'Backup integrity check failed: checksum mismatch. The file may be corrupted or tampered with.'
			);
		}
	} else {
		console.warn(
			'Importing snapshot without checksum verification. Consider re-exporting to add integrity protection.'
		);
	}
	decks.set(parsed.decks);
	cards.set(parsed.cards);
	reviewLogs.set(parsed.reviewLogs);
	return parsed;
}

export async function downloadSnapshot() {
	const snapshot = await buildSnapshot();
	const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `kaadoneuro-${new Date().toISOString().slice(0, 10)}.json`;
	link.click();
	URL.revokeObjectURL(url);
}
