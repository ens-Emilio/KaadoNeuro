<script>
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, BookOpen, Upload, Brain, FileText } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';
</script>

<div class="container mx-auto max-w-3xl px-5 sm:px-6 py-8 pb-20">
	<div class="mb-8 flex items-center gap-3">
		<Button variant="ghost" size="icon" href="/" aria-label={m['deck.back']()}>
			<ArrowLeft class="size-[18px] [stroke-width:1.75]" />
		</Button>
		<h1 class="font-display text-[28px] font-normal tracking-[-0.02em]">{m['tutorial.title']()}</h1>
	</div>

	<div class="space-y-5">
		<p class="text-sm leading-relaxed text-muted-foreground">
			{m['tutorial.intro']()}
		</p>

		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-sm">
					<BookOpen class="size-[18px] text-accent [stroke-width:1.75]" />
					{m['tutorial.step1']()}
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-2 text-sm text-muted-foreground">
				<p>{m['tutorial.step1a']()}</p>
				<p>{m['tutorial.step1b']()}</p>
			</Card.Content>
		</Card.Root>

		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-sm">
					<Upload class="size-[18px] text-accent [stroke-width:1.75]" />
					{m['tutorial.step2']()}
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<p class="text-sm text-muted-foreground">{m['tutorial.step2Body']()}</p>
				<div class="grid gap-3 md:grid-cols-2">
					<div class="rounded-md border bg-secondary/40 p-4">
						<h4 class="mb-2 flex items-center gap-2 text-sm font-semibold">
							<FileText class="size-[18px] [stroke-width:1.75]" /> {m['tutorial.viaText']()}
						</h4>
						<p class="mb-2 font-mono text-xs text-muted-foreground">{m['tutorial.viaTextHint']()}</p>
						<pre class="rounded-md border bg-card p-2.5 font-mono text-xs text-muted-foreground">{m['tutorial.viaTextExample']()}</pre>
					</div>
					<div class="rounded-md border bg-secondary/40 p-4">
						<h4 class="mb-2 text-sm font-semibold">{m['tutorial.viaFile']()}</h4>
						<p class="font-mono text-xs text-muted-foreground">{m['tutorial.viaFileHint']()}</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-sm">
					<Brain class="size-[18px] text-accent [stroke-width:1.75]" />
					{m['tutorial.step3']()}
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-2 text-sm text-muted-foreground">
				<p>{m['tutorial.step3Body']()}</p>
				<ul class="list-disc space-y-1 ps-5">
					<li><strong class="text-foreground">{m['tutorial.again']()}</strong> {m['tutorial.againDesc']()}</li>
					<li><strong class="text-foreground">{m['tutorial.hard']()}</strong> {m['tutorial.hardDesc']()}</li>
					<li><strong class="text-foreground">{m['tutorial.good']()}</strong> {m['tutorial.goodDesc']()}</li>
					<li><strong class="text-foreground">{m['tutorial.easy']()}</strong> {m['tutorial.easyDesc']()}</li>
				</ul>
				<p class="font-mono text-xs">{m['tutorial.shortcuts']()}</p>
			</Card.Content>
		</Card.Root>

		<div class="flex justify-center pt-2">
			<Button size="lg" href="/">{m['tutorial.start']()}</Button>
		</div>
	</div>
</div>
