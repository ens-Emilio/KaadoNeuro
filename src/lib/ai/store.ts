import { get } from 'svelte/store';
import { persisted } from 'svelte-local-storage-store';
import type { AIConfig, AIProvider } from './types.js';
import { AI_PROVIDER_PRESETS } from './types.js';
import { isLegacySecret, storeSecret, useSecret } from '../secret-vault.js';

export interface StoredAIConfig {
	provider: AIProvider;
	model: string;
	apiKey: string;
	baseUrl?: string;
	updatedAt?: string;
}

export const aiConfig = persisted<StoredAIConfig | null>('kaadoneuro_ai_config', null, {
	serializer: {
		stringify: (value) => JSON.stringify(value),
		parse: (raw) => {
			try {
				return JSON.parse(raw ?? 'null') as StoredAIConfig | null;
			} catch {
				return null;
			}
		}
	}
});

export function needsSecretMigration(config: StoredAIConfig | null): boolean {
	return Boolean(config?.apiKey && isLegacySecret(config.apiKey));
}

/** Runs one AI request with the key scoped to the callback. */
export async function withAIConfig<T>(
	config: StoredAIConfig,
	callback: (config: AIConfig) => Promise<T>
): Promise<T> {
	if (!AI_PROVIDER_PRESETS.some((preset) => preset.id === config.provider)) {
		throw new Error('Invalid provider configuration.');
	}
	return useSecret(config.apiKey, (apiKey) =>
		callback({
			provider: config.provider,
			model: config.model.trim(),
			apiKey,
			baseUrl: config.baseUrl?.trim() || undefined
		})
	);
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
	const apiKey = await storeSecret('ai-api-key', config.apiKey);
	aiConfig.set({
		provider: config.provider,
		model: config.model.trim(),
		apiKey,
		baseUrl: config.baseUrl?.trim() || undefined,
		updatedAt: new Date().toISOString()
	});
}

export function readAIConfig(): StoredAIConfig | null {
	return get(aiConfig);
}
