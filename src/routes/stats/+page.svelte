<script lang="ts">
	import { decks, cards, reviewLogs } from '$lib/stores.js';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, BarChart2, Activity } from '@lucide/svelte';

	// Stats
	let totalDecks = $derived($decks.length);
	let totalCards = $derived($cards.length);
	let totalReviews = $derived($reviewLogs.length);

	// Cards by deck
	let cardsByDeck = $derived(
		$decks.map((d) => ({
			name: d.name,
			count: $cards.filter((c) => c.deckId === d.id).length
		}))
	);

	// Reviews today
	let reviewsToday = $derived(
		$reviewLogs.filter((r) => {
			const date = new Date(r.reviewedAt);
			const today = new Date();
			return (
				date.getDate() === today.getDate() &&
				date.getMonth() === today.getMonth() &&
				date.getFullYear() === today.getFullYear()
			);
		}).length
	);

	// Average quality
	let averageQuality = $derived(
		$reviewLogs.length > 0
			? ($reviewLogs.reduce((acc, r) => acc + r.quality, 0) / $reviewLogs.length).toFixed(1)
			: '0.0'
	);
</script>

<div class="container mx-auto max-w-4xl space-y-8 p-6">
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="icon" href="/">
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<h1 class="flex items-center gap-2 text-3xl font-bold tracking-tight">
			<BarChart2 class="h-8 w-8" /> Estatísticas
		</h1>
	</div>

	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total de Baralhos</Card.Title>
				<Activity class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalDecks}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total de Cartões</Card.Title>
				<Activity class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalCards}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Revisões Hoje</Card.Title>
				<Activity class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{reviewsToday}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Qualidade Média</Card.Title>
				<Activity class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{averageQuality}</div>
				<p class="text-xs text-muted-foreground">de 5.0</p>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root class="col-span-1">
			<Card.Header>
				<Card.Title>Cartões por Baralho</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					{#each cardsByDeck as stat}
						<div class="flex items-center">
							<div class="flex-1 font-medium">{stat.name}</div>
							<div class="h-2.5 w-1/2 rounded-full bg-secondary">
								<div
									class="h-2.5 rounded-full bg-primary"
									style="width: {totalCards > 0 ? (stat.count / totalCards) * 100 : 0}%"
								></div>
							</div>
							<div class="ml-4 w-8 text-right text-sm text-muted-foreground">{stat.count}</div>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="col-span-1">
			<Card.Header>
				<Card.Title>Progresso de Aprendizado</Card.Title>
				<Card.Description>Em breve gráficos detalhados de retenção.</Card.Description>
			</Card.Header>
			<Card.Content class="flex h-[200px] items-center justify-center text-muted-foreground">
				Gráfico Placeholder
			</Card.Content>
		</Card.Root>
	</div>
</div>
