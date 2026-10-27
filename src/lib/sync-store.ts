import { persisted } from 'svelte-local-storage-store';
import { z } from 'zod';

const webdavConfigSchema = z.object({
	url: z.string().url().optional().default(''),
	username: z.string().optional().default(''),
	password: z.string().optional().default(''),
	autoSync: z.boolean().optional().default(false),
	lastSyncAt: z.string().datetime().optional()
});

export type WebDavConfig = z.infer<typeof webdavConfigSchema>;

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

export function isConfigured(config: WebDavConfig): boolean {
	return !!(config.url && config.username && config.password);
}