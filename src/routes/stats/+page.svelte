<script lang="ts">
	import { decks, cards, reviewLogs } from '$lib/stores.js';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, BarChart2 } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	let totalDecks = $derived($decks.length);
	let totalCards = $derived($cards.length);
	let reviewsToday = $derived(
		$reviewLogs.filter((r) => {
			const d = new Date(r.reviewedAt);
			const t = new Date();
			return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
		}).length
	);
	let averageQuality = $derived(
		$reviewLogs.length > 0 ? ($reviewLogs.reduce((acc, r) => acc + r.quality, 0) / $reviewLogs.length).toFixed(1) : '0.0'
	);
	let cardsByDeck = $derived(
		$decks.map((d) => ({ name: d.name, count: $cards.filter((c) => c.deckId === d.id).length }))
	);
	let avgNum = $derived(Number(averageQuality));

	const qualityRows = [
		{ q: 0, label: m['stats.again'](), color: 'var(--q-errei)' },
		{ q: 3, label: m['stats.hard'](), color: 'var(--q-dificil)' },
		{ q: 4, label: m['stats.good'](), color: 'var(--q-bom)' },
		{ q: 5, label: m['stats.easy'](), color: 'var(--q-facil)' }
	];
</script>

<div class="container mx-auto max-w-4xl space-y-8 p-5 sm:p-6">
	<div class="flex items-center gap-3">
		<Button variant="ghost" size="icon" href="/" aria-label={m['deck.back']()}>
			<ArrowLeft class="size-[18px] [stroke-width:1.75]" />
		</Button>
		<h1 class="flex items-center gap-2 font-display text-[28px] font-normal tracking-[-0.02em]">
			<BarChart2 class="size-7 text-accent [stroke-width:1.75]" /> {m['stats.title']()}
		</h1>
	</div>

	<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root class="rounded-lg">
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="font-mono text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground"> {m['stats.decks']()}</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="font-display text-[30px] leading-none">{totalDecks}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="rounded-lg">
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="font-mono text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground"> {m['stats.cards']()}</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="font-display text-[30px] leading-none">{totalCards}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="rounded-lg">
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="font-mono text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground"> {m['stats.today']()}</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="font-display text-[30px] leading-none">{reviewsToday}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="rounded-lg">
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="font-mono text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground"> {m['stats.quality']()}</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="font-display text-[30px] leading-none {avgNum >= 4 ? 'text-accent' : ''}">{avgNum.toFixed(1)}</div>
				<p class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground"> {m['stats.qualityOf']()}</p>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid gap-3 md:grid-cols-2">
		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title class="text-sm font-semibold"> {m['stats.byDeck']()}</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="space-y-3">
					{#each cardsByDeck as stat}
						<div class="flex items-center gap-3">
							<div class="flex-1 truncate text-sm font-medium">{stat.name}</div>
							<div class="h-2 w-1/2 rounded-md bg-[var(--muted-surface)] overflow-hidden">
								<div
									class="h-2 rounded-md bg-[var(--accent-text)]"
									style="width: {totalCards > 0 ? (stat.count / totalCards) * 100 : 0}%"
								></div>
							</div>
							<div class="num w-8 text-right text-xs text-muted-foreground tabular-nums">{stat.count}</div>
						</div>
					{/each}
					{#if cardsByDeck.length === 0}
						<p class="text-sm text-muted-foreground"> {m['stats.noDecks']()}</p>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title class="text-sm font-semibold"> {m['stats.progress']()}</Card.Title>
				<Card.Description class="font-mono text-xs"> {m['stats.progressDesc']()}</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if $reviewLogs.length === 0}
					<div class="flex h-[160px] items-center justify-center text-sm text-muted-foreground"> {m['stats.noReviews']()}</div>
				{:else}
					<div class="space-y-2">
						{#each qualityRows as row}
							{@const count = $reviewLogs.filter((r) => r.quality === row.q).length}
							{@const pct = $reviewLogs.length ? (count / $reviewLogs.length) * 100 : 0}
							<div class="flex items-center gap-3">
								<span class="w-16 font-mono text-xs font-semibold text-foreground">{row.label}</span>
								<div class="h-2 flex-1 rounded-md bg-[var(--muted-surface)] overflow-hidden">
									<div class="h-2 rounded-md" style="width:{pct}%; background:{row.color}"></div>
								</div>
								<span class="num w-10 text-right text-xs tabular-nums">{count}</span>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
