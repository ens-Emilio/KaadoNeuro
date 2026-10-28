<script lang="ts">
	import { allTags, cards as cardStore, sessionLimit } from '$lib/stores.js';
	import { clock } from '$lib/clock-store.js';
	import { createReviewRunner } from '$lib/review-runner.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import ReviewCard from '$lib/components/review-card.svelte';
	import { ArrowLeft } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	const review = createReviewRunner({
		cards: () => $cardStore,
		limit: () => $sessionLimit,
		scope: { kind: 'all' },
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
				class="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft class="size-[18px] [stroke-width:1.75]" />
				{m['review.exit']()}
			</a>
			<div class="flex items-center gap-3">
				<span class="font-mono text-[11px] text-muted-foreground tabular-nums"
					>{review.counterText}</span
				>
				<div class="h-1.5 w-20 overflow-hidden rounded-full bg-border sm:w-28">
					<div
						class="h-full rounded-full bg-[var(--accent-text)] transition-all duration-300"
						style="width: {review.progress}%"
					></div>
				</div>
			</div>
		</div>
		{#if $allTags.length > 0}
			<div class="mx-auto flex max-w-[720px] flex-wrap gap-1.5 px-5 py-1.5 sm:px-6">
				{#each $allTags as tag}
					<button
						type="button"
						aria-pressed={review.activeTags.includes(tag)}
						onclick={() => review.toggleTag(tag)}
						class="rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors {review.activeTags.includes(
							tag
						)
							? 'bg-accent text-accent-foreground'
							: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}">{tag}</button
					>
				{/each}
			</div>
		{/if}
	</div>

	<div class="pt-10">
		{#if !review.currentCard}
			<div class="animate-in space-y-6 text-center duration-300 fade-in slide-in-from-bottom-2">
				{#if review.totalAtStart === 0}
					<Card.Root class="mx-auto max-w-md border-border bg-[var(--muted-surface)] p-10">
						<h2 class="font-display text-2xl">{m['quickReview.title']()}</h2>
						<p class="mt-2 text-sm text-muted-foreground">{m['quickReview.empty']()}</p>
						<Button class="mt-6" href="/"
							><ArrowLeft class="size-[18px] [stroke-width:1.75]" /> {m['nav.home']()}</Button
						>
					</Card.Root>
				{:else}
					<div class="space-y-1">
						<h2 class="font-display text-3xl">{m['quickReview.completed']()}</h2>
						<p class="text-sm text-muted-foreground">
							{review.sessionCount === 1
								? m['review.doneBody.one']({ count: review.sessionCount })
								: m['review.doneBody']({ count: review.sessionCount })}
						</p>
					</div>
					{#if review.sessionActive && review.allDueCards.length > 0}
						<Button size="lg" onclick={review.continueSession}
							>{m['review.continue']({ count: review.allDueCards.length })}</Button
						>
					{:else}
						<Button size="lg" href="/"
							><ArrowLeft class="size-[18px] [stroke-width:1.75]" /> {m['nav.home']()}</Button
						>
					{/if}
				{/if}
			</div>
		{:else}
			<div class="mb-4 flex items-center justify-between">
				<span class="font-mono text-[10px] text-muted-foreground uppercase"
					>{m['quickReview.title']()}</span
				>
				<span class="font-mono text-[10px] text-muted-foreground uppercase"
					>{m['review.remaining']({ count: review.remaining })}</span
				>
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
