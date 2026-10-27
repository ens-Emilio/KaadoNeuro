import { AIProposalSchema } from './schemas.js';
import type { AICardProposal, AIGenerationInput, AIProposal, AIProvider } from './types.js';

const MAX_SOURCE_LENGTH = 12000;

export function buildGenerationPrompt(input: AIGenerationInput): string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> {
	const kindLabel = input.kind === 'deck' ? 'baralho completo' : 'lote de cartões';
	const textPrompt = `Você gera material de revisão para um app de flashcards.
Tarefa: criar ${kindLabel}.
Fonte ou tema: ${input.source}
Quantidade de cartões: ${input.count}
Nome do baralho desejado: ${input.deckName ?? ''}
${input.imageBase64 ? 'A imagem anexada contém conteúdo adicional para gerar os cartões. Analise a imagem junto com o texto.' : ''}
Responda APENAS JSON válido.
Formato:
{
  "deckName": "string",
  "summary": "string",
  "cards": [{ "front": "string", "back": "string" }]
}
Regras:
- português brasileiro
- frentes curtas
- versos concisos
- sem markdown extra
- sem explicações
- sem repetição
- sem texto fora do JSON`;
	if (input.imageBase64) {
		return [
			{ type: 'text', text: textPrompt },
			{ type: 'image_url', image_url: { url: input.imageBase64 } }
		];
	}
	return textPrompt;
}

export function parseAIProposal(raw: string): AIProposal {
	const trimmed = raw.trim();
	const start = trimmed.indexOf('{');
	const end = trimmed.lastIndexOf('}');
	if (start === -1 || end === -1 || end <= start) throw new Error('Resposta da IA não contém JSON válido.');
	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed.slice(start, end + 1));
	} catch {
		throw new Error('Resposta da IA contém JSON inválido.');
	}
	const result = AIProposalSchema.safeParse(parsed);
	if (!result.success) throw new Error('Resposta da IA não trouxe o formato esperado.');
	return { kind: 'cards', ...result.data };
}

export function truncateSource(source: string) {
	return source.slice(0, MAX_SOURCE_LENGTH);
}

export function cardSignature(card: AICardProposal) {
	return `${card.front.trim().toLowerCase()}::${card.back.trim().toLowerCase()}`;
}
