<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import MarkdownRenderer from '$lib/components/markdown-renderer.svelte';
	import { haptic } from '$lib/haptics.js';
	import { Volume2 } from '@lucide/svelte';
	import type { Flashcard } from '$lib/types.js';
	import * as m from '$lib/paraglide/messages.js';

	let {
		card,
		flipped,
		onFlip,
		onReview
	}: {
		card: Flashcard;
		flipped: boolean;
		onFlip: () => void;
		onReview: (quality: number) => void;
	} = $props();

	let cardControl = $state<HTMLButtonElement | null>(null);
	let ratingGroup = $state<HTMLDivElement | null>(null);
	let anim = $state<'' | 'shake' | 'sink' | 'rise'>('');
	let showStamp = $state(false);
	let previous = untrack(() => flipped);
	let clozeAnswer = $state('');
	let clozeRevealed = $state(false);

	// Reset cloze state when the card changes.
	$effect(() => {
		void card;
		clozeAnswer = '';
		clozeRevealed = false;
	});

	// Focus moves with the state so keyboard and screen-reader users are not stranded:
	// flipping reveals the rating buttons, rating returns focus to the next card.
	$effect(() => {
		const nowFlipped = flipped;
		if (nowFlipped === previous) return;
		previous = nowFlipped;
		void tick().then(() => {
			if (nowFlipped) ratingGroup?.querySelector('button')?.focus();
			else cardControl?.focus();
		});
	});
	function checkCloze() {
		if (!card.cloze) return;
		clozeRevealed = true;
	}

	function handleFlip() {
		if (card.cloze && !clozeRevealed) {
			checkCloze();
		} else {
			onFlip();
		}
	}

	function review(quality: number) {
		if (quality === 0) {
			anim = 'shake';
			haptic([10, 30, 10]);
			setTimeout(() => (anim = ''), 260);
		} else if (quality === 3) {
			anim = 'sink';
			haptic(10);
			setTimeout(() => (anim = ''), 220);
		} else {
			anim = 'rise';
			showStamp = true;
			haptic(quality === 5 ? 18 : 10);
			setTimeout(() => (showStamp = false), 700);
			setTimeout(() => (anim = ''), 320);
		}
		onReview(quality);
	}
	/** Speech synthesis reads punctuation literally, so strip the markup that is only visual. */
	function speak(text: string) {
		if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
		const plain = text
			.replace(/\$\$?([^$]+)\$\$?/g, '$1')
			.replace(/\{\{(.+?)\}\}/g, '$1')
			.replace(/[*_`#>]/g, '')
			.trim();
		if (!plain) return;
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(plain);
		utterance.lang = document.documentElement.lang || 'en';
		window.speechSynthesis.speak(utterance);
	}
</script>

<div class="relative mx-auto w-full max-w-[620px] perspective-[1100px]">
	<button
		bind:this={cardControl}
		type="button"
		disabled={flipped}
		class="relative h-[380px] w-full rounded-lg border border-transparent transition-transform duration-[420ms] [transform-style:preserve-3d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ring)] disabled:cursor-default motion-reduce:transition-none {flipped
			? '[transform:rotateY(180deg)]'
			: ''} {anim === 'shake' ? 'animate-[shake_220ms_var(--ease-snappy)]' : ''} {anim === 'sink'
			? 'scale-[0.98]'
			: ''} {anim === 'rise' ? 'animate-[riseFade_320ms_var(--ease-out)_forwards]' : ''}"
		onclick={handleFlip}
		aria-label={m['review.cardAria']()}
	>
		<Card.Root
			aria-hidden={flipped}
			class="absolute inset-0 flex flex-col items-center justify-center overflow-auto rounded-lg border border-t-[6px] border-border border-t-[var(--accent-text)] bg-card p-8 [backface-visibility:hidden] {flipped
				? 'invisible'
				: 'visible'} shadow-[0_10px_30px_color-mix(in_oklch,var(--fg)_7%,transparent)]"
		>
			<div class="mb-3 font-mono text-[10px] font-bold text-accent uppercase">
				{m['review.front']()}
			</div>
			<div class="text-center text-[18px] leading-[1.5] font-semibold">
				<MarkdownRenderer content={card.front} />
			</div>
			<div class="absolute bottom-6 text-xs text-muted-foreground">{m['review.flipHint']()}</div>
		</Card.Root>

		<Card.Root
			aria-hidden={!flipped}
			class="absolute inset-0 flex [transform:rotateY(180deg)] flex-col items-center justify-center overflow-auto rounded-lg border border-t-[6px] border-border border-t-[var(--accent-text)] bg-[color-mix(in_oklch,var(--surface)_94%,var(--accent-soft))] p-8 [backface-visibility:hidden] {flipped
				? 'visible'
				: 'invisible'} shadow-[0_10px_30px_color-mix(in_oklch,var(--fg)_7%,transparent)]"
		>
			<div class="mb-3 font-mono text-[10px] font-bold text-muted-foreground uppercase">
				{m['review.answer']()}
			</div>
			{#if card.cloze}
				<div class="w-full max-w-xs space-y-3">
					{#if !clozeRevealed}
						<input
							type="text"
							bind:value={clozeAnswer}
							class="w-full rounded-md border border-border bg-background px-3 py-2 text-center text-[15px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
							placeholder={m['review.clozePlaceholder']()}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									checkCloze();
								}
							}}
							autocomplete="off"
							spellcheck="false"
						/>
						<Button size="sm" class="w-full" onclick={checkCloze}
							>{m['review.checkAnswer']()}</Button
						>
					{:else}
						<div class="text-center text-[15px] leading-[1.6] font-medium">
							<MarkdownRenderer content={card.back} />
						</div>
						<p
							class="text-center text-xs {clozeAnswer.trim().toLowerCase() ===
							card.cloze.trim().toLowerCase()
								? 'text-[var(--q-facil)]'
								: 'text-[var(--q-errei)]'}"
						>
							{clozeAnswer.trim().toLowerCase() === card.cloze.trim().toLowerCase()
								? m['review.clozeCorrect']()
								: m['review.clozeIncorrect']({ expected: card.cloze })}
						</p>
					{/if}
				</div>
			{:else}
				<div class="text-center text-[15px] leading-[1.6] font-medium">
					<MarkdownRenderer content={card.back} />
				</div>
			{/if}
			{#if showStamp}
				<span
					class="pointer-events-none absolute top-4 right-4 -rotate-3 animate-[stampFall_380ms_var(--ease-snappy)_forwards] rounded-md border border-[var(--accent-text)] bg-card px-2.5 py-1 font-mono text-[10px] font-bold text-accent"
					>{m['review.stamp']()}</span
				>
			{/if}
		</Card.Root>
	</button>

	<!-- The card itself is a disabled button once flipped, so speech controls stay outside it. -->
	{#if !flipped}
		<button
			type="button"
			class="absolute top-3 right-3 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
			onclick={() => speak(card.front)}
			aria-label={m['review.listen']()}
		>
			<Volume2 class="size-4 [stroke-width:1.75]" aria-hidden="true" />
		</button>
	{:else}
		<button
			type="button"
			class="absolute top-3 right-3 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
			onclick={() => speak(card.back)}
			aria-label={m['review.listen']()}
		>
			<Volume2 class="size-4 [stroke-width:1.75]" aria-hidden="true" />
		</button>
	{/if}
</div>

{#if flipped}
	<div bind:this={ratingGroup} class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
		{#each [{ q: 0, label: m['review.again'](), hint: m['review.againHint'](), aria: m['review.againAria'](), token: '--q-errei', key: '1' }, { q: 3, label: m['review.hard'](), hint: m['review.hardHint'](), aria: m['review.hardAria'](), token: '--q-dificil', key: '2' }, { q: 4, label: m['review.good'](), hint: m['review.goodHint'](), aria: m['review.goodAria'](), token: '--q-bom', key: '3' }, { q: 5, label: m['review.easy'](), hint: m['review.easyHint'](), aria: m['review.easyAria'](), token: '--q-facil', key: '4' }] as rating (rating.q)}
			<button
				type="button"
				onclick={() => review(rating.q)}
				aria-label={rating.aria}
				style="--rating-color: var({rating.token})"
				class="rating-btn flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-md border bg-card p-3 transition-colors"
			>
				<strong class="text-[13px]">{rating.label}</strong>
				<span class="font-mono text-[10px] text-muted-foreground">{rating.hint}</span>
				<kbd
					class="mt-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
					>{rating.key}</kbd
				>
			</button>
		{/each}
	</div>
	<p class="mt-3 text-center font-mono text-[10px] text-muted-foreground uppercase">
		{m['review.shortcuts']()}
	</p>
{:else}
	<div class="mt-6 flex justify-center">
		<Button size="lg" class="w-full max-w-xs" onclick={onFlip}>{m['review.show']()}</Button>
	</div>
{/if}
