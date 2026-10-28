import { persisted } from 'svelte-local-storage-store';
import type { AIConfig, AIProvider } from './types.js';
import { AI_PROVIDER_PRESETS } from './types.js';
import { encrypt, decrypt, isEncrypted } from '../crypto-utils.js';

export interface StoredAIConfig {
	provider: AIProvider;
	model: string;
	apiKey: string;
	baseUrl?: string;
	updatedAt?: string;
}

// ponytail: Serializer is sync but crypto is async. We store plaintext on first write,
// then migrate to encrypted via a subscription. Legacy plaintext values are decrypted
// on read and re-encrypted on next save. This avoids breaking the sync serializer contract.
let migrationPending = false;

export const aiConfig = persisted<StoredAIConfig | null>('kaadoneuro_ai_config', null, {
	serializer: {
		stringify: (value) => JSON.stringify(value),
		parse: (raw) => {
			try {
				const parsed = JSON.parse(raw ?? 'null');
				if (!parsed) return null;
				return parsed as StoredAIConfig;
			} catch {
				return null;
			}
		}
	}
});

// Migrate apiKey to encrypted form on load and on every update
if (typeof window !== 'undefined') {
	aiConfig.subscribe(async (config) => {
		if (!config?.apiKey) return;
		if (isEncrypted(config.apiKey)) return;
		if (migrationPending) return;
		migrationPending = true;
		try {
			const encrypted = await encrypt(config.apiKey);
			aiConfig.update((c) => {
				if (!c || c.apiKey !== config.apiKey) return c;
				return { ...c, apiKey: encrypted };
			});
		} finally {
			migrationPending = false;
		}
	});
}

/** Decrypt apiKey for runtime use. Returns plaintext whether stored value is encrypted or legacy. */
export async function getDecryptedApiKey(config: StoredAIConfig | null): Promise<string | null> {
	if (!config?.apiKey) return null;
	return decrypt(config.apiKey);
}

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