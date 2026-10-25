<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import { cards, decks, generateId } from '$lib/stores.js';
	import { aiConfig, normalizeAIConfig } from '$lib/ai/store.js';
	import { AI_CARD_COUNTS, type AICardProposal, type AIProposal } from '$lib/ai/types.js';
	import { NotebookPen, Loader2, Check, X } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import AIGenerateTrigger from './ai-generate-trigger.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { generateProposal } from '$lib/ai/client.js';
	import { buildGenerationPrompt } from '$lib/ai/prompt.js';

	type Props = {
		deckId?: string;
		deckName?: string;
		onApplied?: () => void;
	};

	let { deckId, deckName, onApplied }: Props = $props();

	let open = $state(false);
	let generating = $state(false);
	let error = $state('');
	let proposal: AIProposal | null = $state(null);
	let editedCards: AICardProposal[] = $state([]);
	let editedDeckName = $state('');
	let source = $state('');
	let count = $state(AI_CARD_COUNTS[0]);

	const config = $derived(normalizeAIConfig($aiConfig));

	async function generate() {
		if (!config || !source.trim()) return;
		generating = true;
		error = '';
		try {
			const generated = await generateProposal(
				config,
				buildGenerationPrompt({
					kind: deckId ? 'cards' : 'deck',
					source: source.trim(),
					count,
					deckName: deckId ? deckName : undefined
				})
			);
			proposal = generated;
			editedCards = [...generated.cards];
			editedDeckName = generated.deckName;
		} catch (e) {
			error = e instanceof Error ? e.message : m['aiGen.failed']();
		} finally {
			generating = false;
		}
	}

	function applyProposal() {
		if (!proposal || editedCards.length === 0) return;
		const now = new Date().toISOString();
		const targetDeckId = deckId ?? generateId();
		if (!deckId) {
			decks.update((all) => [...all, { id: targetDeckId, name: editedDeckName.trim() || 'Baralho gerado', createdAt: now }]);
		}
		const toAdd = editedCards.map((c) => ({
			id: generateId(),
			deckId: targetDeckId,
			front: c.front.trim(),
			back: c.back.trim(),
			interval: 0,
			repetitions: 0,
			easeFactor: 2.5,
			dueDate: now,
			createdAt: now
		}));
		cards.update((all) => [...all, ...toAdd]);
		open = false;
		proposal = null;
		editedCards = [];
		source = '';
		onApplied?.();
		if (!deckId) goto(`/decks/${targetDeckId}`);
	}

	function discard() {
		proposal = null;
		editedCards = [];
		error = '';
	}

	function removeCard(index: number) {
		editedCards = editedCards.filter((_, i) => i !== index);
	}
</script>

<Dialog.Root bind:open>
	<AIGenerateTrigger />
	<Dialog.Content class="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>{m['aiGen.title']()}</Dialog.Title>
			<Dialog.Description>
				{#if deckId}
					{m['aiGen.cardsDesc']({ name: deckName ?? 'KaadoNeuro' })}
				{:else}
					{m['aiGen.deckDesc']()}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if !config}
			<div class="rounded-lg border border-[var(--q-dificil)]/30 bg-[color-mix(in_oklch,var(--q-dificil)_8%,transparent)] p-4">
				<p class="text-sm text-[var(--q-dificil)]">{m['aiGen.noConfig']()} <a href="/settings/ai" class="font-semibold underline">{m['nav.ai']()}</a>.</p>
			</div>
		{:else if !proposal}
			<div class="space-y-4">
				<div class="space-y-1.5">
					<Label for="ai-source">{m['aiGen.source']()}</Label>
					<Textarea id="ai-source" bind:value={source} placeholder={m['aiGen.sourcePlaceholder']()} rows={4} />
				</div>
				<div class="space-y-1.5">
					<Label for="ai-count">{m['aiGen.count']()}</Label>
					<select id="ai-count" class="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm" bind:value={count}>
						{#each AI_CARD_COUNTS as n}
							<option value={n}>{m['aiGen.countN']({ count: n })}</option>
						{/each}
					</select>
				</div>
				{#if error}
					<p class="rounded-md border border-[var(--q-errei)]/30 bg-[color-mix(in_oklch,var(--q-errei)_8%,transparent)] px-3 py-2 text-xs text-[var(--q-errei)]">{error}</p>
				{/if}
				<Button onclick={generate} disabled={generating || !source.trim()} class="w-full">
					{#if generating}
						<Loader2 class="size-[18px] animate-spin" aria-hidden="true" />
						{m['aiGen.generating']()}
					{:else}
						<NotebookPen class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
						{m['aiGen.generate']()}
					{/if}
				</Button>
			</div>
		{:else}
			<div class="space-y-4">
				<div class="space-y-1.5">
					<Label for="ai-deck-name">{m['aiGen.deckName']()}</Label>
					<Input id="ai-deck-name" bind:value={editedDeckName} />
				</div>
				<p class="text-xs text-muted-foreground">{proposal.summary}</p>
				<div class="space-y-2 max-h-[320px] overflow-y-auto">
					{#each editedCards as card, i}
						<div class="rounded-md border border-border bg-card p-3 space-y-2">
							<div class="flex items-start justify-between gap-2">
								<span class="font-mono text-[10px] text-muted-foreground">#{i + 1}</span>
								<button onclick={() => removeCard(i)} class="text-muted-foreground hover:text-[var(--q-errei)]" aria-label={m['aiGen.removeCard']()}>
									<X class="size-3.5" />
								</button>
							</div>
							<Input bind:value={editedCards[i].front} placeholder={m['aiGen.front']()} />
							<Textarea bind:value={editedCards[i].back} placeholder={m['aiGen.back']()} rows={2} />
						</div>
					{/each}
				</div>
				<div class="flex items-center justify-between gap-2 pt-2 border-t border-border">
					<Button variant="ghost" onclick={discard}>
						<X class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
						{m['aiGen.discard']()}
					</Button>
					<Button onclick={applyProposal} disabled={editedCards.length === 0}>
						<Check class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
{editedCards.length === 1 ? m['aiGen.apply.one']({ count: 1 }) : m['aiGen.apply']({ count: editedCards.length })}
					</Button>
				</div>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
