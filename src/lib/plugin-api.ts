/**
 * KaadoNeuro Plugin API
 *
 * Plugins are ES modules (URL or inline code) that export a default object
 * conforming to `KaadoPlugin`. They run in a sandboxed context:
 *   - All data passed to hooks is a read-only deep copy.
 *   - `localStorage`, `sessionStorage`, `indexedDB`, and `document` are NOT available.
 *   - Errors thrown by plugins are caught and logged; they never crash the host app.
 *
 * Hook invocation order: plugins execute in registration order.
 * Async hooks are awaited sequentially so later plugins see side-effects of earlier ones.
 *
 * Example plugin (inline or hosted .js):
 * ```js
 * export default {
 *   name: 'my-plugin',
 *   onReviewComplete(card, quality) {
 *     console.log(`Reviewed ${card.id} with quality ${quality}`);
 *   }
 * };
 * ```
 */

import type { Flashcard, ReviewLog } from './types.js';
import type { ReviewResult } from './review-session.js';

export interface PluginContext {
	/** Read-only snapshot of all cards at hook invocation time. */
	readonly cards: readonly Readonly<Flashcard>[];
	/** Read-only snapshot of recent review logs. */
	readonly logs: readonly Readonly<ReviewLog>[];
}

export interface KaadoPlugin {
	/** Unique plugin identifier for logging and deduplication. */
	name: string;

	/** Called after each individual card review completes. */
	onReviewComplete?(
		card: Readonly<Flashcard>,
		quality: number,
		ctx: PluginContext
	): void | Promise<void>;

	/** Called when a review session ends with all results. */
	onSessionEnd?(
		results: readonly Readonly<ReviewResult>[],
		ctx: PluginContext
	): void | Promise<void>;

	/** Called when a badge is unlocked. */
	onBadgeUnlocked?(badgeId: string, ctx: PluginContext): void | Promise<void>;

	/**
	 * Register custom commands. Called once during plugin initialization.
	 * Commands appear in the command palette / settings UI.
	 */
	registerCommands?(
		register: (name: string, handler: () => void | Promise<void>) => void,
		ctx: PluginContext
	): void;
}

/** A registered custom command from a plugin. */
export interface PluginCommand {
	pluginName: string;
	name: string;
	handler: () => void | Promise<void>;
}

/** Result of loading a single plugin source. */
export interface PluginLoadResult {
	source: string;
	success: boolean;
	plugin?: KaadoPlugin;
	error?: string;
}
