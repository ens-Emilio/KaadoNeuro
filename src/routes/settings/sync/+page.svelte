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
	import { detectConflict, resolveConflict, type MergeStrategy } from '$lib/sync-conflict.js';
	import { CloudUpload, CloudDownload, AlertTriangle, Merge } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { Snapshot } from '$lib/snapshot-schema.js';

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
	let pendingRemoteSnapshot: Snapshot | null = $state(null);

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
		const snapshot = await buildSnapshot();
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

	async function handleDownload() {
		await saveConfig();
		const stored = $webdavConfig;
		if (!isConfigured(stored)) return;
		syncStatus = 'downloading';
		pendingRemoteSnapshot = null;

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

		const localSnapshot = await buildSnapshot();
		const conflict = detectConflict(
			$webdavConfig?.lastSyncAt,
			localSnapshot.exportedAt,
			result.snapshot.exportedAt
		);

		if (conflict.hasConflict) {
			pendingRemoteSnapshot = result.snapshot;
			syncStatus = 'conflict';
			syncMessage = m['sync.conflict']();
			return;
		}

		// No conflict: safe to apply remote
		applySnapshot(result.snapshot);
		syncStatus = 'success';
		syncMessage = m['sync.downloadSuccess']();
		await saveConfig(new Date().toISOString());
	}

	async function resolveSyncConflict(strategy: MergeStrategy) {
		if (!pendingRemoteSnapshot) return;
		const localSnapshot = await buildSnapshot();
		const resolved = resolveConflict(localSnapshot, pendingRemoteSnapshot, strategy);

		if (strategy === 'keepLocal') {
			// Upload local as authoritative
			const stored = $webdavConfig;
			if (stored && isConfigured(stored)) {
				syncStatus = 'uploading';
				const result = await withWebDavPassword(stored, (secret) =>
					uploadSnapshot(stored.url, stored.username, secret, resolved)
				);
				if (!result.ok) {
					syncStatus = 'error';
					syncMessage = result.cors ? m['sync.corsHint']() : (result.error ?? '');
					return;
				}
			}
		} else {
			// Apply merged or remote-wins snapshot locally
			applySnapshot(resolved);
			// Also push resolved to remote so both sides converge
			const stored = $webdavConfig;
			if (stored && isConfigured(stored)) {
				syncStatus = 'uploading';
				const result = await withWebDavPassword(stored, (secret) =>
					uploadSnapshot(stored.url, stored.username, secret, resolved)
				);
				if (!result.ok) {
					syncStatus = 'error';
					syncMessage = result.cors ? m['sync.corsHint']() : (result.error ?? '');
					return;
				}
			}
		}

		pendingRemoteSnapshot = null;
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
					bind:value={url}
					placeholder="https://dav.example.com/remote.php/dav/files/user/"
				/>
			</div>
			<div class="space-y-2">
				<Label for="sync-user">{m['sync.username']()}</Label><Input
					id="sync-user"
					bind:value={username}
					autocomplete="username"
				/>
			</div>
			<div class="space-y-2">
				<Label for="sync-pass">{m['sync.password']()}</Label><Input
					id="sync-pass"
					type="password"
					bind:value={password}
					autocomplete="new-password"
				/>
				<p class="text-xs text-muted-foreground">{m['vault.secretNotPrefilled']()}</p>
			</div>
			<div class="flex items-center gap-2">
				<input
					id="sync-auto"
					type="checkbox"
					bind:checked={autoSync}
					class="size-4 rounded border-border accent-[var(--accent-solid)]"
				/>
				<Label for="sync-auto" class="font-normal">{m['sync.autoSync']()}</Label>
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
						syncStatus === 'conflict' ||
						$vaultState.status !== 'unlocked'}
					><CloudUpload class="mr-2 h-4 w-4" />{m['sync.upload']()}</Button
				>
				<Button
					variant="outline"
					onclick={handleDownload}
					disabled={syncStatus === 'uploading' ||
						syncStatus === 'downloading' ||
						syncStatus === 'conflict' ||
						$vaultState.status !== 'unlocked'}
					><CloudDownload class="mr-2 h-4 w-4" />{m['sync.download']()}</Button
				>
			</div>
			{#if syncStatus === 'conflict'}
				<div
					class="space-y-3 rounded-lg border border-[var(--q-dificil)]/30 bg-[color-mix(in_oklch,var(--q-dificil)_5%,transparent)] p-4"
				>
					<div class="flex items-start gap-2">
						<AlertTriangle class="mt-0.5 size-4 shrink-0 text-[var(--q-dificil)]" />
						<div class="space-y-1">
							<p class="text-sm font-medium">{m['sync.conflict']}</p>
							<p class="text-xs text-muted-foreground">
								Local and remote data have both changed since the last sync. Choose how to resolve
								this.
							</p>
						</div>
					</div>
					<div class="flex flex-wrap gap-2">
						<Button
							size="sm"
							variant="outline"
							onclick={() => resolveSyncConflict('keepLocal')}
							disabled={$vaultState.status !== 'unlocked'}
						>
							<CloudUpload class="mr-1.5 size-3.5" />
							Keep Local
						</Button>
						<Button
							size="sm"
							variant="outline"
							onclick={() => resolveSyncConflict('keepRemote')}
							disabled={$vaultState.status !== 'unlocked'}
						>
							<CloudDownload class="mr-1.5 size-3.5" />
							Keep Remote
						</Button>
						<Button
							size="sm"
							onclick={() => resolveSyncConflict('merge')}
							disabled={$vaultState.status !== 'unlocked'}
						>
							<Merge class="mr-1.5 size-3.5" />
							Merge (newest cards win)
						</Button>
					</div>
				</div>
			{/if}
			{#if $webdavConfig?.lastSyncAt}
				<p class="text-xs text-muted-foreground">
					{m['sync.lastSync']()}: {$webdavConfig.lastSyncAt}
				</p>
			{/if}
		</Card.Content></Card.Root
	>
</div>
