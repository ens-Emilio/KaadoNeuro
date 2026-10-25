import { persisted } from 'svelte-local-storage-store';
import type { AIConfig, AIProvider } from './types.js';
import { AI_PROVIDER_PRESETS } from './types.js';

export interface StoredAIConfig {
	provider: AIProvider;
	model: string;
	apiKey: string;
	baseUrl?: string;
	updatedAt?: string;
}

export const aiConfig = persisted<StoredAIConfig | null>('kaadoneuro_ai_config', null);

export function normalizeAIConfig(config: StoredAIConfig | null): AIConfig | null {
	if (!config) return null;
	const provider = AI_PROVIDER_PRESETS.find((preset) => preset.id === config.provider);
	if (!provider) return null;
	return {
		provider: config.provider,
		model: config.model.trim(),
		apiKey: config.apiKey.trim(),
		baseUrl: config.baseUrl?.trim() || undefined
	};
}
