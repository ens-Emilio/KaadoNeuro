<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		children,
		...restProps
	}: DialogPrimitive.TriggerProps & { children?: Snippet } = $props();
</script>

<DialogPrimitive.Trigger bind:ref data-slot="dialog-trigger" {...restProps}>
	{@render children?.()}
</DialogPrimitive.Trigger>
