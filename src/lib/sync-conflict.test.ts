import { describe, it, expect } from 'vitest';
import { detectConflict, mergeSnapshots, resolveConflict } from './sync-conflict.js';
import type { Snapshot } from './snapshot-schema.js';

function makeSnapshot(exportedAt: string, overrides?: Partial<Snapshot>): Snapshot {
	return {
		version: 1,
		decks: [],
		cards: [],
		reviewLogs: [],
		exportedAt,
		...overrides
	};
}

describe('detectConflict', () => {
	it('returns conflict when never synced and both sides have data', () => {
		const result = detectConflict(undefined, '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z');
		expect(result.hasConflict).toBe(true);
		expect(result.localModified).toBe(true);
		expect(result.remoteModified).toBe(true);
	});

	it('returns no conflict when only local modified since last sync', () => {
		const result = detectConflict(
			'2024-01-01T00:00:00Z',
			'2024-01-02T00:00:00Z',
			'2024-01-01T00:00:00Z'
		);
		expect(result.hasConflict).toBe(false);
		expect(result.localModified).toBe(true);
		expect(result.remoteModified).toBe(false);
	});

	it('returns no conflict when only remote modified since last sync', () => {
		const result = detectConflict(
			'2024-01-01T00:00:00Z',
			'2024-01-01T00:00:00Z',
			'2024-01-02T00:00:00Z'
		);
		expect(result.hasConflict).toBe(false);
		expect(result.localModified).toBe(false);
		expect(result.remoteModified).toBe(true);
	});

	it('returns conflict when both modified since last sync', () => {
		const result = detectConflict(
			'2024-01-01T00:00:00Z',
			'2024-01-02T00:00:00Z',
			'2024-01-03T00:00:00Z'
		);
		expect(result.hasConflict).toBe(true);
		expect(result.localModified).toBe(true);
		expect(result.remoteModified).toBe(true);
	});

	it('returns no conflict when neither modified since last sync', () => {
		const result = detectConflict(
			'2024-01-05T00:00:00Z',
			'2024-01-01T00:00:00Z',
			'2024-01-02T00:00:00Z'
		);
		expect(result.hasConflict).toBe(false);
		expect(result.localModified).toBe(false);
		expect(result.remoteModified).toBe(false);
	});
});

describe('mergeSnapshots', () => {
	it('keeps newest card by createdAt for same ID', () => {
		const local = makeSnapshot('2024-01-01T00:00:00Z', {
			cards: [
				{
					id: 'c1',
					deckId: 'd1',
					front: 'old',
					back: 'old',
					interval: 0,
					repetitions: 0,
					easeFactor: 2.5,
					dueDate: '2024-01-01T00:00:00Z',
					createdAt: '2024-01-01T00:00:00Z',
					tags: []
				}
			]
		});
		const remote = makeSnapshot('2024-01-02T00:00:00Z', {
			cards: [
				{
					id: 'c1',
					deckId: 'd1',
					front: 'new',
					back: 'new',
					interval: 1,
					repetitions: 1,
					easeFactor: 2.6,
					dueDate: '2024-01-02T00:00:00Z',
					createdAt: '2024-01-02T00:00:00Z',
					tags: []
				}
			]
		});
		const merged = mergeSnapshots(local, remote);
		expect(merged.cards.length).toBe(1);
		expect(merged.cards[0].front).toBe('new');
	});

	it('includes cards from both snapshots with unique IDs', () => {
		const local = makeSnapshot('2024-01-01T00:00:00Z', {
			cards: [
				{
					id: 'c1',
					deckId: 'd1',
					front: 'local',
					back: 'local',
					interval: 0,
					repetitions: 0,
					easeFactor: 2.5,
					dueDate: '2024-01-01T00:00:00Z',
					createdAt: '2024-01-01T00:00:00Z',
					tags: []
				}
			]
		});
		const remote = makeSnapshot('2024-01-02T00:00:00Z', {
			cards: [
				{
					id: 'c2',
					deckId: 'd1',
					front: 'remote',
					back: 'remote',
					interval: 0,
					repetitions: 0,
					easeFactor: 2.5,
					dueDate: '2024-01-02T00:00:00Z',
					createdAt: '2024-01-02T00:00:00Z',
					tags: []
				}
			]
		});
		const merged = mergeSnapshots(local, remote);
		expect(merged.cards.length).toBe(2);
		const ids = merged.cards.map((c) => c.id).sort();
		expect(ids).toEqual(['c1', 'c2']);
	});

	it('deduplicates review logs by id', () => {
		const log = {
			id: 'r1',
			cardId: 'c1',
			quality: 3,
			reviewedAt: '2024-01-01T00:00:00Z'
		};
		const local = makeSnapshot('2024-01-01T00:00:00Z', { reviewLogs: [log] });
		const remote = makeSnapshot('2024-01-02T00:00:00Z', { reviewLogs: [log] });
		const merged = mergeSnapshots(local, remote);
		expect(merged.reviewLogs.length).toBe(1);
	});

	it('sets exportedAt to current time', () => {
		const before = Date.now();
		const merged = mergeSnapshots(
			makeSnapshot('2024-01-01T00:00:00Z'),
			makeSnapshot('2024-01-02T00:00:00Z')
		);
		const after = Date.now();
		const ts = new Date(merged.exportedAt).getTime();
		expect(ts).toBeGreaterThanOrEqual(before);
		expect(ts).toBeLessThanOrEqual(after);
	});
});

describe('resolveConflict', () => {
	it('keepLocal returns local snapshot with updated exportedAt', () => {
		const local = makeSnapshot('2024-01-01T00:00:00Z', {
			cards: [
				{
					id: 'c1',
					deckId: 'd1',
					front: 'local',
					back: 'local',
					interval: 0,
					repetitions: 0,
					easeFactor: 2.5,
					dueDate: '2024-01-01T00:00:00Z',
					createdAt: '2024-01-01T00:00:00Z',
					tags: []
				}
			]
		});
		const remote = makeSnapshot('2024-01-02T00:00:00Z');
		const resolved = resolveConflict(local, remote, 'keepLocal');
		expect(resolved.cards.length).toBe(1);
		expect(resolved.cards[0].front).toBe('local');
	});

	it('keepRemote returns remote snapshot with updated exportedAt', () => {
		const local = makeSnapshot('2024-01-01T00:00:00Z');
		const remote = makeSnapshot('2024-01-02T00:00:00Z', {
			cards: [
				{
					id: 'c1',
					deckId: 'd1',
					front: 'remote',
					back: 'remote',
					interval: 0,
					repetitions: 0,
					easeFactor: 2.5,
					dueDate: '2024-01-02T00:00:00Z',
					createdAt: '2024-01-02T00:00:00Z',
					tags: []
				}
			]
		});
		const resolved = resolveConflict(local, remote, 'keepRemote');
		expect(resolved.cards.length).toBe(1);
		expect(resolved.cards[0].front).toBe('remote');
	});

	it('merge delegates to mergeSnapshots', () => {
		const local = makeSnapshot('2024-01-01T00:00:00Z', {
			cards: [
				{
					id: 'c1',
					deckId: 'd1',
					front: 'local',
					back: 'local',
					interval: 0,
					repetitions: 0,
					easeFactor: 2.5,
					dueDate: '2024-01-01T00:00:00Z',
					createdAt: '2024-01-01T00:00:00Z',
					tags: []
				}
			]
		});
		const remote = makeSnapshot('2024-01-02T00:00:00Z', {
			cards: [
				{
					id: 'c2',
					deckId: 'd1',
					front: 'remote',
					back: 'remote',
					interval: 0,
					repetitions: 0,
					easeFactor: 2.5,
					dueDate: '2024-01-02T00:00:00Z',
					createdAt: '2024-01-02T00:00:00Z',
					tags: []
				}
			]
		});
		const resolved = resolveConflict(local, remote, 'merge');
		expect(resolved.cards.length).toBe(2);
	});
});
