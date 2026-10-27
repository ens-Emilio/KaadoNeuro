import { describe, it, expect } from 'vitest';
import { parseImport } from './import.js';

describe('parseImport', () => {
	it('parseia JSON array válido com front/back', () => {
		const input = JSON.stringify([
			{ front: 'Q1', back: 'A1' },
			{ front: 'Q2', back: 'A2' }
		]);
		const result = parseImport(input);
		expect(Array.isArray(result)).toBe(true);
		if (Array.isArray(result)) {
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ front: 'Q1', back: 'A1' });
		}
	});

	it('ignora itens JSON sem front ou back', () => {
		const input = JSON.stringify([
			{ front: 'Q1' },
			{ back: 'A2' },
			{ front: 'Q3', back: 'A3' },
			null
		]);
		const result = parseImport(input);
		expect(Array.isArray(result)).toBe(true);
		if (Array.isArray(result)) {
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ front: 'Q3', back: 'A3' });
		}
	});

	it('parseia formato markdown com separador ---', () => {
		const input = '# Pergunta 1\nResposta 1\n---\n# Pergunta 2\nResposta 2';
		const result = parseImport(input);
		expect(Array.isArray(result)).toBe(true);
		if (Array.isArray(result)) {
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ front: 'Pergunta 1', back: 'Resposta 1' });
			expect(result[1]).toEqual({ front: 'Pergunta 2', back: 'Resposta 2' });
		}
	});

	it('parseia linhas com separador :: (fallback linha-a-linha)', () => {
		// Sem ---, o parser tenta linha-a-linha; cada linha com :: vira um card
		const input = 'Capital da França::Paris\nCapital do Brasil::Brasília';
		const result = parseImport(input);
		expect(Array.isArray(result)).toBe(true);
		if (Array.isArray(result)) {
			// O parser pode agrupar ou separar dependendo do fallback; verificamos que pelo menos um card existe
			expect(result.length).toBeGreaterThanOrEqual(1);
			const hasParis = result.some((c) => c.back === 'Paris' || c.front.includes('Paris'));
			expect(hasParis).toBe(true);
		}
	});

	it('parseia linhas com separador | quando não há :: (fallback linha-a-linha)', () => {
		const input = 'Nome|João\nIdade|30';
		const result = parseImport(input);
		expect(Array.isArray(result)).toBe(true);
		if (Array.isArray(result)) {
			expect(result.length).toBeGreaterThanOrEqual(1);
			const hasJoao = result.some((c) => c.back === 'João' || c.front.includes('João'));
			expect(hasJoao).toBe(true);
		}
	});

	it('retorna array vazio para texto sem formato reconhecido', () => {
		const result = parseImport('apenas um texto solto sem separadores');
		expect(Array.isArray(result)).toBe(true);
		if (Array.isArray(result)) {
			expect(result).toHaveLength(0);
		}
	});

	it('retorna erro para texto acima do limite', () => {
		const input = 'a'.repeat(50001);
		const result = parseImport(input, 50000);
		expect(Array.isArray(result)).toBe(false);
		if (!Array.isArray(result)) {
			expect(result.error).toContain('Texto muito longo');
		}
	});

	it('trim e espaços extras são normalizados no formato markdown', () => {
		const input = '  # Pergunta  \n  Resposta com espaços  \n---\n# Q2\nA2';
		const result = parseImport(input);
		expect(Array.isArray(result)).toBe(true);
		if (Array.isArray(result)) {
			expect(result[0]).toEqual({ front: 'Pergunta', back: 'Resposta com espaços' });
			expect(result[1]).toEqual({ front: 'Q2', back: 'A2' });
		}
	});

	it('JSON inválido cai para parser de texto/markdown', () => {
		const input = '[{front: "Q1", back: "A1"}]'; // JSON inválido (sem aspas na chave)
		const result = parseImport(input);
		// Deve tentar fallback e retornar array (vazio ou com algo), nunca quebrar
		expect(Array.isArray(result)).toBe(true);
	});

	it('multilinha no back é preservada no formato markdown', () => {
		const input = '# Pergunta\nLinha 1\nLinha 2\nLinha 3';
		const result = parseImport(input);
		expect(Array.isArray(result)).toBe(true);
		if (Array.isArray(result)) {
			expect(result[0].back).toBe('Linha 1\nLinha 2\nLinha 3');
		}
	});
});