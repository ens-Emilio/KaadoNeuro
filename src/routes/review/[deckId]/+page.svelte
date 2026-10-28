<script lang="ts">
	import { page } from '$app/state';
	import { allTags, cards as cardStore, sessionLimit } from '$lib/stores.js';
	import { clock } from '$lib/clock-store.js';
	import { createReviewRunner } from '$lib/review-runner.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import ReviewCard from '$lib/components/review-card.svelte';
	import { ArrowLeft, Play, Pause, RotateCcw } from '@lucide/svelte';
	import {
		pomodoro,
		pomodoroPhase,
		pomodoroTimeRemaining,
		pomodoroPaused,
		pomodoroCompletedSessions,
		formatPomodoroTime
	} from '$lib/pomodoro-store.js';
	import * as m from '$lib/paraglide/messages.js';

	const deckId = page.params.deckId ?? '';
	const review = createReviewRunner({
		cards: () => $cardStore,
		limit: () => $sessionLimit,
		scope: { kind: 'deck', deckId },
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
				<span class="font-mono text-[11px] font-bold text-muted-foreground"
					><strong class="text-foreground tabular-nums">{review.counterText}</strong></span
				>
				<div class="h-[3px] w-24 overflow-hidden rounded-md bg-border">
					<div
						class="h-full origin-left bg-[var(--accent-text)] transition-[width] duration-300"
						style="width: {review.progress}%"
					></div>
				</div>
			</div>
			<div class="flex items-center gap-2 border-l border-border/50 pl-3">
				{#if $pomodoroPhase === 'idle'}
					<button
						type="button"
						onclick={() => pomodoro.startWork()}
						class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
						aria-label={m['pomodoro.start']()}
					>
						<Play class="size-3 fill-current" />
						{m['pomodoro.start']()}
					</button>
				{:else}
					<span
						class="font-mono text-[11px] font-bold tabular-nums {$pomodoroPhase === 'work'
							? 'text-emerald-600 dark:text-emerald-400'
							: 'text-amber-600 dark:text-amber-400'}"
						>{formatPomodoroTime($pomodoroTimeRemaining)}</span
					>
					<span class="text-[10px] font-medium text-muted-foreground uppercase"
						>{$pomodoroPhase === 'work'
							? m['pomodoro.work']()
							: $pomodoroPhase === 'shortBreak'
								? m['pomodoro.shortBreak']()
								: m['pomodoro.longBreak']()}</span
					>
					{#if $pomodoroPaused}
						<button
							type="button"
							onclick={() => pomodoro.resume()}
							class="rounded p-0.5 text-muted-foreground hover:text-foreground"
							aria-label={m['pomodoro.pause']()}><Play class="size-3.5 fill-current" /></button
						>
					{:else}
						<button
							type="button"
							onclick={() => pomodoro.pause()}
							class="rounded p-0.5 text-muted-foreground hover:text-foreground"
							aria-label={m['pomodoro.pause']()}><Pause class="size-3.5" /></button
						>
					{/if}
					<button
						type="button"
						onclick={() => pomodoro.reset()}
						class="rounded p-0.5 text-muted-foreground hover:text-destructive"
						aria-label={m['pomodoro.reset']()}><RotateCcw class="size-3.5" /></button
					>
					{#if $pomodoroPhase === 'work'}<span
							class="text-[10px] text-muted-foreground tabular-nums"
							>{m['pomodoro.cycle']({ current: $pomodoroCompletedSessions + 1 })}</span
						>{/if}
				{/if}
			</div>
		</div>
		{#if $allTags.length > 0}
			<div class="mx-auto flex max-w-[720px] flex-wrap gap-1.5 px-5 py-1.5 sm:px-6">
				{#each $allTags as tag}
					<button
						type="button"
						aria-pressed={review.activeTags.includes(tag)}
						onclick={() => review.toggleTag(tag)}
						class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {review.activeTags.includes(
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
				<div
					class="mx-auto grid size-16 place-items-center rounded-md border border-[color-mix(in_oklch,var(--accent-text)_20%,transparent)] bg-[var(--accent-soft)] text-accent"
					aria-hidden="true"
				>
					<svg
						width="28"
						height="28"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						><path d="M12 5a7 7 0 1 0 0 14" /><path d="M12 5a7 7 0 0 1 7 7" /><path
							d="M12 19a7 7 0 0 1-7-7"
						/></svg
					>
				</div>
				<h1 class="font-display text-[34px] leading-none">{m['review.done']()}</h1>
				<p class="text-sm text-muted-foreground">
					{#if review.totalAtStart > 0}
						{review.totalAtStart === 1
							? m['review.doneBody.one']({ count: 1 })
							: m['review.doneBody']({ count: review.totalAtStart })}
					{:else}
						{m['review.nonePending']()}
					{/if}
				</p>
				<div class="flex justify-center gap-3">
					{#if review.sessionActive && review.allDueCards.length > 0}<Button
							size="lg"
							onclick={review.continueSession}
							>{m['review.continue']({ count: review.allDueCards.length })}</Button
						>{/if}
					<Button
						href="/"
						size="lg"
						variant={review.sessionActive && review.allDueCards.length > 0 ? 'outline' : 'default'}
						>{m['review.backHome']()}</Button
					>
				</div>
			</div>
		{:else}
			<div class="mb-4 flex items-center justify-between">
				<span class="font-mono text-[11px] font-bold text-muted-foreground uppercase"
					>{m['review.progress']()}</span
				>
				<span class="font-mono text-[11px] font-bold text-muted-foreground uppercase"
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
