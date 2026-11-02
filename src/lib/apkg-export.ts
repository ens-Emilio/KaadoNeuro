import { zipSync } from 'fflate';
import type { SqlJsStatic, Database } from 'sql.js';
import type { Deck, Flashcard, ReviewLog } from './types.js';

const FIELD_SEPARATOR = '\x1f';

/** Anki model ID for our basic front/back note type. */
const MODEL_ID = 1700000000000;
/** Anki deck ID for the exported deck. */
const DECK_ID = 1700000000001;

/** Minimal Anki collection schema — only tables needed for import. */
const SCHEMA_SQL = `
CREATE TABLE col (
	id INTEGER PRIMARY KEY,
	crt INTEGER NOT NULL,
	mod INTEGER NOT NULL,
	scm INTEGER NOT NULL,
	ver INTEGER NOT NULL,
	dty INTEGER NOT NULL,
	usn INTEGER NOT NULL,
	ls INTEGER NOT NULL,
	conf TEXT NOT NULL,
	models TEXT NOT NULL,
	decks TEXT NOT NULL,
	tags TEXT NOT NULL
);
CREATE TABLE notes (
	id INTEGER PRIMARY KEY,
	guid TEXT NOT NULL,
	mid INTEGER NOT NULL,
	mod INTEGER NOT NULL,
	usn INTEGER NOT NULL,
	tags TEXT NOT NULL,
	flds TEXT NOT NULL,
	sfld INTEGER NOT NULL,
	csum INTEGER NOT NULL,
	flags INTEGER NOT NULL,
	data TEXT NOT NULL
);
CREATE TABLE cards (
	id INTEGER PRIMARY KEY,
	nid INTEGER NOT NULL,
	did INTEGER NOT NULL,
	ord INTEGER NOT NULL,
	mod INTEGER NOT NULL,
	usn INTEGER NOT NULL,
	type INTEGER NOT NULL,
	queue INTEGER NOT NULL,
	due INTEGER NOT NULL,
	ivl INTEGER NOT NULL,
	factor INTEGER NOT NULL,
	reps INTEGER NOT NULL,
	lapses INTEGER NOT NULL,
	left INTEGER NOT NULL,
	odue INTEGER NOT NULL,
	odid INTEGER NOT NULL,
	flags INTEGER NOT NULL,
	data TEXT NOT NULL
);
CREATE TABLE revlog (
	id INTEGER PRIMARY KEY,
	cid INTEGER NOT NULL,
	usn INTEGER NOT NULL,
	ease INTEGER NOT NULL,
	ivl INTEGER NOT NULL,
	lastIvl INTEGER NOT NULL,
	factor INTEGER NOT NULL,
	time INTEGER NOT NULL,
	type INTEGER NOT NULL
);
`;

function simpleHash(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) {
		h = ((h << 5) - h + s.charCodeAt(i)) | 0;
	}
	return Math.abs(h);
}

function buildModelsJson(): string {
	const model = {
		id: MODEL_ID,
		name: 'KaadoNeuro Basic',
		type: 0,
		mod: Date.now(),
		usn: -1,
		sortf: 0,
		did: DECK_ID,
		tmpls: [
			{
				name: 'Card 1',
				ord: 0,
				qfmt: '{{Front}}',
				afmt: '{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}',
				bqfmt: '',
				bafmt: '',
				did: null,
				bfont: '',
				bsize: 0
			}
		],
		flds: [
			{ name: 'Front', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20 },
			{ name: 'Back', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20 }
		],
		css: '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }',
		latexPre: '',
		latexPost: '',
		latexsvg: false,
		req: [[0, 'any', [0]]]
	};
	return JSON.stringify({ [String(MODEL_ID)]: model });
}

function buildDecksJson(deckName: string): string {
	const defaultDeck = {
		id: 1,
		name: 'Default',
		mod: Date.now(),
		usn: -1,
		lrnToday: [0, 0],
		revToday: [0, 0],
		newToday: [0, 0],
		timeToday: [0, 0],
		collapsed: false,
		browserCollapsed: false,
		desc: '',
		dyn: 0,
		conf: 1,
		extendNew: 10,
		extendRev: 50
	};
	const userDeck = {
		...defaultDeck,
		id: DECK_ID,
		name: deckName
	};
	return JSON.stringify({ '1': defaultDeck, [String(DECK_ID)]: userDeck });
}

function buildConfJson(): string {
	return JSON.stringify({
		activeDecks: [1, DECK_ID],
		curDeck: DECK_ID,
		newSpread: 0,
		collapseTime: 1200,
		timeLim: 0,
		estTimes: true,
		nextPos: 1,
		sortType: 'noteFld',
		sortBackwards: false,
		addonconf: {},
		dayLearnFirst: false
	});
}

function mapCardToAnki(card: Flashcard): {
	type: number;
	queue: number;
	due: number;
	ivl: number;
	factor: number;
	reps: number;
	lapses: number;
} {
	const isNew = card.repetitions === 0 && card.interval === 0;
	if (isNew) {
		return { type: 0, queue: 0, due: 0, ivl: 0, factor: 0, reps: 0, lapses: 0 };
	}
	const ivl = Math.max(1, Math.round(card.interval));
	const factor = Math.round(card.easeFactor * 1000);
	const now = Date.now();
	const dueDate = new Date(card.dueDate).getTime();
	const dueDays = Math.round((dueDate - now) / 86400000);
	return {
		type: 2, // review card
		queue: 2, // review queue
		due: dueDays,
		ivl,
		factor,
		reps: card.repetitions,
		lapses: 0
	};
}

/**
 * Build an .apkg-compatible SQLite database from KaadoNeuro data.
 * Exported for testing; browser callers use exportApkgFile().
 */
export function buildApkgDatabase(
	SQL: SqlJsStatic,
	deck: Deck,
	cards: Flashcard[],
	reviewLogs: ReviewLog[]
): Uint8Array {
	const db: Database = new SQL.Database();
	try {
		db.run(SCHEMA_SQL);

		const now = Math.floor(Date.now() / 1000);
		db.run(
			'INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, tags) VALUES (1, ?, ?, ?, 11, 0, -1, 0, ?, ?, ?, ?)',
			[now, now, now, buildConfJson(), buildModelsJson(), buildDecksJson(deck.name), '{}']
		);

		const noteInsert = db.prepare(
			'INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data) VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, ?)'
		);
		const cardInsert = db.prepare(
			'INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data) VALUES (?, ?, ?, 0, ?, -1, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?)'
		);

		const cardIdMap = new Map<string, number>();

		for (let i = 0; i < cards.length; i++) {
			const card = cards[i];
			const noteId = Date.now() + i;
			const cardId = noteId + 1000000;
			cardIdMap.set(card.id, cardId);

			const front = card.front.replace(/\n/g, '<br>');
			const back = card.back.replace(/\n/g, '<br>');
			const flds = `${front}${FIELD_SEPARATOR}${back}`;
			const tags = card.tags.length > 0 ? ` ${card.tags.join(' ')} ` : '';
			const csum = simpleHash(front);

			noteInsert.run([
				noteId,
				card.id.slice(0, 10),
				MODEL_ID,
				now,
				tags,
				flds,
				simpleHash(front),
				csum,
				''
			]);

			const anki = mapCardToAnki(card);
			cardInsert.run([
				cardId,
				noteId,
				DECK_ID,
				now,
				anki.type,
				anki.queue,
				anki.due,
				anki.ivl,
				anki.factor,
				anki.reps,
				anki.lapses,
				''
			]);
		}

		noteInsert.free();
		cardInsert.free();

		if (reviewLogs.length > 0) {
			const revInsert = db.prepare(
				'INSERT OR IGNORE INTO revlog (id, cid, usn, ease, ivl, lastIvl, factor, time, type) VALUES (?, ?, -1, ?, ?, ?, ?, ?, ?)'
			);
			for (const log of reviewLogs) {
				const cid = cardIdMap.get(log.cardId);
				if (!cid) continue;
				const card = cards.find((c) => c.id === log.cardId);
				const factor = card ? Math.round(card.easeFactor * 1000) : 2500;
				const ts = new Date(log.reviewedAt).getTime();
				revInsert.run([ts, cid, log.quality, 0, 0, factor, 0, 0]);
			}
			revInsert.free();
		}

		return db.export();
	} finally {
		db.close();
	}
}

/**
 * Browser entry point. Lazy-loads sql.js WASM and produces a downloadable .apkg blob.
 */
export async function exportApkgFile(
	deck: Deck,
	cards: Flashcard[],
	reviewLogs: ReviewLog[]
): Promise<Blob> {
	const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
		import('sql.js'),
		import('sql.js/dist/sql-wasm.wasm?url')
	]);
	const SQL = await initSqlJs({ locateFile: () => wasmUrl });

	const dbBytes = buildApkgDatabase(SQL, deck, cards, reviewLogs);
	const mediaJson = new TextEncoder().encode('{}');

	const archive = zipSync({
		'collection.anki21': dbBytes,
		media: mediaJson
	});

	return new Blob([archive], { type: 'application/octet-stream' });
}

/**
 * Trigger a browser download for the generated .apkg file.
 */
export function downloadApkg(blob: Blob, deckName: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.apkg`;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
