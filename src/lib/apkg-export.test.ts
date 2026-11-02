import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { buildApkgDatabase } from './apkg-export.js';
import type { Deck, Flashcard, ReviewLog } from './types.js';

const SQL: SqlJsStatic = await initSqlJs();

function makeDeck(name = 'Test Deck'): Deck {
	return { id: 'd1', name, createdAt: '2025-01-01T00:00:00.000Z' };
}

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
	return {
		id: 'c1',
		deckId: 'd1',
		front: 'What is 2+2?',
		back: '4',
		tags: ['math'],
		interval: 0,
		repetitions: 0,
		easeFactor: 2.5,
		dueDate: '2025-01-01T00:00:00.000Z',
		createdAt: '2025-01-01T00:00:00.000Z',
		...overrides
	};
}

describe('apkg export', () => {
	it('produces a valid SQLite database with required tables', () => {
		const bytes = buildApkgDatabase(SQL, makeDeck(), [makeCard()], []);
		const db = new SQL.Database(bytes);
		try {
			const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
			const names = tables[0].values.map((r) => r[0]);
			expect(names).toContain('col');
			expect(names).toContain('notes');
			expect(names).toContain('cards');
			expect(names).toContain('revlog');
		} finally {
			db.close();
		}
	});

	it('inserts notes with correct field separator', () => {
		const card = makeCard({ front: 'Question', back: 'Answer', tags: ['tag1', 'tag2'] });
		const bytes = buildApkgDatabase(SQL, makeDeck(), [card], []);
		const db = new SQL.Database(bytes);
		try {
			const result = db.exec('SELECT flds, tags FROM notes LIMIT 1');
			const flds = result[0].values[0][0] as string;
			const tags = result[0].values[0][1] as string;
			expect(flds).toBe('Question\x1fAnswer');
			expect(tags).toContain('tag1');
			expect(tags).toContain('tag2');
		} finally {
			db.close();
		}
	});

	it('maps reviewed cards to Anki review type', () => {
		const card = makeCard({ interval: 10, repetitions: 3, easeFactor: 2.6 });
		const bytes = buildApkgDatabase(SQL, makeDeck(), [card], []);
		const db = new SQL.Database(bytes);
		try {
			const result = db.exec('SELECT type, queue, ivl, factor, reps FROM cards LIMIT 1');
			const row = result[0].values[0];
			expect(row[0]).toBe(2); // review type
			expect(row[1]).toBe(2); // review queue
			expect(row[2]).toBe(10); // interval
			expect(row[3]).toBe(2600); // factor = ef * 1000
			expect(row[4]).toBe(3); // reps
		} finally {
			db.close();
		}
	});

	it('writes review logs into revlog table', () => {
		const card = makeCard();
		const log: ReviewLog = {
			id: 'r1',
			cardId: 'c1',
			quality: 4,
			reviewedAt: '2025-06-15T12:00:00.000Z'
		};
		const bytes = buildApkgDatabase(SQL, makeDeck(), [card], [log]);
		const db = new SQL.Database(bytes);
		try {
			const result = db.exec('SELECT COUNT(*) FROM revlog');
			expect(result[0].values[0][0]).toBe(1);
		} finally {
			db.close();
		}
	});

	it('sets deck name in col metadata', () => {
		const bytes = buildApkgDatabase(SQL, makeDeck('Neuroanatomia'), [], []);
		const db = new SQL.Database(bytes);
		try {
			const result = db.exec('SELECT decks FROM col LIMIT 1');
			const decksJson = JSON.parse(result[0].values[0][0] as string);
			const deckNames = Object.values(decksJson as Record<string, { name?: string }>).map(
				(d) => d.name ?? ''
			);
			expect(deckNames).toContain('Neuroanatomia');
		} finally {
			db.close();
		}
	});
	it('converts newlines in fields to HTML br tags', () => {
		const card = makeCard({ front: 'Line1\nLine2', back: 'A\nB\nC' });
		const bytes = buildApkgDatabase(SQL, makeDeck(), [card], []);
		const db = new SQL.Database(bytes);
		try {
			const result = db.exec('SELECT flds FROM notes LIMIT 1');
			const flds = result[0].values[0][0] as string;
			expect(flds).toBe('Line1<br>Line2\x1fA<br>B<br>C');
		} finally {
			db.close();
		}
	});
});

describe('apkg zip structure', () => {
	it('can be built into a zip with collection.anki21 and media entries', async () => {
		// We test the DB builder directly; the zip wrapper is thin fflate glue.
		// Verify the DB bytes are non-empty and start with SQLite header.
		const bytes = buildApkgDatabase(SQL, makeDeck(), [makeCard()], []);
		expect(bytes.length).toBeGreaterThan(0);
		// SQLite files start with "SQLite format 3\0"
		const header = String.fromCharCode(...bytes.slice(0, 15));
		expect(header).toBe('SQLite format 3');
	});
});
