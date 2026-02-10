<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { decks, cards, generateId, streak } from '$lib/stores.js';
	import { goto } from '$app/navigation';
	import { Plus, Play, Edit, Flame, BarChart3, BookOpen, Layers } from '@lucide/svelte';

	function createDeck() {
		const id = generateId();
		const name = 'Novo Baralho';
		decks.update((d) => [...d, { id, name, createdAt: new Date().toISOString() }]);
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

	// Greeting logic
	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
</script>

<div class="min-h-screen bg-background pb-20">
	<!-- Hero Header -->
	<header class="bg-primary/5 pt-10 pb-16 dark:bg-primary/10">
		<div class="container mx-auto px-6">
			<div class="mb-10 flex items-center justify-between">
				<div class="space-y-1">
					<h1 class="text-4xl font-bold tracking-tight text-foreground">{greeting}!</h1>
					<p class="text-base font-medium text-muted-foreground">Bora exercitar a memória hoje?</p>
				</div>
				<!-- Streak Badge -->
				<div
					class="flex items-center gap-3 rounded-full bg-background/80 px-5 py-2.5 shadow-sm ring-1 ring-border/50 backdrop-blur-md transition-transform hover:scale-105"
				>
					<Flame class="h-6 w-6 animate-pulse fill-orange-500 text-orange-500" />
					<div class="flex flex-col leading-none">
						<span class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
							>Streak</span
						>
						<span class="text-sm font-bold text-orange-600 dark:text-orange-400"
							>{$streak} dias</span
						>
					</div>
				</div>
			</div>

			<!-- Main Stats Card -->
			<div
				class="relative overflow-hidden rounded-3xl bg-primary px-8 py-10 text-primary-foreground shadow-xl shadow-primary/25"
			>
				<div class="relative z-10 flex items-end justify-between">
					<div class="space-y-2">
						<p class="text-base font-medium text-primary-foreground/80">Total para Revisar</p>
						<div class="flex items-baseline gap-2">
							<span class="text-6xl font-extrabold tracking-tighter">{getTotalDue()}</span>
							<span class="text-xl font-medium text-primary-foreground/60">cartões</span>
						</div>
					</div>
					<Button variant="secondary" size="lg" class="font-semibold shadow-sm" href="/stats">
						<BarChart3 class="mr-2 h-5 w-5" />
						Estatísticas
					</Button>
				</div>
				<!-- Decorative bg shapes -->
				<div
					class="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 opacity-50 blur-3xl"
				></div>
				<div
					class="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 opacity-50 blur-2xl"
				></div>
			</div>
		</div>
	</header>

	<!-- Decks Section -->
	<main class="container mx-auto mt-8 space-y-8 px-6">
		<div class="flex items-center justify-between pl-1">
			<h2 class="flex items-center gap-3 text-2xl font-bold tracking-tight">
				<div class="rounded-lg bg-primary/10 p-2 text-primary">
					<Layers class="h-5 w-5" />
				</div>
				Seus Baralhos
			</h2>
			<Button
				variant="ghost"
				onclick={createDeck}
				class="font-medium text-primary hover:bg-primary/5 hover:text-primary/80"
			>
				<Plus class="mr-2 h-4 w-4" /> Novo Baralho
			</Button>
		</div>

		{#if $decks.length === 0}
			<!-- Empty State -->
			<div
				class="flex animate-in flex-col items-center justify-center rounded-3xl border-2 border-dashed border-muted bg-card/50 py-20 text-center duration-500 zoom-in-95 fade-in"
			>
				<div class="mb-6 rounded-full bg-primary/5 p-6 shadow-inner">
					<BookOpen class="h-10 w-10 text-primary/60" />
				</div>
				<h3 class="text-xl font-bold">Nenhum baralho ainda</h3>
				<p class="mt-2 max-w-xs text-base text-muted-foreground">
					Crie seu primeiro baralho para começar a jornada de aprendizado.
				</p>
				<Button class="mt-8 shadow-md" size="lg" onclick={createDeck}>
					<Plus class="mr-2 h-5 w-5" /> Criar Primeiro Baralho
				</Button>
			</div>
		{:else}
			<!-- Decks Grid -->
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each $decks as deck (deck.id)}
					{@const due = getDueCount(deck.id)}
					{@const total = $cards.filter((c) => c.deckId === deck.id).length}

					<Card.Root
						class="group relative overflow-hidden rounded-2xl border-border/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
					>
						<Card.Content class="p-6">
							<div class="mb-6 flex items-start justify-between">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground"
								>
									<BookOpen class="h-6 w-6" />
								</div>
								{#if due > 0}
									<span
										class="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600 ring-1 ring-red-600/10 ring-inset dark:bg-red-900/20 dark:text-red-400 dark:ring-red-400/20"
									>
										<span class="relative flex h-2 w-2">
											<span
												class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"
											></span>
											<span class="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
										</span>
										{due} pendentes
									</span>
								{:else if total > 0}
									<span
										class="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-600 ring-1 ring-green-600/20 ring-inset dark:bg-green-900/20 dark:text-green-400 dark:ring-green-400/20"
									>
										Em dia
									</span>
								{/if}
							</div>

							<div class="mb-6 space-y-2">
								<h3
									class="line-clamp-1 text-xl font-bold tracking-tight transition-colors group-hover:text-primary"
								>
									{deck.name}
								</h3>
								<p class="text-sm font-medium text-muted-foreground">{total} cartões totais</p>
							</div>

							<div class="flex gap-3">
								<Button
									class="h-10 flex-1 text-base font-semibold shadow-sm transition-transform active:scale-95"
									variant={due > 0 ? 'default' : 'secondary'}
									href={`/review/${deck.id}`}
									disabled={total === 0}
								>
									<Play class="mr-2 h-4 w-4" />
									{due > 0 ? 'Estudar' : 'Revisar'}
								</Button>
								<Button
									variant="outline"
									size="icon"
									class="h-10 w-10 shrink-0 border-border/60 transition-colors hover:bg-secondary"
									href={`/decks/${deck.id}`}
								>
									<Edit class="h-4 w-4 text-muted-foreground" />
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</main>
</div>
