<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { aiConfig, normalizeAIConfig } from '$lib/ai/store.js';
	import { AI_PROVIDER_PRESETS, type AIProvider } from '$lib/ai/types.js';
	import { testAIConnection, listModels } from '$lib/ai/client.js';
	import { CircuitBoard, Cable, ListChecks } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	let provider: AIProvider = $state($aiConfig?.provider ?? 'anthropic');
	let model = $state($aiConfig?.model ?? '');
	let apiKey = $state($aiConfig?.apiKey ?? '');
	let baseUrl = $state($aiConfig?.baseUrl ?? '');
	let status = $state<'idle' | 'testing' | 'success' | 'error'>('idle');
	let message = $state('');
	let models = $state<string[]>([]);
	let modelsStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let modelsMessage = $state('');

	const preset = $derived(AI_PROVIDER_PRESETS.find((p) => p.id === provider)!);

	$effect(() => {
		if (!model && !$aiConfig) model = preset.defaultModel;
	});

	async function testConnection() {
		const config = normalizeAIConfig({ provider, model, apiKey, baseUrl });
		if (!config) {
			status = 'error';
			message = m['ai.required']();
			return;
		}
		status = 'testing';
		message = 'Testando conexão...';
		try {
			const data = await testAIConnection(config);
			status = 'success';
			message = m['ai.connected']({ model: data.model });
		} catch (error) {
			status = 'error';
			message = error instanceof Error ? error.message : m['error.provider']();
		}
	}

	async function checkModels() {
		const config = normalizeAIConfig({ provider, model, apiKey, baseUrl });
		if (!config) {
			modelsStatus = 'error';
			modelsMessage = m['ai.required']();
			return;
		}
		modelsStatus = 'loading';
		modelsMessage = m['ai.modelsChecking']();
		try {
			const found = await listModels(config);
			models = found;
			modelsStatus = 'success';
			modelsMessage = m['ai.modelsFound']({ count: found.length });
		} catch (error) {
			models = [];
			modelsStatus = 'error';
			modelsMessage = error instanceof Error ? error.message : m['error.models']();
		}
	}

	function saveConfig() {
		const config = normalizeAIConfig({ provider, model, apiKey, baseUrl });
		if (!config) {
			status = 'error';
			message = m['ai.required']();
			return;
		}
		aiConfig.set({ ...config, updatedAt: new Date().toISOString() });
		status = 'success';
		message = m['ai.saved']();
	}

	function clearConfig() {
		aiConfig.set(null);
		provider = 'anthropic';
		model = '';
		apiKey = '';
		baseUrl = '';
		status = 'idle';
		message = m['ai.removed']();
	}
</script>

<svelte:head>
	<title>{m['ai.pageTitle']()}</title>
</svelte:head>

<div class="container mx-auto max-w-2xl space-y-6 px-6 py-10">
	<div class="flex items-center gap-3">
		<span class="grid size-10 place-items-center rounded-md bg-[var(--accent-solid)] text-primary-foreground">
			<CircuitBoard class="size-5" aria-hidden="true" />
		</span>
		<div>
			<h1 class="font-display text-3xl font-normal tracking-[-0.02em]"> {m['ai.title']()}</h1>
			<p class="text-sm text-muted-foreground"> {m['ai.subtitle']()}</p>
		</div>
	</div>

	<Card.Root>
		<Card.Content class="space-y-5 pt-6">
			<div class="space-y-1.5">
				<Label for="provider">{m['ai.provider']()}</Label>
				<select
					id="provider"
					class="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
					bind:value={provider}
					onchange={() => { model = preset.defaultModel; baseUrl = preset.requiresBaseUrl ? baseUrl : ''; }}
				>
					{#each AI_PROVIDER_PRESETS as presetOption}
						<option value={presetOption.id}>{presetOption.label}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-1.5">
				<Label for="model">{m['ai.model']()}</Label>
				<Input id="model" bind:value={model} placeholder={preset.defaultModel} />
			</div>

			<div class="space-y-1.5">
				<Label for="apiKey">{m['ai.apiKey']()}</Label>
				<Input id="apiKey" type="password" bind:value={apiKey} placeholder="sk-..." autocomplete="off" />
			</div>

			{#if preset.requiresBaseUrl || baseUrl}
				<div class="space-y-1.5">
					<Label for="baseUrl">{m['ai.baseUrl']()}</Label>
					<Input id="baseUrl" bind:value={baseUrl} placeholder="https://api.seu-provedor.com/v1" />
					<p class="font-mono text-xs text-muted-foreground"> {m['ai.baseUrlHint']()}</p>
				</div>
			{/if}

			<div class="flex flex-wrap items-center gap-2.5 pt-2">
				<Button onclick={checkModels} variant="outline" disabled={modelsStatus === 'loading'}>
					<ListChecks class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
					{modelsStatus === 'loading' ? m['ai.modelsChecking']() : m['ai.modelsCheck']()}
				</Button>
				<Button onclick={testConnection} variant="secondary" disabled={status === 'testing'}>
					<Cable class="size-[18px] [stroke-width:1.75]" aria-hidden="true" />
					{status === 'testing' ? m['ai.testing']() : m['ai.test']()}
				</Button>
				<Button onclick={saveConfig}> {m['ai.save']()}</Button>
				{#if $aiConfig}
					<Button variant="ghost" onclick={clearConfig}> {m['ai.remove']()}</Button>
				{/if}
			</div>

			{#if modelsMessage}
				<div class="space-y-2" role="status" aria-live="polite">
					<p class="rounded-md border px-3 py-2 text-xs {modelsStatus === 'error' ? 'border-[var(--q-errei)]/40 text-[var(--q-errei)]' : modelsStatus === 'success' ? 'border-[var(--q-bom)]/40 text-[var(--q-bom)]' : 'border-border text-muted-foreground'}">{modelsMessage}</p>
					{#if models.length}
						<label class="block text-xs font-medium" for="model-list">{m['ai.modelsChoose']()}</label>
						<select id="model-list" class="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm" onchange={(e) => (model = (e.target as HTMLSelectElement).value)}>
							{#each models as item}
								<option value={item} selected={item === model}>{item}</option>
							{/each}
						</select>
					{/if}
				</div>
			{/if}
			{#if message}
				<p class="rounded-md border px-3 py-2 text-xs {status === 'error' ? 'border-[var(--q-errei)]/40 bg-[color-mix(in_oklch,var(--q-errei)_8%,transparent)] text-[var(--q-errei)]' : status === 'success' ? 'border-[var(--q-bom)]/40 bg-[color-mix(in_oklch,var(--q-bom)_8%,transparent)] text-[var(--q-bom)]' : 'border-border text-muted-foreground'}" role="status" aria-live="polite">
					{message}
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
