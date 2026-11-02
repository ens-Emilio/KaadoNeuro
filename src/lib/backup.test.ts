import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildSnapshot, applySnapshot } from './backup.js';
import { decks, cards, reviewLogs } from './stores.js';

// Mock stores to avoid Svelte store side effects in tests
vi.mock('./stores.js', () => ({
	decks: {
		set: vi.fn(),
		subscribe: vi.fn((fn) => {
			fn([]);
			return () => {};
		})
	},
	cards: {
		set: vi.fn(),
		subscribe: vi.fn((fn) => {
			fn([]);
			return () => {};
		})
	},
	reviewLogs: {
		set: vi.fn(),
		subscribe: vi.fn((fn) => {
			fn([]);
			return () => {};
		})
	}
}));

async function computeChecksum(jsonString: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(jsonString);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('Backup integrity validation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('buildSnapshot', () => {
		it('returns snapshot with checksum field', async () => {
			const snapshot = await buildSnapshot();
			expect(snapshot.checksum).toBeDefined();
			expect(typeof snapshot.checksum).toBe('string');
			expect(snapshot.checksum!.length).toBe(64);
			expect(snapshot.version).toBe(1);
			expect(Array.isArray(snapshot.decks)).toBe(true);
			expect(Array.isArray(snapshot.cards)).toBe(true);
			expect(Array.isArray(snapshot.reviewLogs)).toBe(true);
			expect(snapshot.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});

		it('checksum matches SHA-256 of serialized JSON without checksum', async () => {
			const snapshot = await buildSnapshot();
			const snapshotWithoutChecksum = {
				version: snapshot.version,
				decks: snapshot.decks,
				cards: snapshot.cards,
				reviewLogs: snapshot.reviewLogs,
				exportedAt: snapshot.exportedAt
			};
			const jsonString = JSON.stringify(snapshotWithoutChecksum, null, 2);
			const expectedChecksum = await computeChecksum(jsonString);
			expect(snapshot.checksum).toBe(expectedChecksum);
		});
	});

	describe('applySnapshot', () => {
		it('accepts valid snapshot with correct checksum', async () => {
			const snapshot = await buildSnapshot();
			const result = await applySnapshot(snapshot);
			expect(result).toEqual(snapshot);
		});

		it('rejects snapshot with invalid checksum', async () => {
			const snapshot = await buildSnapshot();
			const tampered = { ...snapshot, checksum: '0'.repeat(64) };
			await expect(applySnapshot(tampered)).rejects.toThrow(
				'Backup integrity check failed: checksum mismatch'
			);
		});

		it('rejects snapshot with corrupted data and matching wrong checksum', async () => {
			const snapshot = await buildSnapshot();
			const corrupted = {
				...snapshot,
				decks: [{ id: 'fake', name: 'Fake', createdAt: new Date().toISOString() }],
				checksum: '0'.repeat(64)
			};
			await expect(applySnapshot(corrupted)).rejects.toThrow(
				'Backup integrity check failed: checksum mismatch'
			);
		});

		it('accepts backward-compatible snapshot without checksum (with warning)', async () => {
			const snapshot = await buildSnapshot();
			const { checksum, ...legacySnapshot } = snapshot;
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await applySnapshot(legacySnapshot);
			expect(result.version).toBe(1);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Importing snapshot without checksum verification')
			);

			consoleSpy.mockRestore();
		});

		it('throws ZodError for invalid snapshot structure', async () => {
			const invalidSnapshot = { version: 99, decks: 'not-an-array' };
			await expect(applySnapshot(invalidSnapshot)).rejects.toThrow();
		});
	});
});
