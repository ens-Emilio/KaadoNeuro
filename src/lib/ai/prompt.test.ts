import { describe, expect, it } from 'vitest';
import { parseAIProposal, buildGenerationPrompt, truncateSource, cardSignature } from '$lib/ai/prompt.js';
import { AIConfigSchema, AIGenerationRequestSchema, AIProposalSchema } from '$lib/ai/schemas.js';

describe('parseAIProposal', () => {
	it('parses valid JSON response', () => {
		const raw = JSON.stringify({
			deckName: 'Verbos irregulares',
			summary: '20 cartões de verbos em inglês',
			cards: [
				{ front: 'go', back: 'went/gone' },
				{ front: 'eat', back: 'ate/eaten' }
			]
		});
		const result = parseAIProposal(raw);
		expect(result.deckName).toBe('Verbos irregulares');
		expect(result.cards).toHaveLength(2);
		expect(result.cards[0].front).toBe('go');
	});

	it('rejects non-JSON', () => {
		expect(() => parseAIProposal('not json')).toThrow('JSON');
	});

	it('rejects missing deckName', () => {
		const raw = JSON.stringify({ summary: 'x', cards: [{ front: 'a', back: 'b' }] });
		expect(() => parseAIProposal(raw)).toThrow('formato esperado');
	});

	it('rejects empty cards array', () => {
		const raw = JSON.stringify({ deckName: 'x', summary: 'y', cards: [] });
		expect(() => parseAIProposal(raw)).toThrow('formato esperado');
	});

	it('rejects card with empty front', () => {
		const raw = JSON.stringify({ deckName: 'x', summary: 'y', cards: [{ front: '', back: 'b' }] });
		expect(() => parseAIProposal(raw)).toThrow();
	});

	it('trims whitespace from cards', () => {
		const raw = JSON.stringify({
			deckName: 'Test',
			summary: 's',
			cards: [{ front: '  a  ', back: '  b  ' }]
		});
		const result = parseAIProposal(raw);
		expect(result.cards[0].front).toBe('a');
		expect(result.cards[0].back).toBe('b');
	});
});

describe('buildGenerationPrompt', () => {
	it('includes kind, source, count and deckName', () => {
		const prompt = buildGenerationPrompt({ kind: 'deck', source: 'Biologia', count: 20, deckName: 'Bio' });
		expect(prompt).toContain('baralho completo');
		expect(prompt).toContain('Biologia');
		expect(prompt).toContain('20');
		expect(prompt).toContain('Biologia');
	});

	it('omits deckName for cards kind', () => {
		const prompt = buildGenerationPrompt({ kind: 'cards', source: 'Tema', count: 10 });
		expect(prompt).toContain('lote de cartões');
		expect(prompt).not.toContain('Nome do baralho desejado: undefined');
	});
});

describe('truncateSource', () => {
	it('truncates to 12000 chars', () => {
		const long = 'a'.repeat(15000);
		expect(truncateSource(long)).toHaveLength(12000);
	});
});

describe('cardSignature', () => {
	it('normalizes case and whitespace', () => {
		expect(cardSignature({ front: '  A  ', back: ' B ' })).toBe('a::b');
	});
});

describe('AIConfigSchema', () => {
	it('accepts valid config', () => {
		const result = AIConfigSchema.safeParse({ provider: 'anthropic', model: 'claude-haiku-4-5', apiKey: 'sk-test' });
		expect(result.success).toBe(true);
	});

	it('rejects missing apiKey', () => {
		const result = AIConfigSchema.safeParse({ provider: 'openai', model: 'gpt-4o-mini', apiKey: '' });
		expect(result.success).toBe(false);
	});

	it('rejects invalid provider', () => {
		const result = AIConfigSchema.safeParse({ provider: 'invalid', model: 'm', apiKey: 'k' });
		expect(result.success).toBe(false);
	});
});

describe('AIGenerationRequestSchema', () => {
	it('accepts valid request', () => {
		const result = AIGenerationRequestSchema.safeParse({
			config: { provider: 'openai', model: 'gpt-4o-mini', apiKey: 'sk' },
			kind: 'deck',
			source: 'Tema',
			count: 20
		});
		expect(result.success).toBe(true);
	});

	it('rejects count over 30', () => {
		const result = AIGenerationRequestSchema.safeParse({
			config: { provider: 'openai', model: 'gpt-4o-mini', apiKey: 'sk' },
			kind: 'deck',
			source: 'Tema',
			count: 31
		});
		expect(result.success).toBe(false);
	});
});

describe('AIProposalSchema', () => {
	it('accepts valid proposal', () => {
		const result = AIProposalSchema.safeParse({
			deckName: 'Test',
			summary: 'Summary',
			cards: [{ front: 'a', back: 'b' }]
		});
		expect(result.success).toBe(true);
	});

	it('rejects more than 30 cards', () => {
		const cards = Array.from({ length: 31 }, (_, i) => ({ front: `f${i}`, back: `b${i}` }));
		const result = AIProposalSchema.safeParse({ deckName: 'x', summary: 'y', cards });
		expect(result.success).toBe(false);
	});
});
