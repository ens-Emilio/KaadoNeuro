import { AIProposalSchema, AIClozeProposalSchema } from './schemas.js';
import type { AICardProposal, AIGenerationInput, AIProposal, AIClozeProposal } from './types.js';

const MAX_SOURCE_LENGTH = 12000;

export function buildGenerationPrompt(
	input: AIGenerationInput
):
	| string
	| Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> {
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
	if (start === -1 || end === -1 || end <= start)
		throw new Error('Resposta da IA não contém JSON válido.');
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

export function buildClozePrompt(input: AIGenerationInput & { kind: 'cloze' }): string {
	return `Você gera material de revisão para um app de flashcards.
Tarefa: criar cartões do tipo cloze (omissão de palavras).
Fonte ou tema: ${input.source}
Quantidade de cartões: ${input.count}
Nome do baralho desejado: ${input.deckName ?? ''}
Responda APENAS JSON válido.
Formato:
{
  "deckName": "string",
  "summary": "string",
  "cards": [{ "text": "string com {{c1::resposta}}", "clozes": ["resposta"] }]
}
Regras:
- português brasileiro
- extraia conceitos-chave do texto fonte
- use o formato {{c1::resposta}} para marcar as omissões
- cada cartão deve ter pelo menos uma omissão
- o campo "clozes" lista apenas os textos dentro das marcações {{cN::...}}, sem as chaves
- numeração das omissões começa em c1 e pode ter múltiplas por cartão (c2, c3...)
- sem markdown extra
- sem explicações
- sem repetição
- sem texto fora do JSON`;
}

export function parseAIClozeProposal(raw: string): AIClozeProposal {
	const trimmed = raw.trim();
	const start = trimmed.indexOf('{');
	const end = trimmed.lastIndexOf('}');
	if (start === -1 || end === -1 || end <= start)
		throw new Error('Resposta da IA não contém JSON válido.');
	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed.slice(start, end + 1));
	} catch {
		throw new Error('Resposta da IA contém JSON inválido.');
	}
	const result = AIClozeProposalSchema.safeParse(parsed);
	if (!result.success) throw new Error('Resposta da IA não trouxe o formato esperado.');
	return { kind: 'cloze', ...result.data };
}

export function truncateSource(source: string) {
	return source.slice(0, MAX_SOURCE_LENGTH);
}

export function cardSignature(card: AICardProposal) {
	return `${card.front.trim().toLowerCase()}::${card.back.trim().toLowerCase()}`;
}
