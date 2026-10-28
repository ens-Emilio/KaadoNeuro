import { persisted } from 'svelte-local-storage-store';
import { z } from 'zod';
import { encrypt, decrypt, isEncrypted } from './crypto-utils.js';

const webdavConfigSchema = z.object({
	url: z.string().url().optional().default(''),
	username: z.string().optional().default(''),
	password: z.string().optional().default(''),
	autoSync: z.boolean().optional().default(false),
	lastSyncAt: z.string().datetime().optional()
});

export type WebDavConfig = z.infer<typeof webdavConfigSchema>;

// ponytail: Serializer is sync but crypto is async. We store plaintext on first write,
// then migrate to encrypted via a subscription. Legacy plaintext values are decrypted
// on read and re-encrypted on next save. This avoids breaking the sync serializer contract.
let migrationPending = false;

export const webdavConfig = persisted<WebDavConfig>('kaadoneuro_webdav', {
	url: '',
	username: '',
	password: '',
	autoSync: false,
	lastSyncAt: undefined
}, {
	serializer: {
		stringify: (value) => JSON.stringify(value),
		parse: (raw) => {
			try {
				const parsed = JSON.parse(raw ?? '{}');
				const result = webdavConfigSchema.safeParse(parsed);
				return result.success ? result.data : {
					url: '',
					username: '',
					password: '',
					autoSync: false,
					lastSyncAt: undefined
				};
			} catch {
				return {
					url: '',
					username: '',
					password: '',
					autoSync: false,
					lastSyncAt: undefined
				};
			}
		}
	}
});

// Migrate password to encrypted form on load and on every update
if (typeof window !== 'undefined') {
	webdavConfig.subscribe(async (config) => {
		if (!config?.password) return;
		if (isEncrypted(config.password)) return;
		if (migrationPending) return;
		migrationPending = true;
		try {
			const encrypted = await encrypt(config.password);
			webdavConfig.update((c) => {
				if (!c || c.password !== config.password) return c;
				return { ...c, password: encrypted };
			});
		} finally {
			migrationPending = false;
		}
	});
}

/** Decrypt password for runtime use. Returns plaintext whether stored value is encrypted or legacy. */
export async function getDecryptedPassword(config: WebDavConfig): Promise<string> {
	if (!config.password) return '';
	return decrypt(config.password);
}

export function isConfigured(config: WebDavConfig): boolean {
	return !!(config.url && config.username && config.password);
}