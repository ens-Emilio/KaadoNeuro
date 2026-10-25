<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { decks, cards, generateId, streak } from '$lib/stores.js';
	import { goto } from '$app/navigation';
	import { Plus, Play, Edit } from '@lucide/svelte';
	import { formatDateShort } from '$lib/import.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import * as m from '$lib/paraglide/messages.js';
	import AIGenerateDialog from '$lib/components/ai/ai-generate-dialog.svelte';

	function createDeck() {
		const id = generateId();
		decks.update((d) => [...d, { id, name: m['home.newDeck'](), createdAt: new Date().toISOString() }]);
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
	const greeting = $derived(hour < 12 ? m['home.greeting.morning']() : hour < 18 ? m['home.greeting.afternoon']() : m['home.greeting.evening']());
	let dueTotal = $derived(getTotalDue());
	let nextDeck = $derived(
		$decks
			.map((deck) => ({ deck, due: getDueCount(deck.id) }))
			.filter((entry) => entry.due > 0)
			.sort((a, b) => b.due - a.due)[0]
	);
</script>

<div class="min-h-screen bg-background pb-20">
	<div class="mx-auto max-w-5xl px-6 py-10">
		<header class="flex flex-col justify-between gap-5 border-b border-border pb-8 md:flex-row md:items-end">
			<div>
				<p class="eyebrow mb-2">{greeting}</p>
				<h1 class="font-display text-4xl font-normal leading-[1.02] tracking-[-0.03em] md:text-5xl">{m['home.title']()}</h1>
				<p class="mt-2 text-sm text-muted-foreground">{m['home.subtitle']()}</p>
			</div>
			<div class="flex flex-wrap items-center gap-2.5">
				<div
					class="inline-flex items-center gap-2.5 border border-border bg-[var(--muted-surface)] px-3.5 py-2"
					title={m['home.streakTitle']()}
				>
					<span class="size-2 rounded-full bg-[var(--accent-text)]" aria-hidden="true"></span>
					<span class="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{m['home.streak']()}</span>
					<span class="font-mono text-xs font-semibold tabular-nums">{($streak ?? 0) === 1 ? m['home.streakDay']({ days: 1 }) : m['home.streakDays']({ days: $streak ?? 0 })}</span>
				</div>
			</div>
		</header>

		<section class="mt-8 grid overflow-hidden rounded-lg border border-border bg-card shadow-[0_2px_12px_-4px_rgba(24,24,27,0.05)] md:grid-cols-3">
			<div class="flex min-h-[238px] flex-col justify-between border-b border-border p-7 md:col-span-2 md:border-b-0 md:border-r">
				<p class="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{m['home.queue']()}</p>

				<div class="my-6 flex items-baseline gap-3">
					<span class="font-display text-[64px] font-normal leading-none tracking-[-0.04em] tabular-nums">{dueTotal}</span>
					<span class="text-sm text-muted-foreground">{dueTotal === 1 ? m['home.due.one']({ count: 1 }) : m['home.due']({ count: dueTotal })}</span>
				</div>

				<div class="flex flex-wrap items-center gap-4">
					{#if nextDeck}
						<Button href={`/review/${nextDeck.deck.id}`} size="lg">
							<Play class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
							{m['home.study']()}
						</Button>
						<span class="text-xs text-muted-foreground">{m['home.studyDeck']({ name: nextDeck.deck.name })}</span>
					{:else}
						<Button size="lg" variant="secondary" disabled>
							<Play class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
							{m['home.study']()}
						</Button>
						<span class="font-display text-sm italic text-muted-foreground">{m['home.upToDate']()}</span>
					{/if}
				</div>
			</div>

			<div class="flex flex-col justify-center divide-y divide-border bg-[color-mix(in_oklch,var(--bg)_42%,var(--surface))] p-7">
				<div class="pb-5">
					<p class="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{m['home.decks']()}</p>
					<div class="mt-1 flex items-baseline gap-2">
						<span class="font-display text-3xl leading-none tracking-[-0.02em]">{$decks.length}</span>
						<span class="text-xs text-muted-foreground">{m['home.decksDesc']()}</span>
					</div>
				</div>
				<div class="pt-5">
					<p class="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{m['home.acervo']()}</p>
					<div class="mt-1 flex items-baseline gap-2">
						<span class="font-display text-3xl leading-none tracking-[-0.02em]">{$cards.length}</span>
						<span class="text-xs text-muted-foreground">{m['home.acervoDesc']()}</span>
					</div>
				</div>
			</div>
		</section>

		<section class="mt-12">
			<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
				<h2 class="font-display text-2xl font-normal tracking-[-0.02em]">{m['home.yourDecks']()}</h2>
				<div class="flex items-center gap-2">
					<AIGenerateDialog />
					<Button variant="ghost" onclick={createDeck} class="text-accent hover:text-accent">
						<Plus class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
						{m['home.newDeck']()}
					</Button>
				</div>
			</div>

			{#if $decks.length === 0}
				<div class="mx-auto mt-8 max-w-xl rounded-lg border border-border bg-[var(--muted-surface)] p-10 text-center">
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
					{#each $decks as deck (deck.id)}
						{@const due = getDueCount(deck.id)}
						{@const total = $cards.filter((c) => c.deckId === deck.id).length}
						{@const pending = due > 0}
						<div
							class="group flex items-center gap-3 rounded-lg border bg-card px-4 py-3.5 transition-[border-color,box-shadow] duration-150 hover:shadow-[0_2px_12px_-5px_rgba(24,24,27,0.1)] sm:gap-4 {pending
								? 'border-[color-mix(in_oklch,var(--accent-text)_34%,var(--border))]'
								: 'border-border'}"
						>
							<div class="grid size-10 shrink-0 place-items-center rounded-md font-display text-[14px] {pending ? 'bg-[var(--accent-solid)] text-white' : 'bg-[var(--muted-surface)] text-foreground'}">
								{(deck.name ?? '').trim().slice(0, 2).toUpperCase()}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex min-w-0 items-center gap-2">
									<h3 class="truncate text-sm font-semibold tracking-[-0.01em] group-hover:text-accent">{deck.name}</h3>
									<span class="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground sm:inline">{formatDateShort(deck.createdAt, getLocale())}</span>
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
								<Button variant="ghost" size="sm" href={`/decks/${deck.id}`} aria-label={m['home.editAria']({ name: deck.name })}>
									<Edit class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
									{m['home.edit']()}
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>
