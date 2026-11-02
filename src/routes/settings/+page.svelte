<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, Type, Database, Vibrate } from '@lucide/svelte';
	import {
		fontSize,
		increaseFontSize,
		decreaseFontSize,
		type FontSizeLevel
	} from '$lib/font-size-store.js';
	import { autoBackupSettings } from '$lib/auto-backup-store.js';
	import { hapticsEnabled } from '$lib/haptics.js';
	import * as m from '$lib/paraglide/messages.js';
	import { loadPluginSources, savePluginSources } from '$lib/plugin-loader.js';

	let pluginSourcesText = '';
	if (typeof window !== 'undefined') {
		pluginSourcesText = loadPluginSources().join('\n');
	}

	function handlePluginSourcesChange(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		pluginSourcesText = target.value;
		const sources = pluginSourcesText
			.split('\n')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		savePluginSources(sources);
	}
</script>

<svelte:head><title>{m['settings.title']()}</title></svelte:head>

<div class="container mx-auto max-w-2xl space-y-6 px-6 py-10">
	<div class="mb-8 flex items-center gap-3">
		<Button variant="ghost" size="icon" href="/" aria-label={m['deck.back']()}>
			<ArrowLeft class="size-[18px] [stroke-width:1.75]" />
		</Button>
		<h1 class="font-display text-[28px] font-normal tracking-[-0.02em]">{m['settings.title']()}</h1>
	</div>

	<Card.Root class="rounded-lg">
		<Card.Header>
			<Card.Title class="flex items-center gap-2 text-sm">
				<Type class="size-[18px] [stroke-width:1.75] text-accent" />
				{m['settings.fontSize']()}
			</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<p class="text-sm text-muted-foreground">{m['settings.fontSizeDesc']()}</p>

			<div class="flex items-center gap-4">
				<Button
					variant="outline"
					size="icon"
					onclick={decreaseFontSize}
					aria-label={m['settings.fontSizeDecrease']()}
				>
					<span class="font-mono text-sm">A-</span>
				</Button>

				<div class="num flex-1 text-center font-mono text-lg">
					{$fontSize}%
				</div>

				<Button
					variant="outline"
					size="icon"
					onclick={increaseFontSize}
					aria-label={m['settings.fontSizeIncrease']()}
				>
					<span class="font-mono text-sm">A+</span>
				</Button>
			</div>

			<div class="grid grid-cols-8 gap-1">
				{#each [80, 90, 100, 110, 120, 130, 140, 150] as level}
					<button
						type="button"
						class="rounded border px-2 py-1 font-mono text-xs transition-colors {$fontSize === level
							? 'border-accent bg-accent/10 text-accent'
							: 'border-border bg-card text-muted-foreground hover:bg-secondary'}"
						onclick={() => fontSize.set(level as FontSizeLevel)}
					>
						{level}%
					</button>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="rounded-lg">
		<Card.Header>
			<Card.Title class="flex items-center gap-2 text-sm">
				<Database class="size-[18px] [stroke-width:1.75] text-accent" />
				{m['settings.autoBackup']()}
			</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<p class="text-sm text-muted-foreground">{m['settings.autoBackupDesc']()}</p>

			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					class="size-4 rounded border-border accent-accent"
					checked={$autoBackupSettings.enabled}
					onchange={(e) =>
						autoBackupSettings.update((s) => ({
							...s,
							enabled: (e.target as HTMLInputElement).checked
						}))}
				/>
				<span class="text-sm font-medium">{m['settings.autoBackupEnable']()}</span>
			</label>

			<div class="flex items-center gap-3">
				<label class="text-sm text-muted-foreground" for="backup-interval"
					>{m['settings.backupInterval']()}</label
				>
				<input
					id="backup-interval"
					type="number"
					min="1"
					max="365"
					value={$autoBackupSettings.intervalDays}
					oninput={(e) => {
						const v = parseInt((e.target as HTMLInputElement).value, 10);
						if (v > 0) autoBackupSettings.update((s) => ({ ...s, intervalDays: v }));
					}}
					class="w-20 rounded border border-border bg-card px-2 py-1 text-sm"
				/>
			</div>

			{#if $autoBackupSettings.lastBackupAt}
				<p class="font-mono text-xs text-muted-foreground">
					{m['settings.lastBackup']({
						date: new Date($autoBackupSettings.lastBackupAt).toLocaleDateString()
					})}
				</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root class="rounded-lg">
		<Card.Header>
			<Card.Title class="flex items-center gap-2 text-sm">
				<Vibrate class="size-[18px] [stroke-width:1.75] text-accent" />
				{m['settings.haptics']()}
			</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<p class="text-sm text-muted-foreground">{m['settings.hapticsDesc']()}</p>
			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					class="size-4 rounded border-border accent-accent"
					checked={$hapticsEnabled}
					onchange={(e) => hapticsEnabled.set((e.target as HTMLInputElement).checked)}
				/>
				<span class="text-sm font-medium">{m['settings.hapticsEnable']()}</span>
			</label>
		</Card.Content>
	</Card.Root>

	<Card.Root class="rounded-lg">
		<Card.Header>
			<Card.Title class="flex items-center gap-2 text-sm">
				<Database class="size-[18px] [stroke-width:1.75] text-accent" />
				{m['settings.plugins']()}
			</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<p class="text-sm text-muted-foreground">{m['settings.pluginsDesc']()}</p>
			<textarea
				class="w-full rounded-md border border-border bg-background p-3 font-mono text-xs"
				rows="5"
				value={pluginSourcesText}
				oninput={handlePluginSourcesChange}
				placeholder="https://example.com/plugin.js&#10;export default {{ name: 'my-plugin' }};"
			></textarea>
			<p class="text-[10px] text-muted-foreground italic">
				{m['settings.pluginsHint']()}
			</p>
		</Card.Content>
	</Card.Root>

	<div class="flex justify-center pt-2">
		<Button size="lg" href="/">{m['badges.backHome']()}</Button>
	</div>
</div>
