import { persisted } from 'svelte-local-storage-store';

export interface AutoBackupSettings {
	enabled: boolean;
	intervalDays: number;
	lastBackupAt: string | null;
}

const DEFAULT_SETTINGS: AutoBackupSettings = {
	enabled: false,
	intervalDays: 7,
	lastBackupAt: null
};

export const autoBackupSettings = persisted<AutoBackupSettings>(
	'kaadoneuro_auto_backup',
	DEFAULT_SETTINGS,
	{
		serializer: {
			stringify: (v) => JSON.stringify(v),
			parse: (raw) => {
				try {
					const parsed = JSON.parse(raw ?? '{}');
					return {
						enabled:
							typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
						intervalDays:
							typeof parsed.intervalDays === 'number' && parsed.intervalDays > 0
								? parsed.intervalDays
								: DEFAULT_SETTINGS.intervalDays,
						lastBackupAt: typeof parsed.lastBackupAt === 'string' ? parsed.lastBackupAt : null
					};
				} catch {
					return DEFAULT_SETTINGS;
				}
			}
		}
	}
);

/**
 * Pure function: returns true when an auto-backup should run.
 * Exported for unit testing without touching stores or DOM.
 */
export function isBackupDue(settings: AutoBackupSettings, now: Date): boolean {
	if (!settings.enabled) return false;
	if (!settings.lastBackupAt) return true;
	const last = new Date(settings.lastBackupAt).getTime();
	if (isNaN(last)) return true;
	const threshold = settings.intervalDays * 24 * 60 * 60 * 1000;
	return now.getTime() - last >= threshold;
}

/**
 * Record that a backup just completed.
 */
export function markBackupDone(now: Date = new Date()): void {
	autoBackupSettings.update((s) => ({ ...s, lastBackupAt: now.toISOString() }));
}
