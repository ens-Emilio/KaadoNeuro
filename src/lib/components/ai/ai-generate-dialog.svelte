<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import { cards, decks, generateId } from '$lib/stores.js';
	import { aiConfig, withAIConfig } from '$lib/ai/store.js';
	import {
		AI_CARD_COUNTS,
		CLOZE_CARD_COUNTS,
		type AICardProposal,
		type AIProposal,
		type AIClozeCardProposal,
		type AIClozeProposal
	} from '$lib/ai/types.js';
	import { NotebookPen, Loader2, Check, X, Image as ImageIcon } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import { generateProposal, generateClozeProposal, supportsVision } from '$lib/ai/client.js';
	import { buildGenerationPrompt, buildClozePrompt } from '$lib/ai/prompt.js';

	type Props = {
		deckId?: string;
		deckName?: string;
		onApplied?: () => void;
	};

	let { deckId, deckName }: Props = $props();

	let open = $state(true);
	let generating = $state(false);
	let error = $state('');
	let proposal: AIProposal | null = $state(null);
	let editedCards: AICardProposal[] = $state([]);
	let mode = $state<'cards' | 'cloze'>('cards');
	let editedClozeCards: AIClozeCardProposal[] = $state([]);
	let clozeProposal: AIClozeProposal | null = $state(null);
	let editedDeckName = $state('');
	let source = $state('');
	let count = $state<number>(AI_CARD_COUNTS[0]);
	let imageBase64 = $state<string | undefined>(undefined);
	const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
	const hasStoredConfig = $derived(Boolean($aiConfig));
	const hasVision = $derived(
		hasStoredConfig &&
			supportsVision({ provider: $aiConfig!.provider, model: $aiConfig!.model, apiKey: '' })
	);
	const activeCounts = $derived(mode === 'cloze' ? CLOZE_CARD_COUNTS : AI_CARD_COUNTS);

	function handleImageSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (file.size > MAX_IMAGE_SIZE) {
			error = m['ai.imageTooLarge']();
			input.value = '';
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			imageBase64 = reader.result as string;
			error = '';
		};
		reader.readAsDataURL(file);
	}

	function removeImage() {
		imageBase64 = undefined;
	}

	function renderClozePreview(text: string): string {
		return text.replace(
			/\{\{c\d+::([^}]+)\}\}/g,
			'<mark class="rounded bg-[var(--q-bom)]/20 px-0.5 text-[var(--q-bom)]">$1</mark>'
		);
	}
	const CLOZE_PLACEHOLDER = 'Texto com {{c1::resposta}}';

	async function generate() {
		if (!source.trim() || !$aiConfig) return;
		generating = true;
		error = '';
		try {
			const stored = $aiConfig;
			if (mode === 'cloze') {
				const generated = await withAIConfig(stored, (runtimeConfig) =>
					generateClozeProposal(
						runtimeConfig,
						buildClozePrompt({
							kind: 'cloze',
							source: source.trim(),
							count,
							deckName: deckId ? deckName : undefined
						})
					)
				);
				clozeProposal = generated;
				editedClozeCards = [...generated.cards];
				editedDeckName = generated.deckName;
				proposal = null;
				editedCards = [];
			} else {
				const generated = await withAIConfig(stored, (runtimeConfig) =>
					generateProposal(
						runtimeConfig,
						buildGenerationPrompt({
							kind: deckId ? 'cards' : 'deck',
							source: source.trim(),
							count,
							deckName: deckId ? deckName : undefined,
							imageBase64
						})
					)
				);
				proposal = generated;
				editedCards = [...generated.cards];
				editedDeckName = generated.deckName;
				clozeProposal = null;
				editedClozeCards = [];
			}
		} catch (e) {
			error = e instanceof Error ? e.message : m['aiGen.failed']();
		} finally {
			generating = false;
		}
	}

	function applyProposal() {
		if (
			(!proposal && !clozeProposal) ||
			(mode === 'cards' ? editedCards.length === 0 : editedClozeCards.length === 0)
		)
			return;
		const now = new Date().toISOString();
		const targetDeckId = deckId ?? generateId();
		if (!deckId) {
			decks.update((all) => [
				...all,
				{ id: targetDeckId, name: editedDeckName.trim() || 'Baralho gerado', createdAt: now }
			]);
		}
		const toAdd =
			mode === 'cloze'
				? editedClozeCards.map((c) => ({
						id: generateId(),
						deckId: targetDeckId,
						front: c.text.trim(),
						back: c.clozes.join(', '),
						cloze: c.clozes.join(', '),
						tags: [],
						interval: 0,
						repetitions: 0,
						easeFactor: 2.5,
						dueDate: now,
						createdAt: now
					}))
				: editedCards.map((c) => ({
						id: generateId(),
						deckId: targetDeckId,
						front: c.front.trim(),
						back: c.back.trim(),
						tags: [],
						interval: 0,
						repetitions: 0,
						easeFactor: 2.5,
						dueDate: now,
						createdAt: now
					}));
		cards.update((all) => [...all, ...toAdd]);
		open = false;
		proposal = null;
		clozeProposal = null;
		editedCards = [];
		editedClozeCards = [];
		source = '';
		imageBase64 = undefined;
		if (!deckId) goto(`/decks/${targetDeckId}`);
	}

	function discard() {
		proposal = null;
		clozeProposal = null;
		editedCards = [];
		editedClozeCards = [];
		error = '';
	}

	function removeCard(index: number) {
		if (mode === 'cloze') {
			editedClozeCards = editedClozeCards.filter((_, i) => i !== index);
		} else {
			editedCards = editedCards.filter((_, i) => i !== index);
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
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

		{#if !hasStoredConfig}
			<div
				class="rounded-lg border border-[var(--q-dificil)]/30 bg-[color-mix(in_oklch,var(--q-dificil)_8%,transparent)] p-4"
			>
				<p class="text-sm text-[var(--q-dificil)]">
					{m['aiGen.noConfig']()}
					<a href="/settings/ai" class="font-semibold underline">{m['nav.ai']()}</a>.
				</p>
			</div>
		{:else if !proposal}
			<div class="flex gap-1 rounded-lg border border-border p-1">
				<button
					class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {mode ===
					'cards'
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:bg-muted'}"
					onclick={() => {
						mode = 'cards';
						count = AI_CARD_COUNTS[0];
					}}
				>
					Cartões
				</button>
				<button
					class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {mode ===
					'cloze'
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:bg-muted'}"
					onclick={() => {
						mode = 'cloze';
						count = CLOZE_CARD_COUNTS[0];
					}}
				>
					Omissão
				</button>
			</div>
			<div class="space-y-4">
				<div class="space-y-1.5">
					<Label for="ai-source">{m['aiGen.source']()}</Label>
					<Textarea
						id="ai-source"
						bind:value={source}
						placeholder={m['aiGen.sourcePlaceholder']()}
						rows={4}
					/>
				</div>
				<div class="space-y-1.5">
					<Label for="ai-count">{m['aiGen.count']()}</Label>
					<select
						id="ai-count"
						class="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
						bind:value={count}
					>
						{#each activeCounts as n}
							<option value={n}>{m['aiGen.countN']({ count: n })}</option>
						{/each}
					</select>
				</div>
				<div class="space-y-1.5">
					<Label>{m['ai.uploadImage']()}</Label>
					{#if imageBase64}
						<div class="relative inline-block">
							<img
								src={imageBase64}
								alt={m['ai.imagePreview']()}
								class="h-24 w-24 rounded-md border border-border object-cover"
							/>
							<button
								onclick={removeImage}
								class="text-destructive-foreground absolute -top-2 -right-2 rounded-full bg-destructive p-0.5 shadow-sm hover:bg-destructive/90"
								aria-label={m['ai.removeImage']()}
							>
								<X class="size-3.5" />
							</button>
						</div>
					{:else}
						<label
							class="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm hover:bg-muted/50"
						>
							<ImageIcon class="size-4 text-muted-foreground" />
							<span>{m['ai.uploadImage']()}</span>
							<input type="file" accept="image/*" class="hidden" onchange={handleImageSelect} />
						</label>
					{/if}
					<p class="text-xs text-muted-foreground">{m['ai.imageHint']()}</p>
					{#if !hasVision && imageBase64}
						<p class="text-xs text-[var(--q-dificil)]">{m['ai.multimodalUnsupported']()}</p>
					{/if}
				</div>
				{#if error}
					<p
						class="rounded-md border border-[var(--q-errei)]/30 bg-[color-mix(in_oklch,var(--q-errei)_8%,transparent)] px-3 py-2 text-xs text-[var(--q-errei)]"
					>
						{error}
					</p>
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
		{:else if proposal && mode === 'cards'}
			<div class="space-y-4">
				<div class="space-y-1.5">
					<Label for="ai-deck-name">{m['aiGen.deckName']()}</Label>
					<Input id="ai-deck-name" bind:value={editedDeckName} />
				</div>
				<p class="text-xs text-muted-foreground">{proposal.summary}</p>
				<div class="max-h-[320px] space-y-2 overflow-y-auto">
					{#each editedCards, i}
						<div class="space-y-2 rounded-md border border-border bg-card p-3">
							<div class="flex items-start justify-between gap-2">
								<span class="font-mono text-[10px] text-muted-foreground">#{i + 1}</span>
								<button
									onclick={() => removeCard(i)}
									class="text-muted-foreground hover:text-[var(--q-errei)]"
									aria-label={m['aiGen.removeCard']()}
								>
									<X class="size-3.5" />
								</button>
							</div>
							<Input bind:value={editedCards[i].front} placeholder={m['aiGen.front']()} />
							<Textarea bind:value={editedCards[i].back} placeholder={m['aiGen.back']()} rows={2} />
						</div>
					{/each}
				</div>
				<div class="flex items-center justify-between gap-2 border-t border-border pt-2">
					<Button variant="ghost" onclick={discard}>
						<X class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
						{m['aiGen.discard']()}
					</Button>
					<Button onclick={applyProposal} disabled={editedCards.length === 0}>
						<Check class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
						{editedCards.length === 1
							? m['aiGen.apply.one']({ count: 1 })
							: m['aiGen.apply']({ count: editedCards.length })}
					</Button>
				</div>
			</div>
		{:else if clozeProposal && mode === 'cloze'}
			<div class="space-y-4">
				<div class="space-y-1.5">
					<Label for="ai-deck-name-cloze">{m['aiGen.deckName']()}</Label>
					<Input id="ai-deck-name-cloze" bind:value={editedDeckName} />
				</div>
				<p class="text-xs text-muted-foreground">{clozeProposal.summary}</p>
				<div class="max-h-[320px] space-y-2 overflow-y-auto">
					{#each editedClozeCards, i}
						<div class="space-y-2 rounded-md border border-border bg-card p-3">
							<div class="flex items-start justify-between gap-2">
								<span class="font-mono text-[10px] text-muted-foreground">#{i + 1}</span>
								<button
									onclick={() => removeCard(i)}
									class="text-muted-foreground hover:text-[var(--q-errei)]"
									aria-label={m['aiGen.removeCard']()}
								>
									<X class="size-3.5" />
								</button>
							</div>
							<!-- svelte-ignore a11y_no_noninteractive_element_interactive_handler -->
							<div
								class="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm leading-relaxed"
								onclick={() => {}}
							>
								{@html renderClozePreview(editedClozeCards[i].text)}
							</div>
							<Textarea
								bind:value={editedClozeCards[i].text}
								placeholder={CLOZE_PLACEHOLDER}
								rows={2}
								class="font-mono text-xs"
							/>
						</div>
					{/each}
				</div>
				<div class="flex items-center justify-between gap-2 border-t border-border pt-2">
					<Button variant="ghost" onclick={discard}>
						<X class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
						{m['aiGen.discard']()}
					</Button>
					<Button onclick={applyProposal} disabled={editedClozeCards.length === 0}>
						<Check class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
						{editedClozeCards.length === 1
							? m['aiGen.apply.one']({ count: 1 })
							: m['aiGen.apply']({ count: editedClozeCards.length })}
					</Button>
				</div>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
