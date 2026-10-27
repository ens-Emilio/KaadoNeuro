<script lang="ts">
	import { cards, reviewLogs, generateId, sessionLimit, allTags } from '$lib/stores.js';
	import { awardStreakBonus } from '$lib/gamification-store.js';
	import { processReview as processReviewLogic, getAllDueCards, applySessionLimit } from '$lib/review-session.js';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { haptic } from '$lib/haptics.js';
	import { ArrowLeft } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import MarkdownRenderer from '$lib/components/markdown-renderer.svelte';

	let activeTags = $state<string[]>([]);
	function toggleTag(tag: string) {
		activeTags = activeTags.includes(tag)
			? activeTags.filter((t) => t !== tag)
			: [...activeTags, tag];
	}

	let allDueCards = $derived(getAllDueCards($cards, new Date(), activeTags));
	let sessionActive = $state(true);
	let dueCards = $derived(sessionActive ? applySessionLimit(allDueCards, $sessionLimit) : allDueCards);

	let isFlipped = $state(false);
	let anim: '' | 'shake' | 'sink' | 'rise' = $state('');
	let showStamp = $state(false);
	let totalAtStart = $state(0);
	let sessionCount = $state(0);

	$effect(() => {
		if (allDueCards.length > 0 && totalAtStart === 0) {
			totalAtStart = allDueCards.length;
			sessionCount = 0;
			sessionActive = true;
		}
		if (allDueCards.length === 0 && totalAtStart > 0) {
			sessionCount = totalAtStart;
		}
	});

	function continueSession() {
		sessionActive = false;
	}

	let currentCard = $derived(dueCards[0]);
	let progress = $derived(totalAtStart > 0 ? ((totalAtStart - dueCards.length) / totalAtStart) * 100 : 0);
	let counterText = $derived(dueCards.length > 0 ? `${totalAtStart - dueCards.length + 1} / ${totalAtStart}` : `0 / ${totalAtStart || 0}`);

	function handleFlip() {
		isFlipped = true;
		haptic(10);
	}

	function handleReview(quality: number) {
		if (!currentCard) return;

		if (quality === 0) {
			anim = 'shake';
			haptic([10, 30, 10]);
			setTimeout(() => (anim = ''), 260);
		} else if (quality === 3) {
			anim = 'sink';
			haptic(10);
			setTimeout(() => (anim = ''), 220);
		} else if (quality === 4 || quality === 5) {
			showStamp = true;
			haptic(quality === 5 ? 18 : 10);
			setTimeout(() => (showStamp = false), 700);
			anim = 'rise';
		}

		const { updatedCard, newLog } = processReviewLogic(currentCard, quality, generateId);
		cards.update((all) => all.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
		reviewLogs.update((logs) => [...logs, newLog]);
		awardStreakBonus();
		isFlipped = false;
		if (anim === 'rise') setTimeout(() => (anim = ''), 320);
	}

	function onKeydown(e: KeyboardEvent) {
		if (!currentCard) return;
		if ((e.code === 'Space' || e.key === ' ') && !isFlipped) {
			e.preventDefault();
			handleFlip();
			return;
		}
		if (!isFlipped) return;
		if (e.key === '1') handleReview(0);
		if (e.key === '2') handleReview(3);
		if (e.key === '3') handleReview(4);
		if (e.key === '4') handleReview(5);
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="container mx-auto flex min-h-[80vh] max-w-[720px] flex-col justify-center px-5 sm:px-6 py-6">
	<div class="fixed top-[57px] left-0 right-0 z-20 border-b border-border/70 bg-[color-mix(in_oklch,var(--bg)_92%,transparent)] backdrop-blur-[14px]">
		<div class="mx-auto max-w-[720px] flex items-center justify-between gap-3 px-5 sm:px-6 py-2.5">
			<a href="/" class="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
				<ArrowLeft class="size-[18px] [stroke-width:1.75]" /> {m['review.exit']()}
			</a>
			<div class="flex items-center gap-3">
				<span class="font-mono text-[11px] tabular-nums text-muted-foreground">{counterText}</span>
				<div class="h-1.5 w-20 overflow-hidden rounded-full bg-border sm:w-28">
					<div class="h-full rounded-full bg-[var(--accent-text)] transition-all duration-300" style="width: {progress}%"></div>
				</div>
			</div>
		</div>
		{#if $allTags.length > 0}
			<div class="mx-auto max-w-[720px] flex flex-wrap gap-1.5 px-5 sm:px-6 py-1.5">
				{#each $allTags as tag}
					<button
						class="rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors {activeTags.includes(tag) ? 'bg-[var(--accent-solid)] text-white' : 'bg-[var(--muted-surface)] text-muted-foreground hover:text-foreground'}"
						onclick={() => toggleTag(tag)}
					>
						#{tag}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<div class="pt-10">
	{#if !currentCard}
		<div class="space-y-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
			{#if totalAtStart === 0}
				<Card.Root class="mx-auto max-w-md border-border bg-[var(--muted-surface)] p-10">
					<h2 class="font-display text-2xl tracking-[-0.02em]">{m['quickReview.title']()}</h2>
					<p class="mt-2 text-sm text-muted-foreground">{m['quickReview.empty']()}</p>
					<Button class="mt-6" href="/">
						<ArrowLeft class="size-[18px] [stroke-width:1.75]" /> {m['nav.home']()}
					</Button>
				</Card.Root>
			{:else}
				<div class="relative mx-auto flex size-24 items-center justify-center rounded-full bg-[var(--accent-solid)]/10">
					<span class="font-display text-3xl font-semibold text-[var(--accent-text)]">{sessionCount}</span>
				</div>
				<div class="space-y-1">
					<h2 class="font-display text-3xl tracking-[-0.03em]">{m['quickReview.completed']()}</h2>
					<p class="text-sm text-muted-foreground">{sessionCount === 1 ? m['review.doneBody.one']({ count: sessionCount }) : m['review.doneBody']({ count: sessionCount })}</p>
				</div>
				{#if sessionActive && allDueCards.length > 0}
					<Button size="lg" onclick={continueSession}>
						{m['review.backHome']()}
					</Button>
				{:else}
					<Button size="lg" href="/">
						<ArrowLeft class="size-[18px] [stroke-width:1.75]" /> {m['nav.home']()}
					</Button>
				{/if}
			{/if}
		</div>
	{:else}
		<div class="mb-4 flex items-center justify-between">
			<span class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{m['quickReview.title']()}</span>
			<span class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{m['review.flipHint']()}</span>
		</div>

		<div class="perspective-[1100px] mx-auto w-full max-w-[620px]">
			<div
				class="relative w-full cursor-pointer select-none transition-transform duration-500 preserve-3d {isFlipped ? 'rotate-y-180' : ''} {anim === 'shake' ? 'animate-shake' : ''} {anim === 'rise' ? 'animate-riseFade' : ''}"
				style="aspect-ratio: 4/3;"
				onclick={!isFlipped ? handleFlip : undefined}
				onkeydown={(e) => { if (e.key === 'Enter' && !isFlipped) handleFlip(); }}
				role="button"
				tabindex="0"
			>
				<div class="absolute inset-0 backface-hidden rounded-xl border border-border bg-card p-6 shadow-[0_4px_24px_-8px_rgba(24,24,27,0.08)] sm:p-10">
					<p class="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{m['review.front']}</p>
					<div class="flex h-full items-center justify-center overflow-auto">
						<div class="prose prose-sm sm:prose-base max-w-none text-center"><MarkdownRenderer content={currentCard.front} /></div>
					</div>
				</div>
				<div class="absolute inset-0 rotate-y-180 backface-hidden rounded-xl border border-border bg-card p-6 shadow-[0_4px_24px_-8px_rgba(24,24,27,0.08)] sm:p-10">
					<p class="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{m['review.answer']}</p>
					<div class="flex h-full items-center justify-center overflow-auto">
						<div class="prose prose-sm sm:prose-base max-w-none text-center"><MarkdownRenderer content={currentCard.back} /></div>
					</div>
				</div>
			</div>
		</div>

		{#if isFlipped}
			<div class="mt-6 grid grid-cols-4 gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
				<button class="group relative flex flex-col items-center gap-1 rounded-lg border border-[var(--q-errei)]/30 bg-[var(--q-errei)]/5 py-3 transition-all hover:bg-[var(--q-errei)] hover:text-white active:scale-95" onclick={() => handleReview(0)}>
					<span class="text-sm font-semibold">{m['review.again']()}</span>
					<span class="text-[10px] opacity-60 group-hover:opacity-100">{m['review.againHint']()}</span>
				</button>
				<button class="group relative flex flex-col items-center gap-1 rounded-lg border border-[var(--q-dificil)]/30 bg-[var(--q-dificil)]/5 py-3 transition-all hover:bg-[var(--q-dificil)] hover:text-white active:scale-95" onclick={() => handleReview(3)}>
					<span class="text-sm font-semibold">{m['review.hard']()}</span>
					<span class="text-[10px] opacity-60 group-hover:opacity-100">{m['review.hardHint']()}</span>
				</button>
				<button class="group relative flex flex-col items-center gap-1 rounded-lg border border-[var(--q-bom)]/30 bg-[var(--q-bom)]/5 py-3 transition-all hover:bg-[var(--q-bom)] hover:text-white active:scale-95" onclick={() => handleReview(4)}>
					<span class="text-sm font-semibold">{m['review.good']()}</span>
					<span class="text-[10px] opacity-60 group-hover:opacity-100">{m['review.goodHint']()}</span>
				</button>
				<button class="group relative flex flex-col items-center gap-1 rounded-lg border border-[var(--q-facil)]/30 bg-[var(--q-facil)]/5 py-3 transition-all hover:bg-[var(--q-facil)] hover:text-white active:scale-95" onclick={() => handleReview(5)}>
					<span class="text-sm font-semibold">{m['review.easy']()}</span>
					<span class="text-[10px] opacity-60 group-hover:opacity-100">{m['review.easyHint']()}</span>
				</button>
			</div>
			<p class="mt-3 text-center font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{m['review.shortcuts']()}</p>
		{:else}
			<div class="mt-6 flex justify-center">
				<Button size="lg" class="w-full max-w-xs" onclick={handleFlip}>{m['review.show']()}</Button>
			</div>
		{/if}
	{/if}
	</div>
</div>

<style>
	@keyframes shake { 0%,100% { transform: translateX(0) rotateY(180deg); } 20% { transform: translateX(-5px) rotateY(180deg); } 40% { transform: translateX(5px) rotateY(180deg); } 60% { transform: translateX(-3px) rotateY(180deg); } 80% { transform: translateX(3px) rotateY(180deg); } }
	@keyframes stampFall { 0% { opacity: 0; transform: scale(1.4) rotate(-8deg); } 60% { opacity: 1; transform: scale(0.98) rotate(-3deg); } 100% { opacity: 1; transform: scale(1) rotate(-3deg); } }
	@keyframes riseFade { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-10px); opacity: 0.98; } }
</style>