<script lang="ts">
	import { page } from '$app/state';
	import { cards, reviewLogs, generateId } from '$lib/stores.js';
	import { calculateReview } from '$lib/sm2.js';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { haptic } from '$lib/haptics.js';
	import { ArrowLeft } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	const deckId = page.params.deckId ?? '';

	let dueCards = $derived(
		$cards
			.filter((c) => c.deckId === deckId && new Date(c.dueDate) <= new Date())
			.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
	);

	let isFlipped = $state(false);
	let anim: '' | 'shake' | 'sink' | 'rise' = $state('');
	let showStamp = $state(false);
	let totalAtStart = $state(0);
	let sessionCount = $state(0);

	$effect(() => {
		if (dueCards.length > 0 && totalAtStart === 0) {
			totalAtStart = dueCards.length;
			sessionCount = 0;
		}
		if (dueCards.length === 0 && totalAtStart > 0) {
			sessionCount = totalAtStart;
		}
	});

	let currentCard = $derived(dueCards[0]);
	let progress = $derived(totalAtStart > 0 ? ((totalAtStart - dueCards.length) / totalAtStart) * 100 : 0);
	let counterText = $derived(dueCards.length > 0 ? `${totalAtStart - dueCards.length + 1} / ${totalAtStart}` : `0 / ${totalAtStart || 0}`);

	function handleFlip() {
		isFlipped = true;
		haptic(10);
	}

	function processReview(quality: number) {
		if (!currentCard) return;
		const id = currentCard.id;
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

		const updated = calculateReview(currentCard, quality);
		cards.update((all) => all.map((c) => (c.id === id ? { ...c, ...updated } : c)));
		reviewLogs.update((logs) => [
			...logs,
			{ id: generateId(), cardId: id, quality, reviewedAt: new Date().toISOString() }
		]);
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
		if (e.key === '1') processReview(0);
		if (e.key === '2') processReview(3);
		if (e.key === '3') processReview(4);
		if (e.key === '4') processReview(5);
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
				<span class="font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground"> <strong class="text-foreground tabular-nums">{counterText}</strong></span>
				<div class="h-[3px] w-24 rounded-md bg-border overflow-hidden">
					<div class="h-full bg-[var(--accent-text)] origin-left transition-[width] duration-300" style="width: {progress}%"></div>
				</div>
			</div>
		</div>
	</div>

	<div class="pt-10">
	{#if !currentCard}
		<div class="space-y-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
			<div class="mx-auto grid size-16 place-items-center rounded-md bg-[var(--accent-soft)] border border-[color-mix(in_oklch,var(--accent-text)_20%,transparent)] text-accent">
				<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M12 5a7 7 0 1 0 0 14"/><path d="M12 5a7 7 0 0 1 7 7"/><path d="M12 19a7 7 0 0 1-7-7"/></svg>
			</div>
			<h1 class="font-display text-[34px] leading-none tracking-[-0.03em]">{m['review.done']()}</h1>
			<p class="text-sm text-muted-foreground">
				{#if totalAtStart > 0}
					{totalAtStart === 1 ? m['review.doneBody.one']({ count: 1 }) : m['review.doneBody']({ count: totalAtStart })}
				{:else}
					{m['review.nonePending']()}
				{/if}
			</p>
			<div class="flex justify-center gap-3">
				<Button href="/" size="lg">{m['review.backHome']()}</Button>
			</div>
		</div>
	{:else}
		<div class="mb-4 flex items-center justify-between">
			<span class="font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">{m['review.progress']()}</span>
			<span class="font-mono text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground">{m['review.remaining']({ count: dueCards.length })}</span>
		</div>

		<div class="perspective-[1100px] mx-auto w-full max-w-[620px]">
			<div
				class="relative h-[380px] w-full cursor-pointer rounded-lg border border-transparent transition-transform duration-[420ms] [transform-style:preserve-3d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ring)] motion-reduce:transition-none {isFlipped ? '[transform:rotateY(180deg)]' : ''} {anim === 'shake' ? 'animate-[shake_220ms_var(--ease-snappy)]' : ''} {anim === 'sink' ? 'scale-[0.98]' : ''} {anim === 'rise' ? 'animate-[riseFade_320ms_var(--ease-out)_forwards]' : ''}"
				onclick={!isFlipped ? handleFlip : undefined}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && !isFlipped && handleFlip()}
				role="button"
				tabindex="0"
				aria-label={m['review.cardAria']()}
			>
				<Card.Root
					class="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-lg border border-border bg-card [backface-visibility:hidden] border-t-[6px] border-t-[var(--accent-text)] shadow-[0_10px_30px_color-mix(in_oklch,var(--fg)_7%,transparent)]"
				>
					<div class="font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-accent mb-3">{m['review.front']()}</div>
					<div class="text-center text-[18px] font-semibold leading-[1.5]">{currentCard.front}</div>
					<div class="absolute bottom-6 text-xs text-muted-foreground">{m['review.flipHint']()}</div>
				</Card.Root>

				<Card.Root
					class="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-lg border border-border bg-[color-mix(in_oklch,var(--surface)_94%,var(--accent-soft))] [backface-visibility:hidden] [transform:rotateY(180deg)] border-t-[6px] border-t-[var(--accent-text)] shadow-[0_10px_30px_color-mix(in_oklch,var(--fg)_7%,transparent)]"
				>
					<div class="font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-3">{m['review.answer']()}</div>
					<div class="text-center text-[15px] font-medium leading-[1.6] whitespace-pre-wrap">{currentCard.back}</div>
					{#if showStamp}
						<span class="pointer-events-none absolute right-4 top-4 rounded-[8px] border-[1.5px] border-[var(--accent-text)] bg-card px-2.5 py-1 font-mono text-[10px] font-extrabold tracking-[0.16em] uppercase text-accent -rotate-3 animate-[stampFall_380ms_var(--ease-snappy)_forwards]">{m['review.stamp']()}</span>
					{/if}
				</Card.Root>
			</div>
		</div>

		{#if isFlipped}
			<div class="mt-6 grid grid-cols-4 gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
				<button onclick={() => processReview(0)} aria-label={m['review.againAria']()} class="flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-md border border-border bg-card p-3 transition-[transform,border-color,background] duration-150 hover:-translate-y-px hover:border-[var(--q-errei)] hover:bg-[color-mix(in_oklch,var(--q-errei)_8%,var(--surface))] active:scale-[0.98]">
					<strong class="text-[13px] text-[var(--q-errei)]">{m['review.again']()}</strong>
					<span class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{m['review.againHint']()}</span>
					<kbd class="mt-1 rounded-[6px] border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">1</kbd>
				</button>
				<button onclick={() => processReview(3)} aria-label={m['review.hardAria']()} class="flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-md border border-border bg-card p-3 transition-[transform,border-color,background] duration-150 hover:-translate-y-px hover:border-[var(--q-dificil)] hover:bg-[color-mix(in_oklch,var(--q-dificil)_8%,var(--surface))] active:scale-[0.98]">
					<strong class="text-[13px] text-[var(--q-dificil)]">{m['review.hard']()}</strong>
					<span class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{m['review.hardHint']()}</span>
					<kbd class="mt-1 rounded-[6px] border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">2</kbd>
				</button>
				<button onclick={() => processReview(4)} aria-label={m['review.goodAria']()} class="flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-md border border-border bg-card p-3 transition-[transform,border-color,background] duration-150 hover:-translate-y-px hover:border-[var(--q-bom)] hover:bg-[color-mix(in_oklch,var(--q-bom)_8%,var(--surface))] active:scale-[0.98]">
					<strong class="text-[13px] text-[var(--q-bom)]">{m['review.good']()}</strong>
					<span class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{m['review.goodHint']()}</span>
					<kbd class="mt-1 rounded-[6px] border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">3</kbd>
				</button>
				<button onclick={() => processReview(5)} aria-label={m['review.easyAria']()} class="flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-md border border-border bg-card p-3 transition-[transform,border-color,background] duration-150 hover:-translate-y-px hover:border-[var(--q-facil)] hover:bg-[color-mix(in_oklch,var(--q-facil)_8%,var(--surface))] active:scale-[0.98]">
					<strong class="text-[13px] text-[var(--q-facil)]">{m['review.easy']()}</strong>
					<span class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{m['review.easyHint']()}</span>
					<kbd class="mt-1 rounded-[6px] border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">4</kbd>
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
