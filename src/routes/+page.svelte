<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { xp, level } from '$lib/gamification-store.js';
	import { decks, cards, generateId, streak } from '$lib/stores.js';
	import { goto } from '$app/navigation';
	import { Plus, Play, Edit, Upload } from '@lucide/svelte';
	import { formatDateShort } from '$lib/import.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import * as m from '$lib/paraglide/messages.js';
	import AIGenerateLazy from '$lib/components/ai/ai-generate-lazy.svelte';
	import { mergeDeckImport } from '$lib/deck-export.js';
	import { MAX_IMPORT_BYTES } from '$lib/import.js';
	import { allTags } from '$lib/stores.js';
	import { decodeDeckShare, SHARE_PARAM } from '$lib/deck-share.js';
	import { importApkgFile } from '$lib/apkg-import.js';
	import { page } from '$app/state';

	// Onboarding automático: se não há decks, redireciona para o tutorial.
	// Só roda no cliente após hidratação para evitar flash durante SSR.
	let hasCheckedOnboarding = false;
	$effect(() => {
		if (hasCheckedOnboarding || $decks.length > 0) return;
		// A shared deck is about to be imported; onboarding would steal that arrival.
		if (page.url.searchParams.get(SHARE_PARAM)) return;
		hasCheckedOnboarding = true;
		goto('/tutorial');
	});

	function createDeck() {
		const id = generateId();
		decks.update((d) => [
			...d,
			{ id, name: m['home.newDeck'](), createdAt: new Date().toISOString() }
		]);
		goto(`/decks/${id}`);
	}

	function getDueCount(deckId: string) {
		const now = new Date();
		return $cards.filter((c) => c.deckId === deckId && new Date(c.dueDate) <= now).length;
	}

	function getTotalDue() {
		const now = new Date();
		return $cards.filter((c) => new Date(c.dueDate) <= now).length;
	}

	const hour = new Date().getHours();
	const greeting = $derived(
		hour < 12
			? m['home.greeting.morning']()
			: hour < 18
				? m['home.greeting.afternoon']()
				: m['home.greeting.evening']()
	);
	let dueTotal = $derived(getTotalDue());
	let nextDeck = $derived(
		$decks
			.map((deck) => ({ deck, due: getDueCount(deck.id) }))
			.filter((entry) => entry.due > 0)
			.sort((a, b) => b.due - a.due)[0]
	);

	let activeTagFilter = $state<string | null>(null);
	let filteredDecks = $derived(
		activeTagFilter
			? $decks.filter((deck) =>
					$cards.some((c) => c.deckId === deck.id && c.tags.includes(activeTagFilter!))
				)
			: $decks
	);
	let importError = $state('');

	async function handleImportDeck(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		importError = '';
		if (file.size > MAX_IMPORT_BYTES) {
			importError = m['import.tooLarge']();
			target.value = '';
			return;
		}
		try {
			if (file.name.toLowerCase().endsWith('.apkg')) {
				const parsed = await importApkgFile(new Uint8Array(await file.arrayBuffer()));
				if (parsed.cards.length === 0) {
					importError = m['deck.noneFound']();
					target.value = '';
					return;
				}
				const now = new Date().toISOString();
				const deckId = generateId();
				decks.update((all) => [...all, { id: deckId, name: parsed.deckName, createdAt: now }]);
				cards.update((all) => [
					...all,
					...parsed.cards.map((card) => ({
						id: generateId(),
						deckId,
						front: card.front,
						back: card.back,
						tags: card.tags ?? [],
						interval: 0,
						repetitions: 0,
						easeFactor: 2.5,
						dueDate: now,
						createdAt: now
					}))
				]);
				goto(`/decks/${deckId}`);
				target.value = '';
				return;
			}
			const text = await file.text();
			const json = JSON.parse(text);
			const result = mergeDeckImport(json, generateId);
			decks.update((all) => [...all, result.deck]);
			cards.update((all) => [...all, ...result.cards]);
			goto(`/decks/${result.deck.id}`);
		} catch {
			importError = m['deck.importError']();
		}
		target.value = '';
	}

	// A shared deck arrives as `/?share=<token>`; import it once, then drop the
	// token so a reload does not create a second copy.
	let shareHandled = false;
	$effect(() => {
		const token = page.url.searchParams.get(SHARE_PARAM);
		if (shareHandled || !token) return;
		shareHandled = true;
		const shared = decodeDeckShare(token, generateId);
		if (!shared) {
			importError = m['deck.shareInvalid']();
		} else {
			decks.update((all) => [...all, shared.deck]);
			cards.update((all) => [...all, ...shared.cards]);
			goto(`/decks/${shared.deck.id}`, { replaceState: true });
		}
	});
</script>

<div class="min-h-screen bg-background pb-20">
	<div class="mx-auto max-w-5xl px-6 py-10">
		<header
			class="flex flex-col justify-between gap-5 border-b border-border pb-8 md:flex-row md:items-end"
		>
			<div>
				<p class="eyebrow mb-2">{greeting}</p>
				<h1 class="font-display text-4xl leading-[1.02] font-normal tracking-[-0.03em] md:text-5xl">
					{m['home.title']()}
				</h1>
				<p class="mt-2 text-sm text-muted-foreground">{m['home.subtitle']()}</p>
			</div>
			<div class="flex flex-wrap items-center gap-2.5">
				<div
					class="inline-flex items-center gap-2.5 border border-border bg-[var(--muted-surface)] px-3.5 py-2"
					title={m['home.streakTitle']()}
				>
					<span class="size-2 rounded-full bg-[var(--accent-text)]" aria-hidden="true"></span>
					<span class="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
						>{m['home.streak']()}</span
					>
					<span class="font-mono text-xs font-semibold tabular-nums"
						>{($streak ?? 0) === 1
							? m['home.streakDay']({ days: 1 })
							: m['home.streakDays']({ days: $streak ?? 0 })}</span
					>
				</div>
				{#if $xp > 0}
					<div
						class="inline-flex items-center gap-2.5 border border-border bg-[var(--muted-surface)] px-3.5 py-2"
						title={m['gamification.badge']({ level: $level, xp: $xp })}
					>
						<span class="size-2 rounded-full bg-[var(--accent-text)]" aria-hidden="true"></span>
						<span class="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
							>{m['gamification.level']({ level: $level })}</span
						>
						<span class="font-mono text-xs font-semibold tabular-nums"
							>{m['gamification.xp']({ xp: $xp })}</span
						>
					</div>
				{/if}
			</div>
		</header>

		<section
			class="mt-8 grid overflow-hidden rounded-lg border border-border bg-card shadow-[0_2px_12px_-4px_rgba(24,24,27,0.05)] md:grid-cols-3"
		>
			<div
				class="flex min-h-[238px] flex-col justify-between border-b border-border p-7 md:col-span-2 md:border-r md:border-b-0"
			>
				<p
					class="font-mono text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase"
				>
					{m['home.queue']()}
				</p>

				<div class="my-6 flex items-baseline gap-3">
					<span
						class="font-display text-[64px] leading-none font-normal tracking-[-0.04em] tabular-nums"
						>{dueTotal}</span
					>
					<span class="text-sm text-muted-foreground"
						>{dueTotal === 1
							? m['home.due.one']({ count: 1 })
							: m['home.due']({ count: dueTotal })}</span
					>
				</div>

				<div class="flex flex-wrap items-center gap-4">
					{#if nextDeck}
						<Button href={`/review/${nextDeck.deck.id}`} size="lg">
							<Play class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
							{m['home.study']()}
						</Button>
						<span class="text-xs text-muted-foreground"
							>{m['home.studyDeck']({ name: nextDeck.deck.name })}</span
						>
					{:else}
						<Button size="lg" variant="secondary" disabled>
							<Play class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
							{m['home.study']()}
						</Button>
						<span class="font-display text-sm text-muted-foreground italic"
							>{m['home.upToDate']()}</span
						>
					{/if}
					{#if dueTotal > 0}
						<Button href="/review/quick" variant="secondary" size="lg">
							{m['quickReview.start']()}
						</Button>
					{/if}
				</div>
			</div>

			<div
				class="flex flex-col justify-center divide-y divide-border bg-[color-mix(in_oklch,var(--bg)_42%,var(--surface))] p-7"
			>
				<div class="pb-5">
					<p
						class="font-mono text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase"
					>
						{m['home.decks']()}
					</p>
					<div class="mt-1 flex items-baseline gap-2">
						<span class="font-display text-3xl leading-none tracking-[-0.02em]"
							>{$decks.length}</span
						>
						<span class="text-xs text-muted-foreground">{m['home.decksDesc']()}</span>
					</div>
				</div>
				<div class="pt-5">
					<p
						class="font-mono text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase"
					>
						{m['home.acervo']()}
					</p>
					<div class="mt-1 flex items-baseline gap-2">
						<span class="font-display text-3xl leading-none tracking-[-0.02em]"
							>{$cards.length}</span
						>
						<span class="text-xs text-muted-foreground">{m['home.acervoDesc']()}</span>
					</div>
				</div>
			</div>
		</section>

		<section class="mt-12">
			<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
				<h2 class="font-display text-2xl font-normal tracking-[-0.02em]">
					{m['home.yourDecks']()}
				</h2>
				<div class="flex flex-wrap items-center gap-2">
					<AIGenerateLazy />
					<Button variant="ghost" onclick={createDeck} class="text-accent hover:text-accent">
						<Plus class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
						{m['home.newDeck']()}
					</Button>
					<label
						class="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						<Upload class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
						{m['deck.importDeck']()}
						<input
							type="file"
							accept=".json,application/json,.apkg,application/apkg"
							class="sr-only"
							onchange={handleImportDeck}
						/>
					</label>
				</div>
			</div>
			{#if $allTags.length > 0}
				<div class="mt-4 flex flex-wrap gap-2">
					<button
						type="button"
						onclick={() => (activeTagFilter = null)}
						class="rounded-full border px-3 py-1 text-xs font-medium transition-colors {activeTagFilter ===
						null
							? 'border-accent bg-accent/10 text-accent'
							: 'border-border text-muted-foreground hover:text-foreground'}"
					>
						{m['tags.all']()}
					</button>
					{#each $allTags as tag}
						<button
							type="button"
							onclick={() => (activeTagFilter = activeTagFilter === tag ? null : tag)}
							class="rounded-full border px-3 py-1 text-xs font-medium transition-colors {activeTagFilter ===
							tag
								? 'border-accent bg-accent/10 text-accent'
								: 'border-border text-muted-foreground hover:text-foreground'}"
						>
							{tag}
						</button>
					{/each}
				</div>
			{/if}

			{#if $decks.length === 0}
				<div
					class="mx-auto mt-8 max-w-xl rounded-lg border border-border bg-[var(--muted-surface)] p-10 text-center"
				>
					<h3 class="font-display text-xl tracking-[-0.01em]">{m['home.emptyTitle']()}</h3>
					<p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
						{m['home.emptyBody']()}
					</p>
					<Button class="mt-6" onclick={createDeck}>
						<Plus class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
						{m['home.emptyCta']()}
					</Button>
				</div>
			{:else}
				<div class="mt-4 flex flex-col gap-2.5">
					{#each filteredDecks as deck (deck.id)}
						{@const due = getDueCount(deck.id)}
						{@const total = $cards.filter((c) => c.deckId === deck.id).length}
						{@const pending = due > 0}
						<div
							class="group flex items-center gap-3 rounded-lg border bg-card px-4 py-3.5 transition-[border-color,box-shadow] duration-150 hover:shadow-[0_2px_12px_-5px_rgba(24,24,27,0.1)] sm:gap-4 {pending
								? 'border-[color-mix(in_oklch,var(--accent-text)_34%,var(--border))]'
								: 'border-border'}"
						>
							<div
								class="grid size-10 shrink-0 place-items-center rounded-md font-display text-[14px] {pending
									? 'bg-[var(--accent-solid)] text-white'
									: 'bg-[var(--muted-surface)] text-foreground'}"
							>
								{(deck.name ?? '').trim().slice(0, 2).toUpperCase()}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex min-w-0 items-center gap-2">
									<h3
										class="truncate text-sm font-semibold tracking-[-0.01em] group-hover:text-accent"
									>
										{deck.name}
									</h3>
									<span
										class="hidden shrink-0 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase sm:inline"
										>{formatDateShort(deck.createdAt, getLocale())}</span
									>
								</div>
								<p class="mt-1 text-xs text-muted-foreground">
									{total === 1 && due === 1
										? m['home.deckMeta.one']({ total, due })
										: m['home.deckMeta']({ total, due })}
								</p>
							</div>
							<div class="flex shrink-0 items-center gap-2">
								<Button
									href={`/review/${deck.id}`}
									variant={pending ? 'default' : 'secondary'}
									size="sm"
									disabled={total === 0}
								>
									<Play class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
									{pending ? m['home.studyShort']() : m['home.reviewShort']()}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									href={`/decks/${deck.id}`}
									aria-label={m['home.editAria']({ name: deck.name })}
								>
									<Edit class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
									{m['home.edit']()}
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
		{#if importError}
			<p class="mt-4 text-center text-sm text-[var(--q-errei)]">{importError}</p>
		{/if}
	</div>
</div>
