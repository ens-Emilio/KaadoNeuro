<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Component } from 'svelte';
	import AIGenerateTrigger from './ai-generate-trigger.svelte';

	let {
		deckId,
		deckName,
		onApplied
	}: {
		deckId?: string;
		deckName?: string;
		onApplied?: () => void;
	} = $props();

	// The dialog pulls in Zod and Markdown; keep those out of the initial bundle
	// until the user actually asks to generate cards.
	let Dialog = $state<Component<{
		deckId?: string;
		deckName?: string;
		onApplied?: () => void;
		startOpen?: boolean;
	}> | null>(null);
	let loading = $state(false);
	let destroyed = false;

	onDestroy(() => {
		destroyed = true;
	});

	async function openDialog() {
		if (Dialog || loading) return;
		loading = true;
		const module = await import('./ai-generate-dialog.svelte');
		if (destroyed) return;
		Dialog = module.default;
		loading = false;
	}
</script>

<AIGenerateTrigger onclick={openDialog} aria-busy={loading} />
{#if Dialog}
	<Dialog {deckId} {deckName} {onApplied} />
{/if}
