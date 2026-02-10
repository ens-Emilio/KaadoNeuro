<script lang="ts">
	import { page } from '$app/state';
	import { cards, reviewLogs, generateId } from '$lib/stores.js';
	import { calculateReview } from '$lib/sm2.js';
	import type { Flashcard } from '$lib/types.js';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { goto } from '$app/navigation';
	import { ArrowLeft } from '@lucide/svelte';

	const deckId = page.params.deckId ?? '';

	// Cards due today or earlier
	let dueCards = $derived(
		$cards
			.filter((c) => c.deckId === deckId && new Date(c.dueDate) <= new Date())
			.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
	);

	let isFlipped = $state(false);

	// Since we remove cards from the list as we review them, the current card is always the first one (index 0).
	let currentCard = $derived(dueCards[0]);

	function handleFlip() {
		isFlipped = true;
	}

	function processReview(quality: number) {
		if (!currentCard) return;

		// Calculate new schedule
		const updated = calculateReview(currentCard, quality);

		// Update card in store
		cards.update((all) => all.map((c) => (c.id === currentCard.id ? { ...c, ...updated } : c)));

		// Log review
		reviewLogs.update((logs) => [
			...logs,
			{
				id: generateId(),
				cardId: currentCard.id,
				quality,
				reviewedAt: new Date().toISOString()
			}
		]);

		isFlipped = false;
	}
</script>

<div class="container mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center p-6 text-center">
	<div class="fixed top-4 left-4">
		<Button variant="ghost" href="/">
			<ArrowLeft class="mr-2 h-4 w-4" /> Sair
		</Button>
	</div>

	{#if !currentCard}
		<div class="animate-in space-y-6 duration-500 fade-in slide-in-from-bottom-4">
			<h1 class="text-4xl font-bold text-primary">Parabéns! 🎉</h1>
			<p class="text-xl text-muted-foreground">
				Você revisou todos os cartões deste baralho por hoje.
			</p>
			<div class="flex justify-center gap-4">
				<Button href="/" size="lg">Voltar ao Dashboard</Button>
			</div>
		</div>
	{:else}
		<div class="mb-8 flex items-center justify-between text-sm text-muted-foreground">
			<span>Revisão em progresso</span>
			<span>{dueCards.length} restantes</span>
		</div>

		<div
			class="perspective-1000 group relative h-80 w-full cursor-pointer ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
			onclick={!isFlipped ? handleFlip : undefined}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && !isFlipped && handleFlip()}
			role="button"
			tabindex="0"
		>
			<div
				class="transform-style-3d relative h-full w-full transition-all duration-500 {isFlipped
					? 'rotate-y-180'
					: ''}"
			>
				<!-- Front -->
				<Card.Root
					class="absolute flex h-full w-full flex-col items-center justify-center border-2 p-8 shadow-lg backface-hidden"
				>
					<div class="mb-4 text-3xl font-semibold">{currentCard.front}</div>
					<div class="absolute bottom-6 animate-pulse text-sm text-muted-foreground">
						Toque para ver a resposta
					</div>
				</Card.Root>

				<!-- Back -->
				<Card.Root
					class="absolute flex h-full w-full rotate-y-180 flex-col items-center justify-center border-2 border-primary/20 bg-muted/30 p-8 shadow-lg backface-hidden"
				>
					<div class="mb-4 text-sm tracking-widest text-muted-foreground uppercase">Resposta</div>
					<div class="text-2xl font-medium">{currentCard.back}</div>
				</Card.Root>
			</div>
		</div>

		<!-- Controls -->
		{#if isFlipped}
			<div
				class="mt-8 grid animate-in grid-cols-4 gap-3 duration-300 fade-in slide-in-from-bottom-2"
			>
				<div class="flex flex-col gap-1">
					<Button
						variant="destructive"
						onclick={() => processReview(0)}
						class="h-14 text-lg font-bold">Errei</Button
					>
					<span class="text-xs text-muted-foreground">Recomeçar</span>
				</div>
				<div class="flex flex-col gap-1">
					<Button
						variant="secondary"
						onclick={() => processReview(3)}
						class="h-14 bg-orange-100 text-lg font-bold text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400"
						>Difícil</Button
					>
					<span class="text-xs text-muted-foreground">Log</span>
				</div>
				<div class="flex flex-col gap-1">
					<Button
						variant="default"
						onclick={() => processReview(4)}
						class="h-14 bg-blue-100 text-lg font-bold text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
						>Bom</Button
					>
					<span class="text-xs text-muted-foreground">Médio</span>
				</div>
				<div class="flex flex-col gap-1">
					<Button
						variant="outline"
						onclick={() => processReview(5)}
						class="h-14 border-green-500 text-lg font-bold text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
						>Fácil</Button
					>
					<span class="text-xs text-muted-foreground">Longo</span>
				</div>
			</div>
		{:else}
			<div class="mt-8 flex h-14 items-center justify-center">
				<Button size="lg" class="w-full max-w-xs" onclick={handleFlip}>Mostrar Resposta</Button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.perspective-1000 {
		perspective: 1000px;
	}
	.transform-style-3d {
		transform-style: preserve-3d;
	}
	:global(.backface-hidden) {
		backface-visibility: hidden;
	}
	.rotate-y-180 {
		transform: rotateY(180deg);
	}
</style>
