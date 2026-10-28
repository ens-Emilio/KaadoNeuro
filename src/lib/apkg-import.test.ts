import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { ApkgError, extractApkgCollection, parseApkgCollection } from './apkg-import.js';

/** Build a minimal collection with the tables the importer reads. */
function buildCollection(SQL: SqlJsStatic, fields: string[]): Uint8Array {
	const db = new SQL.Database();
	db.run('CREATE TABLE col (decks TEXT)');
	db.run('CREATE TABLE notes (id INTEGER PRIMARY KEY, flds TEXT, tags TEXT)');
	db.run('CREATE TABLE cards (nid INTEGER, did INTEGER)');
	db.run('INSERT INTO col (decks) VALUES (?)', [
		JSON.stringify({ '1': { name: 'Neuroanatomia' } })
	]);
	const insert = db.prepare('INSERT INTO notes (id, flds, tags) VALUES (?, ?, ?)');
	fields.forEach((flds, index) => insert.run([index + 1, flds, index === 0 ? 'prova bloco1' : '']));
	insert.free();
	const link = db.prepare('INSERT INTO cards (nid, did) VALUES (?, ?)');
	fields.forEach((_, index) => link.run([index + 1, 1]));
	link.free();
	const bytes = db.export();
	db.close();
	return bytes;
}

const SQL = await initSqlJs();

describe('apkg import', () => {
	it('reads notes, deck name, and tags from an Anki collection', () => {
		const collection = buildCollection(SQL, [
			'Qual o nervo?\x1fVago',
			'Onde fica?\x1fTronco encefálico'
		]);
		const parsed = parseApkgCollection(SQL, collection);

		expect(parsed.deckName).toBe('Neuroanatomia');
		expect(parsed.cards).toHaveLength(2);
		expect(parsed.cards[0]).toMatchObject({ front: 'Qual o nervo?', back: 'Vago' });
		expect(parsed.cards[0].tags).toEqual(['prova', 'bloco1']);
	});

	it('converts Anki HTML into readable text', () => {
		const parsed = parseApkgCollection(
			SQL,
			buildCollection(SQL, ['<b>Pergunta</b><br>linha\x1f<div>Resposta</div>'])
		);
		expect(parsed.cards[0].front).toBe('Pergunta\nlinha');
		expect(parsed.cards[0].back).toBe('Resposta');
	});

	it('counts notes without a back side instead of importing them empty', () => {
		const parsed = parseApkgCollection(SQL, buildCollection(SQL, ['Só frente\x1f']));
		expect(parsed.cards).toHaveLength(0);
		expect(parsed.skipped).toBe(1);
	});

	it('extracts the collection from a zipped package', () => {
		const collection = buildCollection(SQL, ['a\x1fb']);
		const archive = zipSync({ 'collection.anki2': collection });
		expect(extractApkgCollection(archive)).toEqual(collection);
	});

	it('prefers the newer collection file when both exist', () => {
		const older = strToU8('old');
		const newer = buildCollection(SQL, ['a\x1fb']);
		const archive = zipSync({ 'collection.anki2': older, 'collection.anki21': newer });
		expect(extractApkgCollection(archive)).toEqual(newer);
	});

	it('rejects archives without a collection', () => {
		const archive = zipSync({ media: strToU8('[]') });
		expect(() => extractApkgCollection(archive)).toThrow(ApkgError);
	});

	it('rejects data that is not a zip', () => {
		expect(() => extractApkgCollection(strToU8('definitely not a zip'))).toThrow(ApkgError);
	});
});
