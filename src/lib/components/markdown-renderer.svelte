<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	let { content = '' }: { content?: string } = $props();

	marked.setOptions({
		breaks: true,
		gfm: true
	});

	let html = $derived(
		content
			? DOMPurify.sanitize(marked.parse(content) as string, {
					ALLOWED_TAGS: [
						'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
						'p', 'br', 'hr',
						'ul', 'ol', 'li',
						'strong', 'em', 'del', 'code', 'pre',
						'a', 'blockquote',
						'table', 'thead', 'tbody', 'tr', 'th', 'td'
					],
					ALLOWED_ATTR: ['href', 'target', 'rel']
				})
			: ''
	);
</script>

{#if html}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="prose prose-sm dark:prose-invert max-w-none" ondblclick={(e) => e.stopPropagation()}>
		{@html html}
	</div>
{:else}
	<span class="text-muted-foreground italic">—</span>
{/if}