import { describe, it, expect } from 'vitest';
import {
	detectDelimiter,
	parseCsv,
	autoDetectMapping,
	mapRowsToCards,
	type CsvRow
} from './csv-import.js';

describe('detectDelimiter', () => {
	it('detects comma delimiter', () => {
		expect(detectDelimiter('a,b,c')).toBe(',');
	});

	it('detects semicolon delimiter when more frequent', () => {
		expect(detectDelimiter('a;b;c,d')).toBe(';');
	});

	it('defaults to comma when counts are equal', () => {
		expect(detectDelimiter('a,b;c')).toBe(',');
	});
});

describe('parseCsv', () => {
	it('parses simple comma-separated values', () => {
		const result = parseCsv('front,back\nQ1,A1\nQ2,A2');
		expect(result.headers).toEqual(['front', 'back']);
		expect(result.rows).toHaveLength(2);
		expect(result.errors).toHaveLength(0);
	});

	it('parses semicolon-separated values', () => {
		const result = parseCsv('front;back\nQ1;A1');
		expect(result.headers).toEqual(['front', 'back']);
		expect(result.rows[0][0]).toBe('Q1');
	});

	it('handles quoted fields with commas', () => {
		const result = parseCsv('front,back\n"Q, 1",A1');
		expect(result.rows[0][0]).toBe('Q, 1');
	});

	it('handles escaped quotes', () => {
		const result = parseCsv('front,back\n"Q ""1""",A1');
		expect(result.rows[0][0]).toBe('Q "1"');
	});

	it('returns empty headers for empty content', () => {
		const result = parseCsv('');
		expect(result.headers).toEqual(['']);
		expect(result.rows).toEqual([]);
	});
});

describe('autoDetectMapping', () => {
	it('maps standard English headers', () => {
		const mapping = autoDetectMapping(['Question', 'Answer', 'Tags']);
		expect(mapping.front).toBe(0);
		expect(mapping.back).toBe(1);
		expect(mapping.tags).toBe(2);
	});

	it('maps Portuguese headers', () => {
		const mapping = autoDetectMapping(['Pergunta', 'Resposta', 'Etiqueta']);
		expect(mapping.front).toBe(0);
		expect(mapping.back).toBe(1);
		expect(mapping.tags).toBe(2);
	});

	it('returns null for unrecognized headers', () => {
		const mapping = autoDetectMapping(['Col1', 'Col2']);
		expect(mapping.front).toBeNull();
		expect(mapping.back).toBeNull();
	});
});

describe('mapRowsToCards', () => {
	const rows: CsvRow[] = [{ 0: 'Q1', 1: 'A1', 2: 'tag1,tag2' }, { 0: 'Q2', 1: 'A2' } as CsvRow];
	const mapping = { front: 0, back: 1, tags: 2, cloze: null };

	it('maps rows to cards correctly', () => {
		const { cards, errors } = mapRowsToCards(rows, mapping);
		expect(cards).toHaveLength(2);
		expect(cards[0].tags).toEqual(['tag1', 'tag2']);
		expect(errors).toHaveLength(0);
	});

	it('reports error for missing front/back', () => {
		const badRows = [{ 0: 'Q1' }];
		const { cards, errors } = mapRowsToCards(badRows, mapping);
		expect(cards).toHaveLength(0);
		expect(errors.length).toBeGreaterThan(0);
	});
});
