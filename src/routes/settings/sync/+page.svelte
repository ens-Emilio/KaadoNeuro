<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import {
		webdavConfig,
		isConfigured,
		needsPasswordMigration,
		saveWebDavSecret,
		withWebDavPassword
	} from '$lib/sync-store.js';
	import { vaultState } from '$lib/secret-vault.js';
	import VaultGate from '$lib/components/vault-gate.svelte';
	import { testConnection, uploadSnapshot, downloadSnapshot } from '$lib/sync-webdav.js';
	import { buildSnapshot, applySnapshot } from '$lib/backup.js';
	import { CloudUpload, CloudDownload } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	let url = $state($webdavConfig?.url ?? '');
	let username = $state($webdavConfig?.username ?? '');
	let password = $state('');
	let autoSync = $state($webdavConfig?.autoSync ?? false);
	let testStatus = $state<'idle' | 'testing' | 'success' | 'error'>('idle');
	let testMessage = $state('');
	let syncStatus = $state<'idle' | 'uploading' | 'downloading' | 'success' | 'error' | 'conflict'>(
		'idle'
	);
	let syncMessage = $state('');

	$effect(() => {
		const stored = $webdavConfig;
		if (!stored) return;
		url = stored.url;
		username = stored.username;
		autoSync = stored.autoSync;
	});

	async function saveConfig(lastSyncAt = $webdavConfig?.lastSyncAt) {
		const encrypted = password ? await saveWebDavSecret(password) : ($webdavConfig?.password ?? '');
		webdavConfig.set({ url, username, password: encrypted, autoSync, lastSyncAt });
		password = '';
	}

	async function handleTest() {
		if (!url || !username || !(password || $webdavConfig?.password)) {
			testStatus = 'error';
			testMessage = m['sync.testFail']();
			return;
		}
		await saveConfig();
		const stored = $webdavConfig;
		if (!isConfigured(stored)) return;
		testStatus = 'testing';
		const result = await withWebDavPassword(stored, (secret) =>
			testConnection(stored.url, stored.username, secret)
		);
		testStatus = result.ok ? 'success' : 'error';
		testMessage = result.ok
			? m['sync.testSuccess']()
			: result.cors
				? m['sync.corsHint']()
				: (result.error ?? m['sync.testFail']());
	}

	async function handleUpload() {
		await saveConfig();
		const stored = $webdavConfig;
		if (!isConfigured(stored)) return;
		syncStatus = 'uploading';
		const snapshot = buildSnapshot();
		const result = await withWebDavPassword(stored, (secret) =>
			uploadSnapshot(stored.url, stored.username, secret, snapshot)
		);
		syncStatus = result.ok ? 'success' : 'error';
		syncMessage = result.ok
			? m['sync.uploadSuccess']()
			: result.cors
				? m['sync.corsHint']()
				: (result.error ?? m['sync.testFail']());
		if (result.ok) await saveConfig(new Date().toISOString());
	}

	async function handleDownload(force = false) {
		await saveConfig();
		const stored = $webdavConfig;
		if (!isConfigured(stored)) return;
		syncStatus = 'downloading';
		const result = await withWebDavPassword(stored, (secret) =>
			downloadSnapshot(stored.url, stored.username, secret)
		);
		if (!result.ok) {
			syncStatus = 'error';
			syncMessage = result.cors ? m['sync.corsHint']() : (result.error ?? m['sync.testFail']());
			return;
		}
		if (!result.snapshot) {
			syncStatus = 'error';
			syncMessage = m['sync.noRemote']();
			return;
		}
		const localTs = $webdavConfig?.lastSyncAt ? new Date($webdavConfig.lastSyncAt).getTime() : 0;
		const remoteTs = new Date(result.snapshot.exportedAt).getTime();
		if (!force && localTs > remoteTs) {
			syncStatus = 'conflict';
			syncMessage = m['sync.conflict']();
			return;
		}
		applySnapshot(result.snapshot);
		syncStatus = 'success';
		syncMessage = m['sync.downloadSuccess']();
		await saveConfig(new Date().toISOString());
	}
</script>

<svelte:head><title>{m['sync.pageTitle']()}</title></svelte:head>
<div class="container mx-auto max-w-2xl space-y-6 px-6 py-10">
	<VaultGate />
	{#if needsPasswordMigration($webdavConfig)}
		<p
			class="rounded-md border border-[var(--q-dificil)]/30 bg-[color-mix(in_oklch,var(--q-dificil)_8%,transparent)] px-3 py-2 text-xs"
		>
			{m['vault.legacyPassword']()}
		</p>
	{/if}
	<Card.Root
		><Card.Header
			><Card.Title>{m['sync.title']()}</Card.Title><Card.Description
				>{m['sync.subtitle']()}</Card.Description
			></Card.Header
		><Card.Content class="space-y-4">
			<div class="space-y-2">
				<Label for="sync-url">{m['sync.url']()}</Label><Input
					id="sync-url"
					type="url"
					bind:value={url}
				/>
			</div>
			<div class="space-y-2">
				<Label for="sync-user">{m['sync.username']()}</Label><Input
					id="sync-user"
					type="text"
					bind:value={username}
				/>
			</div>
			<div class="space-y-2">
				<Label for="sync-pass">{m['sync.password']()}</Label><Input
					id="sync-pass"
					type="password"
					autocomplete="off"
					bind:value={password}
				/>
				<p class="text-xs text-muted-foreground">{m['vault.secretNotPrefilled']()}</p>
			</div>
			<div class="flex items-center gap-2">
				<input id="sync-auto" type="checkbox" class="h-4 w-4" bind:checked={autoSync} /><Label
					for="sync-auto">{m['sync.autoSync']()}</Label
				>
			</div>
			{#if testStatus !== 'idle'}<p role="status" aria-live="polite" class="text-sm">
					{testMessage}
				</p>{/if}
			<Button
				variant="outline"
				onclick={handleTest}
				disabled={testStatus === 'testing' || $vaultState.status !== 'unlocked'}
				>{testStatus === 'testing' ? m['sync.testing']() : m['sync.test']()}</Button
			>
		</Card.Content></Card.Root
	>
	<Card.Root
		><Card.Header><Card.Title>{m['sync.actions']()}</Card.Title></Card.Header><Card.Content
			class="space-y-4"
		>
			{#if syncStatus !== 'idle'}<p role="status" aria-live="polite" class="text-sm">
					{syncMessage}
				</p>{/if}
			<div class="flex flex-wrap gap-2">
				<Button
					onclick={handleUpload}
					disabled={syncStatus === 'uploading' ||
						syncStatus === 'downloading' ||
						$vaultState.status !== 'unlocked'}
					><CloudUpload class="mr-2 h-4 w-4" />{m['sync.upload']()}</Button
				>
				<Button
					variant="outline"
					onclick={() => handleDownload()}
					disabled={syncStatus === 'uploading' ||
						syncStatus === 'downloading' ||
						$vaultState.status !== 'unlocked'}
					><CloudDownload class="mr-2 h-4 w-4" />{m['sync.download']()}</Button
				>
			</div>
			{#if syncStatus === 'conflict'}<Button
					variant="destructive"
					size="sm"
					onclick={() => handleDownload(true)}>{m['sync.forceDownload']()}</Button
				>{/if}
		</Card.Content></Card.Root
	>
</div>
