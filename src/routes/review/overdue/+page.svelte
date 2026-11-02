<script lang="ts">
	import { allTags, cards as cardStore, sessionLimit } from '$lib/stores.js';
	import { clock } from '$lib/clock-store.js';
	import { createReviewRunner } from '$lib/review-runner.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import ReviewCard from '$lib/components/review-card.svelte';
	import { ArrowLeft, AlertCircle } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { getOverdueCards, countOverdueCards } from '$lib/review-session.js';

	const overdueCards = $derived(getOverdueCards($cardStore, undefined, $clock));
	const overdueCount = $derived(countOverdueCards($cardStore, undefined, $clock));

	const review = createReviewRunner({
		cards: () => $cardStore,
		limit: () => $sessionLimit,
		scope: { kind: 'overdue' },
		now: () => $clock
	});
</script>

<svelte:window onkeydown={review.onKeydown} />

<div
	class="container mx-auto flex min-h-[80vh] max-w-[720px] flex-col justify-center px-5 py-6 sm:px-6"
>
	<div
		class="fixed top-[57px] right-0 left-0 z-20 border-b border-border/70 bg-[color-mix(in_oklch,var(--bg)_92%,transparent)] backdrop-blur-[14px]"
	>
		<div class="mx-auto flex max-w-[720px] items-center justify-between gap-3 px-5 py-2.5 sm:px-6">
			<a
				href="/"
				class="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft class="size-[18px] [stroke-width:1.75]" />
				{m['home.title']()}
			</a>
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-1.5 rounded-md bg-accent/10 px-2.5 py-1">
					<AlertCircle class="size-4 text-accent" />
					<span class="text-xs font-semibold text-accent">{overdueCount} Overdue</span>
				</div>
			</div>
		</div>
		{#if $allTags.length > 0}
			<div class="mx-auto flex max-w-[720px] flex-wrap gap-1.5 px-5 py-1.5 sm:px-6">
				{#each $allTags as tag}
					<button
						onclick={() => review.toggleTag(tag)}
						class="rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors {review.activeTags.includes(
							tag
						)
							? 'border-accent bg-accent/10 text-accent'
							: 'border-border bg-card text-muted-foreground hover:border-accent/50'}"
					>
						{tag}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<div class="pt-10">
		{#if !review.currentCard}
			<div class="animate-in space-y-6 text-center duration-300 fade-in slide-in-from-bottom-2">
				<Card.Root class="mx-auto max-w-sm p-6">
					<Card.Header>
						<Card.Title class="flex items-center justify-center gap-2">
							<AlertCircle class="size-5 text-accent" />
							{m['home.upToDate']()}
						</Card.Title>
						<Card.Description>
							{m['home.subtitle']()}
						</Card.Description>
					</Card.Header>
					<Card.Footer class="justify-center">
						<Button href="/review/quick" variant="secondary">
							{m['quickReview.start']()}
						</Button>
					</Card.Footer>
				</Card.Root>
			</div>
		{:else}
			<div class="mb-4 flex items-center justify-between">
				<div class="font-mono text-xs text-muted-foreground">
					{review.counterText}
				</div>
				<div class="h-1 w-32 overflow-hidden rounded-full bg-border">
					<div
						class="h-full bg-accent transition-all duration-300"
						style="width: {review.progress}%"
					></div>
				</div>
			</div>
			<ReviewCard
				card={review.currentCard}
				flipped={review.isFlipped}
				onFlip={review.flip}
				onReview={review.review}
			/>
		{/if}
	</div>
</div>
