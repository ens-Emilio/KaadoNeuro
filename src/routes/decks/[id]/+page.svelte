<script lang="ts">
	import { page } from '$app/state';
	import { decks, cards, generateId } from '$lib/stores.js';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Trash2, Plus, Upload, FileText, FileUp } from '@lucide/svelte';
	import { parseImport } from '$lib/import.js';
	import { haptic } from '$lib/haptics.js';
	import AIGenerateDialog from '$lib/components/ai/ai-generate-dialog.svelte';
	import * as m from '$lib/paraglide/messages.js';

	const deckId = page.params.id ?? '';

	let deck = $derived($decks.find((d) => d.id === deckId));
	let deckCards = $derived($cards.filter((c) => c.deckId === deckId));

	let front = $state('');
	let back = $state('');
	let savedFlash = $state(false);
	let deletingId: string | null = $state(null);
	let deleteOpen = $state(false);

	let importOpen = $state(false);
	let activeTab = $state('file');
	let importText = $state('');
	let importParsed: { front: string; back: string }[] = $state([]);
	let importError = $state('');
	let fileName = $state('');

	function flashSaved() {
		savedFlash = true;
		setTimeout(() => (savedFlash = false), 900);
	}

	function updateDeckName(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!deck) return;
		decks.update((all) => all.map((d) => (d.id === deckId ? { ...d, name: input.value } : d)));
		flashSaved();
	}

	function addCard() {
		if (!front.trim() || !back.trim()) return;
		const now = new Date().toISOString();
		cards.update((all) => [
			...all,
			{ id: generateId(), deckId, front: front.trim(), back: back.trim(), interval: 0, repetitions: 0, easeFactor: 2.5, dueDate: now, createdAt: now }
		]);
		haptic(10);
		front = '';
		back = '';
	}

	function deleteCard(id: string) {
		deletingId = id;
		setTimeout(() => {
			cards.update((all) => all.filter((c) => c.id !== id));
			deletingId = null;
			haptic(10);
		}, 160);
	}

	function deleteDeck() {
		cards.update((all) => all.filter((c) => c.deckId !== deckId));
		decks.update((all) => all.filter((d) => d.id !== deckId));
		deleteOpen = false;
		goto('/');
	}

	function runParse(text: string) {
		importError = '';
		const res = parseImport(text);
		if (!Array.isArray(res)) {
			importError = res.error;
			importParsed = [];
			return;
		}
		if (res.length === 0) {
			importError = m['deck.noneFound']();
			importParsed = [];
		} else {
			importParsed = res;
		}
	}

	function doImport() {
		if (importParsed.length === 0) return;
		const now = new Date().toISOString();
		const toAdd = importParsed.map((c) => ({
			id: generateId(),
			deckId,
			front: c.front,
			back: c.back,
			interval: 0,
			repetitions: 0,
			easeFactor: 2.5,
			dueDate: now,
			createdAt: now
		}));
		cards.update((all) => [...all, ...toAdd]);
		haptic(18);
		importOpen = false;
		importText = '';
		importParsed = [];
		fileName = '';
		importError = '';
	}

	async function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		fileName = file.name;
		const text = await file.text();
		runParse(text);
		target.value = '';
	}

	function handleTextParse() {
		if (!importText.trim()) return;
		runParse(importText);
	}
</script>

<div class="container mx-auto max-w-4xl space-y-6 p-5 sm:p-6">
	<div class="flex items-center gap-3">
		<Button variant="ghost" size="icon" href="/" aria-label={m['deck.back']()}>
			<ArrowLeft class="size-[18px] [stroke-width:1.75]" />
		</Button>
		<div class="flex-1 min-w-0">
			<Input
				value={deck?.name ?? ''}
				oninput={updateDeckName}
				class="h-auto border-none bg-transparent px-0 py-2 font-display text-2xl font-normal tracking-[-0.02em] shadow-none focus-visible:ring-0 {savedFlash ? '!text-accent' : ''}"
				placeholder={m['deck.placeholder']()}
			/>
			{#if savedFlash}
				<span class="font-mono text-[10px] font-bold tracking-[0.08em] uppercase text-accent">{m['deck.saved']()}</span>
			{/if}
		</div>
		<AIGenerateDialog deckId={deckId} deckName={deck?.name} />
		<Dialog.Root bind:open={importOpen}>
			<Dialog.Trigger>
				<Button variant="outline" size="sm" class="gap-1.5">
					<Upload class="size-[18px] [stroke-width:1.75]" /> {m['deck.import']()}
				</Button>
			</Dialog.Trigger>
			<Dialog.Content class="sm:max-w-[520px]">
				<Dialog.Header>
					<Dialog.Title>{m['deck.importTitle']()}</Dialog.Title>
					<Dialog.Description>{m['deck.importDesc']()}</Dialog.Description>
				</Dialog.Header>

				<div class="flex w-full items-center justify-center rounded-md bg-secondary p-1">
					<button
						onclick={() => (activeTab = 'file')}
						class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {activeTab === 'file' ? 'bg-card shadow-sm border border-border' : 'text-muted-foreground'}"
					>
						<span class="flex items-center justify-center gap-1.5"><FileUp class="size-[18px] [stroke-width:1.75]" /> {m['deck.file']()}</span>
					</button>
					<button
						onclick={() => (activeTab = 'text')}
						class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {activeTab === 'text' ? 'bg-card shadow-sm border border-border' : 'text-muted-foreground'}"
					>
						<span class="flex items-center justify-center gap-1.5"><FileText class="size-[18px] [stroke-width:1.75]" /> {m['deck.text']()}</span>
					</button>
				</div>

				<div class="py-3">
					{#if activeTab === 'file'}
						<div class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card/50 p-6 text-center">
							<div class="grid size-12 place-items-center rounded-md bg-[var(--accent-soft)] border border-[color-mix(in_oklch,var(--accent-text)_20%,transparent)]">
								<Upload class="size-[22px] text-accent [stroke-width:1.75]" />
							</div>
							<p class="text-sm font-medium">{m['deck.drop']()}</p>
							<p class="font-mono text-xs text-muted-foreground">{m['deck.fileHint']()}</p>
							<Input type="file" accept=".json,.md,.txt" onchange={handleFileUpload} class="max-w-xs cursor-pointer" />
							{#if fileName}
								<p class="font-mono text-xs text-muted-foreground">{fileName}</p>
							{/if}
						</div>
					{:else}
						<div class="space-y-3">
							<Label>{m['deck.paste']()}</Label>
							<Textarea
								bind:value={importText}
								placeholder={'# Pergunta\nResposta\n---\n# Outra pergunta\nOutra resposta'}
								rows={7}
								class="font-mono text-xs"
							/>
							<p class="font-mono text-xs text-muted-foreground">{m['deck.textHint']()}</p>
							<Button onclick={handleTextParse} class="w-full" variant="secondary">{m['deck.preview']()}</Button>
						</div>
					{/if}

					{#if importError}
						<p class="mt-3 rounded-md border border-[var(--q-errei)]/30 bg-[color-mix(in_oklch,var(--q-errei)_10%,transparent)] px-3 py-2 text-xs text-[var(--q-errei)]">{importError}</p>
					{/if}

					{#if importParsed.length > 0}
						<div class="mt-3 space-y-2">
							<div class="flex items-center gap-2 font-mono text-xs text-muted-foreground">
								<span class="num font-bold text-foreground">{importParsed.length}</span> {m['deck.detected']({ count: importParsed.length })}
								<span class="ml-auto h-1 w-24 rounded-md bg-border overflow-hidden">
									<span class="block h-full bg-[var(--accent-text)]" style="width: 100%"></span>
								</span>
							</div>
							<div class="max-h-[220px] overflow-auto rounded-md border bg-secondary/30 p-2 space-y-1.5">
								{#each importParsed.slice(0, 20) as c}
									<div class="rounded-md border bg-card px-3 py-2">
										<p class="text-xs font-semibold truncate">{c.front}</p>
										<p class="text-xs text-muted-foreground truncate">{c.back}</p>
									</div>
								{/each}
								{#if importParsed.length > 20}
									<p class="text-center font-mono text-xs text-muted-foreground">{m['deck.more']({ count: importParsed.length - 20 })}</p>
								{/if}
							</div>
							<Button onclick={doImport} class="w-full">{m['deck.importBatch']({ count: importParsed.length })}</Button>
						</div>
					{/if}
				</div>
			</Dialog.Content>
		</Dialog.Root>

		<Button variant="ghost" size="icon" onclick={() => (deleteOpen = true)} aria-label={m['deck.deleteAria']()} class="text-muted-foreground hover:text-[var(--q-errei)]">
			<Trash2 class="size-[18px] [stroke-width:1.75]" />
		</Button>
	</div>

	<Dialog.Root bind:open={deleteOpen}>
		<Dialog.Content class="sm:max-w-[440px]">
			<Dialog.Header>
				<Dialog.Title>{m['deck.deleteTitle']()}</Dialog.Title>
				<Dialog.Description>
					{m['deck.deleteDesc']({ name: deck?.name ?? 'KaadoNeuro', count: deckCards.length })}
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (deleteOpen = false)}> {m['deck.keep']()}</Button>
				<Button variant="destructive" onclick={deleteDeck}> {deckCards.length === 1 ? m['deck.deleteConfirm.one']({ count: 1 }) : m['deck.deleteConfirm']({ count: deckCards.length })}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<div class="grid gap-6 md:grid-cols-[2fr_1fr]">
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<h2 class="font-display text-[18px]"> {m['deck.cards']({ count: deckCards.length })}</h2>
			</div>

			{#if deckCards.length === 0}
				<div class="rounded-lg border border-dashed bg-card/50 py-10 text-center">
					<p class="text-sm text-muted-foreground"> {m['deck.noCards']()}</p>
					<p class="mx-auto mt-1 max-w-xs font-mono text-xs text-muted-foreground"> {m['deck.noCardsHint']()}</p>
					<Button variant="ghost" size="sm" class="mt-3" onclick={() => (importOpen = true)}> {m['deck.importCards']()}</Button>
				</div>
			{/if}

			{#each deckCards as card (card.id)}
				{@const leaving = deletingId === card.id}
				<Card.Root class="rounded-lg transition-[transform,opacity] duration-[160ms] {leaving ? 'opacity-0 -translate-x-2 scale-[0.98]' : 'opacity-100'}">
					<Card.Content class="flex items-start justify-between gap-3 p-4">
						<div class="grid flex-1 gap-1.5 min-w-0">
							<div class="border-b border-border pb-2 text-sm font-semibold truncate">{card.front}</div>
							<div class="whitespace-pre-wrap text-sm text-muted-foreground break-words">{card.back}</div>
						</div>
						<Button variant="ghost" size="icon" class="shrink-0 text-muted-foreground hover:text-[var(--q-errei)]" onclick={() => deleteCard(card.id)} aria-label={m['deck.deleteCardAria']()}>
							<Trash2 class="size-[18px] [stroke-width:1.75]" />
						</Button>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<div class="space-y-4">
			<Card.Root class="sticky top-[68px] rounded-lg">
				<Card.Header>
					<Card.Title class="text-sm">{m['deck.newCard']()}</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="space-y-1.5">
						<Label>{m['deck.front']()}</Label>
						<Textarea bind:value={front} placeholder={m['deck.frontPlaceholder']()} rows={3} />
					</div>
					<div class="space-y-1.5">
						<Label>{m['deck.backField']()}</Label>
						<Textarea bind:value={back} placeholder={m['deck.backPlaceholder']()} rows={4} />
					</div>
					<Button onclick={addCard} class="w-full">
						<Plus class="size-[18px] [stroke-width:1.75]" /> {m['deck.add']()}
					</Button>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
