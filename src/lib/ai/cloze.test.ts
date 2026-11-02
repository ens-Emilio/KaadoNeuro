import { describe, it, expect } from 'vitest';
import { buildClozePrompt, parseAIClozeProposal } from './prompt.js';
import type { AIGenerationInput } from './types.js';

function makeClozeInput(
	overrides: Partial<Omit<AIGenerationInput, 'kind'>> = {}
): AIGenerationInput & { kind: 'cloze' } {
	return {
		kind: 'cloze',
		source: 'Mitocôndria é a organela responsável pela produção de energia celular.',
		count: 5,
		deckName: 'Biologia Celular',
		...overrides
	};
}

describe('buildClozePrompt', () => {
	it('includes cloze format instructions', () => {
		const prompt = buildClozePrompt(makeClozeInput());
		expect(prompt).toContain('{{c1::');
		expect(prompt).toContain('cloze');
	});

	it('includes source text and count', () => {
		const input = makeClozeInput({ source: 'Texto teste', count: 3 });
		const prompt = buildClozePrompt(input);
		expect(prompt).toContain('Texto teste');
		expect(prompt).toContain('3');
	});

	it('requests JSON-only response', () => {
		const prompt = buildClozePrompt(makeClozeInput());
		expect(prompt).toContain('JSON válido');
		expect(prompt).toContain('"text"');
		expect(prompt).toContain('"clozes"');
	});
});

describe('parseAIClozeProposal', () => {
	it('parses valid cloze JSON', () => {
		const raw = JSON.stringify({
			deckName: 'Teste',
			summary: 'Resumo',
			cards: [{ text: 'A {{c1::mitocôndria}} produz energia.', clozes: ['mitocôndria'] }]
		});
		const result = parseAIClozeProposal(raw);
		expect(result.kind).toBe('cloze');
		expect(result.cards).toHaveLength(1);
		expect(result.cards[0].clozes).toEqual(['mitocôndria']);
	});

	it('extracts multiple cloze markers', () => {
		const raw = JSON.stringify({
			deckName: 'Multi',
			summary: 'S',
			cards: [{ text: '{{c1::A}} e {{c2::B}} são coisas.', clozes: ['A', 'B'] }]
		});
		const result = parseAIClozeProposal(raw);
		expect(result.cards[0].clozes).toEqual(['A', 'B']);
	});

	it('rejects invalid JSON', () => {
		expect(() => parseAIClozeProposal('not json at all')).toThrow();
	});

	it('rejects JSON missing required fields', () => {
		const raw = JSON.stringify({ deckName: 'X' });
		expect(() => parseAIClozeProposal(raw)).toThrow();
	});

	it('handles JSON wrapped in markdown fences', () => {
		const raw =
			'```json\n{"deckName":"F","summary":"S","cards":[{"text":"{{c1::ok}}","clozes":["ok"]}]}\n```';
		const result = parseAIClozeProposal(raw);
		expect(result.kind).toBe('cloze');
		expect(result.cards[0].text).toContain('{{c1::ok}}');
	});

	it('rejects cards with empty clozes array', () => {
		const raw = JSON.stringify({
			deckName: 'E',
			summary: 'S',
			cards: [{ text: 'Sem cloze', clozes: [] }]
		});
		expect(() => parseAIClozeProposal(raw)).toThrow();
	});
});
