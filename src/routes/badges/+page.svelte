<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, Trophy, Lock } from '@lucide/svelte';
	import { gamification, BADGE_CATALOG } from '$lib/gamification-store.js';
	import * as m from '$lib/paraglide/messages.js';

	type MessageFn = () => string;
	function t(key: string): MessageFn {
		return (m as Record<string, unknown>)[key] as MessageFn;
	}
</script>

<svelte:head><title>{m['badges.title']()}</title></svelte:head>

<div class="container mx-auto max-w-5xl space-y-6 px-6 py-10">
	<div class="mb-8 flex items-center gap-3">
		<Button variant="ghost" size="icon" href="/" aria-label="Voltar">
			<ArrowLeft class="size-[18px] [stroke-width:1.75]" />
		</Button>
		<h1 class="font-display text-[28px] font-normal tracking-[-0.02em]">{m['badges.title']()}</h1>
	</div>

	<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
		{#each BADGE_CATALOG as badge}
			{@const unlockedAt = $gamification.unlockedBadges[badge.id]}
			<Card.Root class="rounded-lg transition-opacity {!unlockedAt ? 'opacity-50' : ''}">
				<Card.Content class="flex items-start gap-4 p-4">
					<div
						class="flex size-12 shrink-0 items-center justify-center rounded-full text-2xl"
						class:bg-accent={!!unlockedAt}
						class:bg-muted={!unlockedAt}
					>
						{#if unlockedAt}
							{badge.icon}
						{:else}
							<Lock class="size-5 text-muted-foreground" />
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<h3 class="leading-tight font-medium">{t(badge.nameKey)()}</h3>
						<p class="mt-1 text-xs text-muted-foreground">{t(badge.descKey)()}</p>
						{#if unlockedAt}
							<p class="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-accent">
								<Trophy class="size-3" />
								{new Date(unlockedAt as string).toLocaleDateString()}
							</p>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<div class="flex justify-center pt-2">
		<Button size="lg" href="/">{m['badges.backHome']()}</Button>
	</div>
</div>
