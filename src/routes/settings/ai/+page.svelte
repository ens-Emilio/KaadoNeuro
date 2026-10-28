<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { aiConfig, needsSecretMigration, saveAIConfig } from '$lib/ai/store.js';
	import { vaultState } from '$lib/secret-vault.js';
	import VaultGate from '$lib/components/vault-gate.svelte';
	import { AI_PROVIDER_PRESETS, type AIProvider } from '$lib/ai/types.js';
	import { testAIConnection, listModels } from '$lib/ai/client.js';
	import { CircuitBoard, Cable, ListChecks } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	let provider: AIProvider = $state($aiConfig?.provider ?? 'anthropic');
	let model = $state($aiConfig?.model ?? '');
	let apiKey = $state('');
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

	$effect(() => {
		const stored = $aiConfig;
		if (!stored) return;
		provider = stored.provider;
		model = stored.model;
		baseUrl = stored.baseUrl ?? '';
	});

	function formConfig() {
		if (!apiKey.trim()) return null;
		return {
			provider,
			model: model.trim(),
			apiKey: apiKey.trim(),
			baseUrl: baseUrl.trim() || undefined
		};
	}

	async function testConnection() {
		const config = formConfig();
		if (!config) return;
		status = 'testing';
		message = m['ai.testing']();
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
		const config = formConfig();
		if (!config) return;
		modelsStatus = 'loading';
		modelsMessage = m['ai.modelsChecking']();
		try {
			models = await listModels(config);
			modelsStatus = 'success';
			modelsMessage = m['ai.modelsFound']({ count: models.length });
		} catch (error) {
			modelsStatus = 'error';
			modelsMessage = error instanceof Error ? error.message : m['error.models']();
		}
	}

	async function saveConfig() {
		const config = formConfig();
		if (!config) {
			status = 'error';
			message = m['ai.required']();
			return;
		}
		try {
			await saveAIConfig(config);
			apiKey = '';
			status = 'success';
			message = m['ai.saved']();
		} catch (error) {
			status = 'error';
			message = error instanceof Error ? error.message : m['error.provider']();
		}
	}

	function clearConfig() {
		aiConfig.set(null);
		apiKey = '';
		status = 'success';
		message = m['ai.removed']();
	}
</script>

<svelte:head>
	<title>{m['ai.pageTitle']()}</title>
</svelte:head>

<div class="container mx-auto max-w-2xl space-y-6 px-6 py-10">
	<div class="flex items-center gap-3">
		<span
			class="grid size-10 place-items-center rounded-md bg-[var(--accent-solid)] text-primary-foreground"
			><CircuitBoard class="size-5" aria-hidden="true" /></span
		>
		<div>
			<h1 class="font-display text-3xl font-normal tracking-[-0.02em]">{m['ai.title']()}</h1>
			<p class="text-sm text-muted-foreground">{m['ai.subtitle']()}</p>
		</div>
	</div>
	<VaultGate />
	{#if needsSecretMigration($aiConfig)}
		<p
			class="rounded-md border border-[var(--q-dificil)]/30 bg-[color-mix(in_oklch,var(--q-dificil)_8%,transparent)] px-3 py-2 text-xs"
		>
			{m['vault.legacyKey']()}
		</p>
	{/if}
	<Card.Root
		><Card.Content class="space-y-5 pt-6">
			<div class="space-y-1.5">
				<Label for="provider">{m['ai.provider']()}</Label>
				<select
					id="provider"
					class="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
					bind:value={provider}
					onchange={() => {
						model = preset.defaultModel;
						baseUrl = preset.requiresBaseUrl ? baseUrl : '';
					}}
				>
					{#each AI_PROVIDER_PRESETS as presetOption (presetOption.id)}<option
							value={presetOption.id}>{presetOption.label}</option
						>{/each}
				</select>
			</div>
			<div class="space-y-1.5">
				<Label for="model">{m['ai.model']()}</Label><Input
					id="model"
					bind:value={model}
					placeholder={preset.defaultModel}
				/>
			</div>
			<div class="space-y-1.5">
				<Label for="apiKey">{m['ai.apiKey']()}</Label><Input
					id="apiKey"
					type="password"
					bind:value={apiKey}
					placeholder="sk-..."
					autocomplete="off"
				/>
				<p class="text-xs text-muted-foreground">{m['vault.secretNotPrefilled']()}</p>
			</div>
			{#if preset.requiresBaseUrl || baseUrl}<div class="space-y-1.5">
					<Label for="baseUrl">{m['ai.baseUrl']()}</Label><Input
						id="baseUrl"
						bind:value={baseUrl}
						placeholder="https://api.seu-provedor.com/v1"
					/>
				</div>{/if}
			<div class="flex flex-wrap items-center gap-2.5 pt-2">
				<Button
					onclick={checkModels}
					variant="outline"
					disabled={modelsStatus === 'loading' || $vaultState.status !== 'unlocked'}
					><ListChecks class="size-[18px]" aria-hidden="true" />{modelsStatus === 'loading'
						? m['ai.modelsChecking']()
						: m['ai.modelsCheck']()}</Button
				>
				<Button
					onclick={testConnection}
					variant="secondary"
					disabled={status === 'testing' || $vaultState.status !== 'unlocked'}
					><Cable class="size-[18px]" aria-hidden="true" />{status === 'testing'
						? m['ai.testing']()
						: m['ai.test']()}</Button
				>
				<Button onclick={saveConfig} disabled={$vaultState.status !== 'unlocked'}
					>{m['ai.save']()}</Button
				>
				{#if $aiConfig}<Button variant="ghost" onclick={clearConfig}>{m['ai.remove']()}</Button
					>{/if}
			</div>
			{#if modelsMessage}<div role="status" aria-live="polite" class="space-y-2">
					<p class="text-xs">{modelsMessage}</p>
					{#if models.length}<select
							class="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
							onchange={(e) => (model = (e.target as HTMLSelectElement).value)}
							>{#each models as item (item)}<option value={item}>{item}</option>{/each}</select
						>{/if}
				</div>{/if}
			{#if message}<p role="status" aria-live="polite" class="text-xs">{message}</p>{/if}
		</Card.Content></Card.Root
	>
</div>
