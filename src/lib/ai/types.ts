export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'openrouter' | 'compatible';

export type AITask = 'deck' | 'cards';

export interface AIConfig {
	provider: AIProvider;
	model: string;
	apiKey: string;
	baseUrl?: string;
}

export interface AICardProposal {
	front: string;
	back: string;
}

export interface AIProposal {
	kind: AITask;
	deckName: string;
	summary: string;
	cards: AICardProposal[];
}

export interface AIGenerationInput {
	kind: AITask;
	source: string;
	count: number;
	deckName?: string;
	imageBase64?: string;
}

export const AI_CARD_COUNTS = [10, 20, 30] as const;

export interface AIProviderPreset {
	id: AIProvider;
	label: string;
	baseUrl: string;
	defaultModel: string;
	requiresBaseUrl: boolean;
	supportsVision?: boolean;
}

export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
	{
		id: 'anthropic',
		label: 'Anthropic',
		baseUrl: 'https://api.anthropic.com/v1/messages',
		defaultModel: 'claude-haiku-4-5',
		requiresBaseUrl: false,
		supportsVision: true
	},
	{
		id: 'openai',
		label: 'OpenAI',
		baseUrl: 'https://api.openai.com/v1/chat/completions',
		defaultModel: 'gpt-4o-mini',
		requiresBaseUrl: false,
		supportsVision: true
	},
	{
		id: 'gemini',
		label: 'Google Gemini',
		baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
		defaultModel: 'gemini-2.0-flash',
		requiresBaseUrl: false,
		supportsVision: true
	},
	{
		id: 'openrouter',
		label: 'OpenRouter',
		baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
		defaultModel: 'openai/gpt-4o-mini',
		requiresBaseUrl: false,
		supportsVision: true
	},
	{
		id: 'compatible',
		label: 'OpenAI-compatible',
		baseUrl: '',
		defaultModel: 'local-model',
		requiresBaseUrl: true,
		supportsVision: false
	}
];
