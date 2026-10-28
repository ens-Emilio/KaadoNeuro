<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import katex from 'katex';
	import 'katex/dist/katex.min.css';

	let { content = '' }: { content?: string } = $props();

	marked.setOptions({
		breaks: true,
		gfm: true
	});

	function renderLatex(src: string): string {
		// Block math: $$...$$
		let out = src.replace(/\$\$([\s\S]+?)\$\$/g, (_match, tex) => {
			try {
				return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
			} catch {
				return `<code class="text-[var(--q-errei)]">${tex}</code>`;
			}
		});
		// Inline math: $...$  (not preceded/followed by $, not empty)
		out = out.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_match, tex) => {
			try {
				return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
			} catch {
				return `<code class="text-[var(--q-errei)]">${tex}</code>`;
			}
		});
		return out;
	}

	let html = $derived(
		content
			? DOMPurify.sanitize(marked.parse(renderLatex(content)) as string, {
					ALLOWED_TAGS: [
						'h1',
						'h2',
						'h3',
						'h4',
						'h5',
						'h6',
						'p',
						'br',
						'hr',
						'ul',
						'ol',
						'li',
						'strong',
						'em',
						'del',
						'code',
						'pre',
						'a',
						'blockquote',
						'table',
						'thead',
						'tbody',
						'tr',
						'th',
						'td',
						'span',
						'div',
						'math',
						'mrow',
						'mi',
						'mo',
						'mn',
						'msup',
						'msub',
						'mfrac',
						'mroot',
						'msqrt',
						'mtable',
						'mtr',
						'mtd',
						'mtext',
						'mspace',
						'mover',
						'munder',
						'munderover',
						'mmultiscripts',
						'mprescripts',
						'none',
						'semantics',
						'annotation'
					],
					ALLOWED_ATTR: [
						'href',
						'target',
						'rel',
						'class',
						'style',
						'xmlns',
						'encoding',
						'mathvariant',
						'displaystyle',
						'scriptlevel',
						'columnalign',
						'rowalign',
						'columnspacing',
						'rowspacing',
						'fence',
						'stretchy',
						'symmetric',
						'lspace',
						'rspace',
						'accent',
						'accentunder',
						'separator',
						'form',
						'largeop',
						'movablelimits',
						'notation'
					]
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
