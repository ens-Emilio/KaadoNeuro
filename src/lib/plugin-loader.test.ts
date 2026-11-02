import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginRegistry, loadPlugin } from './plugin-loader.js';
import type { Flashcard, ReviewLog } from './types.js';
import type { ReviewResult } from './review-session.js';
import type { KaadoPlugin } from './plugin-api.js';

function makeCard(id = 'c1'): Flashcard {
	return {
		id,
		deckId: 'd1',
		front: 'f',
		back: 'b',
		tags: [],
		interval: 7,
		repetitions: 3,
		easeFactor: 2.5,
		dueDate: new Date(Date.now() + 86400000).toISOString(),
		createdAt: new Date().toISOString()
	};
}

function makeLog(cardId = 'c1'): ReviewLog {
	return { id: 'l1', cardId, quality: 4, reviewedAt: new Date().toISOString() };
}

describe('loadPlugin', () => {
	it('rejects source without valid default export', async () => {
		const result = await loadPlugin('export const x = 1;');
		expect(result.success).toBe(false);
		expect(result.error).toContain('name');
	});

	it('accepts valid inline plugin with name', async () => {
		const code = `export default { name: 'test-plugin' };`;
		const result = await loadPlugin(code);
		expect(result.success).toBe(true);
		expect(result.plugin?.name).toBe('test-plugin');
	});
});

describe('PluginRegistry', () => {
	let registry: PluginRegistry;

	beforeEach(() => {
		registry = new PluginRegistry();
	});

	it('fires onReviewComplete in registration order', async () => {
		const order: string[] = [];

		registry.setPluginsForTest([
			{
				name: 'p1',
				onReviewComplete: () => {
					order.push('p1');
				}
			},
			{
				name: 'p2',
				onReviewComplete: () => {
					order.push('p2');
				}
			}
		]);

		await registry.fireOnReviewComplete(makeCard(), 4, [makeCard()], [makeLog()]);
		expect(order).toEqual(['p1', 'p2']);
	});

	it('isolates errors: one plugin failure does not block others', async () => {
		const called: string[] = [];
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		registry.setPluginsForTest([
			{
				name: 'bad',
				onReviewComplete: () => {
					throw new Error('boom');
				}
			},
			{
				name: 'good',
				onReviewComplete: () => {
					called.push('good');
				}
			}
		]);

		await registry.fireOnReviewComplete(makeCard(), 4, [makeCard()], [makeLog()]);
		expect(called).toEqual(['good']);
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('passes frozen copies to hooks', async () => {
		let receivedCard: Readonly<Flashcard> | null = null;

		registry.setPluginsForTest([
			{
				name: 'freeze-test',
				onReviewComplete: (card) => {
					receivedCard = card;
				}
			}
		]);

		const card = makeCard();
		await registry.fireOnReviewComplete(card, 4, [card], [makeLog()]);

		expect(receivedCard).not.toBeNull();
		expect(Object.isFrozen(receivedCard)).toBe(true);
	});

	it('fires onSessionEnd with frozen results', async () => {
		let receivedResults: readonly Readonly<ReviewResult>[] | null = null;

		registry.setPluginsForTest([
			{
				name: 'session-test',
				onSessionEnd: (results) => {
					receivedResults = results;
				}
			}
		]);

		const results: ReviewResult[] = [{ updatedCard: makeCard(), newLog: makeLog() }];
		await registry.fireOnSessionEnd(results, [makeCard()], [makeLog()]);

		expect(receivedResults).not.toBeNull();
		expect(Object.isFrozen(receivedResults)).toBe(true);
	});

	it('fires onBadgeUnlocked', async () => {
		let receivedBadge: string | null = null;

		registry.setPluginsForTest([
			{
				name: 'badge-test',
				onBadgeUnlocked: (badgeId) => {
					receivedBadge = badgeId;
				}
			}
		]);

		await registry.fireOnBadgeUnlocked('streak-30', [makeCard()], [makeLog()]);
		expect(receivedBadge).toBe('streak-30');
	});

	it('registers custom commands during init', async () => {
		const handler = vi.fn();

		const mockPlugin: KaadoPlugin = {
			name: 'cmd-plugin',
			registerCommands: (register) => {
				register('my-command', handler);
			}
		};

		registry.setPluginsForTest([mockPlugin]);
		// Manually trigger command registration since we bypassed full init
		mockPlugin.registerCommands!(
			(name, h) => {
				registry.registerCommandForTest('cmd-plugin', name, h);
			},
			{ cards: [], logs: [] }
		);

		const commands = registry.getCommands();
		expect(commands.length).toBe(1);
		expect(commands[0].name).toBe('my-command');
		expect(commands[0].pluginName).toBe('cmd-plugin');
	});
});
