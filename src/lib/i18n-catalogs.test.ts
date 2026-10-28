import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../messages');

function read(locale: string): Record<string, string> {
	return JSON.parse(readFileSync(resolve(root, `${locale}.json`), 'utf8')) as Record<
		string,
		string
	>;
}

describe('i18n catalogs', () => {
	const locales = [
		'ar',
		'de',
		'en',
		'es',
		'fr',
		'hi',
		'id',
		'ja',
		'ko',
		'pt-BR',
		'tr',
		'vi',
		'zh-CN'
	];

	it('have identical key sets', () => {
		const expected = Object.keys(read('en')).sort();
		for (const locale of locales) {
			expect(Object.keys(read(locale)).sort(), locale).toEqual(expected);
		}
	});

	it('include the messages used by review and import flows', () => {
		for (const locale of locales) {
			const catalog = read(locale);
			for (const key of ['tutorial.backupError', 'import.tooLarge', 'review.continue']) {
				expect(catalog[key], `${locale}:${key}`).toBeTruthy();
			}
		}
	});
});
