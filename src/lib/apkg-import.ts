import { unzipSync } from 'fflate';
import { decompress } from 'fzstd';
import type { Database, SqlJsStatic } from 'sql.js';
import type { ParsedCard } from './import.js';

/** Anki stores note fields separated by the ASCII unit separator. */
const FIELD_SEPARATOR = '\x1f';

/** Anki 2.1.50+ stores the collection zstd-compressed. */
const ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

export interface ParsedApkg {
	deckName: string;
	cards: ParsedCard[];
	/** Notes that were skipped, so the UI can say so instead of silently dropping them. */
	skipped: number;
}

export class ApkgError extends Error {}

function isZstd(bytes: Uint8Array): boolean {
	return ZSTD_MAGIC.every((byte, index) => bytes[index] === byte);
}

/** Pull the SQLite collection out of the .apkg zip, preferring the newest format. */
export function extractApkgCollection(archive: Uint8Array): Uint8Array {
	let files: Record<string, Uint8Array>;
	try {
		files = unzipSync(archive);
	} catch {
		throw new ApkgError('not-a-zip');
	}

	const collection = files['collection.anki21'] ?? files['collection.anki2'];
	if (!collection) throw new ApkgError('no-collection');
	return isZstd(collection) ? decompress(collection) : collection;
}

/** Anki fields are HTML; the markdown renderer expects markdown. */
function fieldToText(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/(div|p|li)>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function readDeckNames(db: Database): Map<string, string> {
	const names = new Map<string, string>();
	const result = db.exec('SELECT decks FROM col LIMIT 1');
	const raw = result[0]?.values[0]?.[0];
	if (typeof raw !== 'string') return names;
	try {
		const decks = JSON.parse(raw) as Record<string, { name?: string }>;
		for (const [id, deck] of Object.entries(decks)) {
			if (deck?.name) names.set(id, deck.name);
		}
	} catch {
		// A corrupt deck map should not fail the whole import; cards still import.
	}
	return names;
}

/**
 * Read notes, their tags, and the deck they belong to out of an Anki collection.
 * The caller owns the SQL module so this stays testable without a browser.
 */
export function parseApkgCollection(SQL: SqlJsStatic, collection: Uint8Array): ParsedApkg {
	let db: Database;
	try {
		db = new SQL.Database(collection);
	} catch {
		throw new ApkgError('bad-database');
	}

	try {
		const deckNames = readDeckNames(db);

		const deckCounts = new Map<string, number>();
		const cardRows = db.exec('SELECT nid, did FROM cards');
		for (const row of cardRows[0]?.values ?? []) {
			const did = String((row as [number, number])[1]);
			deckCounts.set(did, (deckCounts.get(did) ?? 0) + 1);
		}

		const dominantDeckId = [...deckCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
		const deckName = (dominantDeckId && deckNames.get(dominantDeckId)) || 'Anki';

		const cards: ParsedCard[] = [];
		let skipped = 0;
		const noteRows = db.exec('SELECT id, flds, tags FROM notes');
		for (const row of noteRows[0]?.values ?? []) {
			const [, flds, tags] = row as [number, string, string];
			const fields = String(flds ?? '')
				.split(FIELD_SEPARATOR)
				.map(fieldToText);
			const front = fields[0] ?? '';
			const back = fields.slice(1).filter(Boolean).join('\n\n');
			if (!front || !back) {
				skipped++;
				continue;
			}
			const tagList = String(tags ?? '')
				.split(/\s+/)
				.filter(Boolean);
			const clozeMatch = back.match(/\{\{(.+?)\}\}/);
			cards.push({
				front,
				back,
				...(clozeMatch ? { cloze: clozeMatch[1].trim() } : {}),
				...(tagList.length > 0 ? { tags: tagList } : {})
			});
		}

		if (cards.length === 0 && skipped === 0) throw new ApkgError('empty-collection');
		return { deckName, cards, skipped };
	} finally {
		db.close();
	}
}

/**
 * Browser entry point. sql.js is imported lazily so its WASM payload never
 * ships in the main bundle for users who never import an .apkg.
 */
export async function importApkgFile(bytes: Uint8Array): Promise<ParsedApkg> {
	const collection = extractApkgCollection(bytes);
	const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
		import('sql.js'),
		import('sql.js/dist/sql-wasm.wasm?url')
	]);
	const SQL = await initSqlJs({ locateFile: () => wasmUrl });
	return parseApkgCollection(SQL, collection);
}
