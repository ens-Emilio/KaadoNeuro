import { persisted } from 'svelte-local-storage-store';
import { z } from 'zod';
import { isLegacySecret, storeSecret, useSecret } from './secret-vault.js';

const webdavConfigSchema = z.object({
	url: z.string().url().optional().default(''),
	username: z.string().optional().default(''),
	password: z.string().optional().default(''),
	autoSync: z.boolean().optional().default(false),
	lastSyncAt: z.string().datetime().optional()
});

export type WebDavConfig = z.infer<typeof webdavConfigSchema>;

const emptyConfig = (): WebDavConfig => ({
	url: '',
	username: '',
	password: '',
	autoSync: false,
	lastSyncAt: undefined
});

export const webdavConfig = persisted<WebDavConfig>('kaadoneuro_webdav', emptyConfig(), {
	serializer: {
		stringify: (value) => JSON.stringify(value),
		parse: (raw) => {
			try {
				const result = webdavConfigSchema.safeParse(JSON.parse(raw ?? '{}'));
				return result.success ? result.data : emptyConfig();
			} catch {
				return emptyConfig();
			}
		}
	}
});

export function needsPasswordMigration(config: WebDavConfig): boolean {
	return Boolean(config.password && isLegacySecret(config.password));
}

export async function saveWebDavSecret(password: string): Promise<string> {
	return storeSecret('webdav-password', password);
}

export async function withWebDavPassword<T>(
	config: WebDavConfig,
	callback: (password: string) => Promise<T>
): Promise<T> {
	return useSecret(config.password, callback);
}

export function isConfigured(config: WebDavConfig): boolean {
	return !!(config.url && config.username && config.password);
}
