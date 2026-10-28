<script lang="ts">
	import { NotebookPen } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		onclick,
		...rest
	}: {
		onclick: () => void;
		[key: string]: unknown;
	} = $props();
</script>

<button
	type="button"
	{onclick}
	class="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-[13px] font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
	{...rest}
>
	<NotebookPen class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
	{m['aiGen.trigger']()}
</button>
