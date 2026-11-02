/**
 * Plugin loader: dynamically loads plugins from URLs or inline code,
 * runs hooks in a sandboxed context with error isolation.
 */
import type { Flashcard, ReviewLog } from './types.js';
import type { ReviewResult } from './review-session.js';
import type { KaadoPlugin, PluginCommand, PluginContext, PluginLoadResult } from './plugin-api.js';

const STORAGE_KEY = 'kaadoneuro_plugins';

/** Deep-clone and freeze data for sandbox safety. */
function frozenCopy<T>(value: T): Readonly<T> {
	try {
		return Object.freeze(JSON.parse(JSON.stringify(value)));
	} catch {
		return value;
	}
}

function buildContext(cards: Flashcard[], logs: ReviewLog[]): PluginContext {
	return {
		cards: frozenCopy(cards) as readonly Readonly<Flashcard>[],
		logs: frozenCopy(logs) as readonly Readonly<ReviewLog>[]
	};
}

/** Load plugin sources from localStorage. */
export function loadPluginSources(): string[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed = JSON.parse(raw ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
	} catch {
		return [];
	}
}

/** Save plugin sources to localStorage. */
export function savePluginSources(sources: string[]): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
	} catch {
		// Storage unavailable
	}
}

/**
 * Load a single plugin from a URL or inline code string.
 * Inline code is detected by absence of `://` and wrapped as a data URI module.
 */
export async function loadPlugin(source: string): Promise<PluginLoadResult> {
	try {
		let url: string;
		if (source.includes('://')) {
			url = source;
		} else {
			// Inline code → data URI — dynamic import required since specifier is runtime-selected
			const encoded = encodeURIComponent(source);
			url = `data:text/javascript;charset=utf-8,${encoded}`;
		}
		const mod = await import(/* @vite-ignore */ url);
		const plugin = mod.default as KaadoPlugin | undefined;
		if (!plugin || typeof plugin.name !== 'string' || !plugin.name) {
			return { source, success: false, error: 'Plugin must export default object with name field' };
		}
		return { source, success: true, plugin };
	} catch (e) {
		return { source, success: false, error: e instanceof Error ? e.message : String(e) };
	}
}

/** Load all configured plugins, returning results for each source. */
export async function loadAllPlugins(sources: string[]): Promise<PluginLoadResult[]> {
	const results: PluginLoadResult[] = [];
	for (const source of sources) {
		results.push(await loadPlugin(source));
	}
	return results;
}

/** Registry holding loaded plugins and their custom commands. */
export class PluginRegistry {
	private plugins: KaadoPlugin[] = [];
	private commands: PluginCommand[] = [];

	getCommands(): readonly PluginCommand[] {
		return this.commands;
	}

	/** Test-only: replace internal plugin list without going through dynamic import. */
	setPluginsForTest(plugins: KaadoPlugin[]): void {
		this.plugins = plugins;
		this.commands = [];
	}

	/** Test-only: register a command directly. */
	registerCommandForTest(
		pluginName: string,
		name: string,
		handler: () => void | Promise<void>
	): void {
		this.commands.push({ pluginName, name, handler });
	}

	async init(
		sources: string[],
		cards: Flashcard[],
		logs: ReviewLog[]
	): Promise<PluginLoadResult[]> {
		this.plugins = [];
		this.commands = [];
		const results = await loadAllPlugins(sources);
		const ctx = buildContext(cards, logs);

		for (const result of results) {
			if (!result.success || !result.plugin) continue;
			this.plugins.push(result.plugin);
			if (result.plugin.registerCommands) {
				try {
					result.plugin.registerCommands((name, handler) => {
						this.commands.push({ pluginName: result.plugin!.name, name, handler });
					}, ctx);
				} catch (e) {
					console.error(`[plugin:${result.plugin.name}] registerCommands error:`, e);
				}
			}
		}
		return results;
	}

	async fireOnReviewComplete(
		card: Flashcard,
		quality: number,
		cards: Flashcard[],
		logs: ReviewLog[]
	): Promise<void> {
		const ctx = buildContext(cards, logs);
		const frozenCard = frozenCopy(card) as Readonly<Flashcard>;
		for (const plugin of this.plugins) {
			if (!plugin.onReviewComplete) continue;
			try {
				await plugin.onReviewComplete(frozenCard, quality, ctx);
			} catch (e) {
				console.error(`[plugin:${plugin.name}] onReviewComplete error:`, e);
			}
		}
	}

	async fireOnSessionEnd(
		results: ReviewResult[],
		cards: Flashcard[],
		logs: ReviewLog[]
	): Promise<void> {
		const ctx = buildContext(cards, logs);
		const frozenResults = frozenCopy(results) as readonly Readonly<ReviewResult>[];
		for (const plugin of this.plugins) {
			if (!plugin.onSessionEnd) continue;
			try {
				await plugin.onSessionEnd(frozenResults, ctx);
			} catch (e) {
				console.error(`[plugin:${plugin.name}] onSessionEnd error:`, e);
			}
		}
	}

	async fireOnBadgeUnlocked(badgeId: string, cards: Flashcard[], logs: ReviewLog[]): Promise<void> {
		const ctx = buildContext(cards, logs);
		for (const plugin of this.plugins) {
			if (!plugin.onBadgeUnlocked) continue;
			try {
				await plugin.onBadgeUnlocked(badgeId, ctx);
			} catch (e) {
				console.error(`[plugin:${plugin.name}] onBadgeUnlocked error:`, e);
			}
		}
	}
}

/** Singleton registry instance. */
export const pluginRegistry = new PluginRegistry();
