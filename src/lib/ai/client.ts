import { parseAIProposal } from './prompt.js';
import type { AIConfig, AIProvider } from './types.js';
import { AI_PROVIDER_PRESETS } from './types.js';

function endpointFor(config: AIConfig, path: 'chat' | 'models') {
	switch (config.provider) {
		case 'anthropic':
			return path === 'chat' ? 'https://api.anthropic.com/v1/messages' : 'https://api.anthropic.com/v1/models';
		case 'openai':
			return path === 'chat' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.openai.com/v1/models';
		case 'openrouter':
			return path === 'chat' ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://openrouter.ai/api/v1/models';
		case 'gemini':
			return path === 'chat'
				? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`
				: 'https://generativelanguage.googleapis.com/v1beta/models';
		case 'compatible': {
			if (!config.baseUrl) throw new Error('A URL é obrigatória para providers compatíveis.');
			const url = new URL(config.baseUrl);
			if (url.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
				throw new Error('HTTP sem TLS só é permitido para providers locais.');
			}
			const base = url.toString().replace(/\/+$/, '');
			if (path === 'chat') return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
			return base.replace(/\/chat\/completions$/, '/models').replace(/\/v1$/, '/v1/models');
		}
	}
}

function headers(config: AIConfig): Record<string, string> {
	if (config.provider === 'anthropic') return { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' };
	if (config.provider === 'gemini') return { 'x-goog-api-key': config.apiKey };
	return { Authorization: `Bearer ${config.apiKey}` };
}

async function readJson(response: Response): Promise<unknown> {
	const text = await response.text();
	if (!response.ok) throw new Error(`Provider respondeu ${response.status}: ${text.slice(0, 300)}`);
	try {
		return JSON.parse(text);
	} catch {
		throw new Error('O provider respondeu algo que não é JSON.');
	}
}

function textFrom(body: unknown, provider: AIConfig['provider']) {
	if (!body || typeof body !== 'object') throw new Error('Resposta vazia.');
	if (provider === 'anthropic' && 'content' in body && Array.isArray(body.content)) {
		const parts = body.content.map((part) => (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string' ? part.text : '')).filter(Boolean);
		if (parts.length) return parts.join('\n');
	}
	if (provider === 'gemini' && 'candidates' in body && Array.isArray(body.candidates)) {
		const first = body.candidates[0];
		if (first && typeof first === 'object' && 'content' in first && first.content && typeof first.content === 'object' && 'parts' in first.content && Array.isArray(first.content.parts)) {
			const parts = (first.content.parts as unknown[]).map((part) => (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string' ? part.text : '')).filter(Boolean);
			if (parts.length) return parts.join('\n');
		}
	}
	if ('choices' in body && Array.isArray(body.choices)) {
		const first = body.choices[0];
		if (first && typeof first === 'object' && 'message' in first && first.message && typeof first.message === 'object' && 'content' in first.message && typeof first.message.content === 'string') return first.message.content;
	}
	throw new Error('Resposta sem conteúdo textual.');
}

type PromptContent = string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;

function providerSupportsVision(provider: AIProvider): boolean {
	return AI_PROVIDER_PRESETS.find((p) => p.id === provider)?.supportsVision ?? false;
}

function bodyFor(config: AIConfig, prompt: PromptContent) {
	const isMultimodal = Array.isArray(prompt);
	if (isMultimodal && !providerSupportsVision(config.provider)) {
		throw new Error('Este provedor não suporta imagens.');
	}
	if (config.provider === 'anthropic') {
		const content = isMultimodal
			? prompt.map((p) => p.type === 'text' ? { type: 'text', text: p.text } : { type: 'image', source: { type: 'base64', media_type: 'image/png', data: p.image_url.url.replace(/^data:image\/\w+;base64,/, '') } })
			: prompt;
		return { model: config.model, max_tokens: 5000, messages: [{ role: 'user', content }] };
	}
	if (config.provider === 'gemini') {
		const parts = isMultimodal
			? prompt.map((p) => p.type === 'text' ? { text: p.text } : { inline_data: { mime_type: 'image/png', data: p.image_url.url.replace(/^data:image\/\w+;base64,/, '') } })
			: [{ text: prompt }];
		return { contents: [{ role: 'user', parts }], generationConfig: { maxOutputTokens: 5000 } };
	}
	const content = isMultimodal ? prompt : prompt;
	return { model: config.model, messages: [{ role: 'system', content: 'Responda somente JSON válido.' }, { role: 'user', content }], temperature: 0.3 };
}

async function request(config: AIConfig, prompt: PromptContent) {
	const response = await fetch(endpointFor(config, 'chat'), {
		method: 'POST',
		headers: { 'content-type': 'application/json', Accept: 'application/json', ...headers(config) },
		body: JSON.stringify(bodyFor(config, prompt))
	});
	return textFrom(await readJson(response), config.provider);
}

export async function testAIConnection(config: AIConfig) {
	const text = await request(config, 'Responda apenas TESTE.');
	return { ok: true as const, model: config.model, text };
}

export async function listModels(config: AIConfig) {
	const response = await fetch(endpointFor(config, 'models'), { headers: { Accept: 'application/json', ...headers(config) } });
	const body = await readJson(response);
	if (!body || typeof body !== 'object') throw new Error('Lista de modelos vazia.');
	let ids: string[] = [];
	if ('data' in body && Array.isArray(body.data)) {
		ids = body.data.map((item) => (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string' ? item.id : '')).filter(Boolean);
	}
	if ('models' in body && Array.isArray(body.models)) {
		ids = body.models.map((item) => (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string' ? item.name.replace(/^models\//, '') : '')).filter(Boolean);
	}
	if (!ids.length) throw new Error('Nenhum modelo acessível foi retornado.');
	return ids.sort();
}

export async function generateProposal(config: AIConfig, prompt: PromptContent) {
	return parseAIProposal(await request(config, prompt));
}

export function supportsVision(config: AIConfig): boolean {
	return providerSupportsVision(config.provider);
}