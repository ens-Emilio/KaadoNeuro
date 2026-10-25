<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { NotebookPen } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';
</script>

<DialogPrimitive.Trigger
	class="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-[13px] font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
>
	<NotebookPen class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
	{m['aiGen.trigger']()}
</DialogPrimitive.Trigger>