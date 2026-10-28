<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(
		'flex flex-col gap-6 rounded-lg border bg-card py-6 text-card-foreground shadow-[0_2px_12px_-4px_rgba(24,24,27,0.05)]',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
