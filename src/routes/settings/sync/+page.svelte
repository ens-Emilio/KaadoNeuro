<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { webdavConfig, isConfigured } from '$lib/sync-store.js';
	import { testConnection, uploadSnapshot, downloadSnapshot } from '$lib/sync-webdav.js';
	import { buildSnapshot, applySnapshot } from '$lib/backup.js';
	import { CloudUpload, CloudDownload, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	let url = $state($webdavConfig?.url ?? '');
	let username = $state($webdavConfig?.username ?? '');
	let password = $state($webdavConfig?.password ?? '');
	let autoSync = $state($webdavConfig?.autoSync ?? false);

	let testStatus = $state<'idle' | 'testing' | 'success' | 'error'>('idle');
	let testMessage = $state('');
	let syncStatus = $state<'idle' | 'uploading' | 'downloading' | 'success' | 'error' | 'conflict'>('idle');
	let syncMessage = $state('');

	function saveConfig() {
		webdavConfig.set({
			url,
			username,
			password,
			autoSync,
			lastSyncAt: $webdavConfig?.lastSyncAt
		});
	}

	async function handleTest() {
		if (!url || !username || !password) {
			testStatus = 'error';
			testMessage = m['sync.testFail']();
			return;
		}
		testStatus = 'testing';
		testMessage = '';
		const result = await testConnection(url, username, password);
		if (result.ok) {
			testStatus = 'success';
			testMessage = m['sync.testSuccess']();
			saveConfig();
		} else {
			testStatus = 'error';
			testMessage = result.cors ? m['sync.corsHint']() : (result.error ?? m['sync.testFail']());
		}
	}

	async function handleUpload() {
		if (!isConfigured({ url, username, password, autoSync })) return;
		syncStatus = 'uploading';
		syncMessage = '';
		const snapshot = buildSnapshot();
		const result = await uploadSnapshot(url, username, password, snapshot);
		if (result.ok) {
			syncStatus = 'success';
			syncMessage = m['sync.uploadSuccess']();
			webdavConfig.set({
				url,
				username,
				password,
				autoSync,
				lastSyncAt: new Date().toISOString()
			});
		} else {
			syncStatus = 'error';
			syncMessage = result.cors ? m['sync.corsHint']() : (result.error ?? m['sync.testFail']());
		}
	}

	async function handleDownload() {
		if (!isConfigured({ url, username, password, autoSync })) return;
		syncStatus = 'downloading';
		syncMessage = '';
		const result = await downloadSnapshot(url, username, password);
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

		// Merge strategy: compare timestamps, newer wins
		const localTs = $webdavConfig?.lastSyncAt ? new Date($webdavConfig.lastSyncAt).getTime() : 0;
		const remoteTs = result.snapshot.exportedAt ? new Date(result.snapshot.exportedAt).getTime() : 0;

		if (remoteTs > localTs) {
			applySnapshot(result.snapshot);
			syncStatus = 'success';
			syncMessage = m['sync.downloadSuccess']();
			webdavConfig.set({
				url,
				username,
				password,
				autoSync,
				lastSyncAt: new Date().toISOString()
			});
		} else if (localTs > remoteTs) {
			syncStatus = 'conflict';
			syncMessage = m['sync.conflict']();
		} else {
			syncStatus = 'success';
			syncMessage = m['sync.downloadSuccess']();
		}
	}

	function forceDownload() {
		if (!isConfigured({ url, username, password, autoSync })) return;
		syncStatus = 'downloading';
		syncMessage = '';
		downloadSnapshot(url, username, password).then((result) => {
			if (result.ok && result.snapshot) {
				applySnapshot(result.snapshot);
				syncStatus = 'success';
				syncMessage = m['sync.downloadSuccess']();
				webdavConfig.set({
					url,
					username,
					password,
					autoSync,
					lastSyncAt: new Date().toISOString()
				});
			} else {
				syncStatus = 'error';
				syncMessage = result.error ?? m['sync.testFail']();
			}
		});
	}

	function formatLastSync(iso?: string): string {
		if (!iso) return '—';
		try {
			return new Date(iso).toLocaleString();
		} catch {
			return iso;
		}
	}
</script>

<svelte:head>
	<title>{m['sync.pageTitle']()}</title>
</svelte:head>

<div class="container mx-auto max-w-2xl space-y-6 px-6 py-10">
	<Card.Root>
		<Card.Header>
			<Card.Title>{m['sync.title']()}</Card.Title>
			<Card.Description>{m['sync.subtitle']()}</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="space-y-2">
				<Label for="sync-url">{m['sync.url']()}</Label>
				<Input id="sync-url" type="url" placeholder="https://dav.example.com" bind:value={url} />
			</div>
			<div class="space-y-2">
				<Label for="sync-user">{m['sync.username']()}</Label>
				<Input id="sync-user" type="text" bind:value={username} />
			</div>
			<div class="space-y-2">
				<Label for="sync-pass">{m['sync.password']()}</Label>
				<Input id="sync-pass" type="password" bind:value={password} />
			</div>

			<div class="flex items-center gap-2">
				<input
					id="sync-auto"
					type="checkbox"
					class="h-4 w-4 rounded border-gray-300"
					bind:checked={autoSync}
				/>
				<Label for="sync-auto" class="cursor-pointer">{m['sync.autoSync']()}</Label>
			</div>

			{#if testStatus !== 'idle'}
				<div class="flex items-center gap-2 text-sm" class:text-green-600={testStatus === 'success'} class:text-red-600={testStatus === 'error'} class:text-yellow-600={testStatus === 'testing'}>
					{#if testStatus === 'success'}<CheckCircle2 class="h-4 w-4" />{/if}
					{#if testStatus === 'error'}<XCircle class="h-4 w-4" />{/if}
					{#if testStatus === 'testing'}<RefreshCw class="h-4 w-4 animate-spin" />{/if}
					<span>{testMessage}</span>
				</div>
			{/if}

			<div class="flex flex-wrap gap-2">
				<Button variant="outline" onclick={handleTest} disabled={testStatus === 'testing'}>
					{testStatus === 'testing' ? m['sync.testing']() : m['sync.test']()}
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m['sync.actions']()}</Card.Title>
			<Card.Description>{m['sync.lastSync']()}: {formatLastSync($webdavConfig?.lastSyncAt)}</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if syncStatus !== 'idle'}
				<div class="flex items-center gap-2 text-sm" class:text-green-600={syncStatus === 'success'} class:text-red-600={syncStatus === 'error'} class:text-yellow-600={syncStatus === 'uploading' || syncStatus === 'downloading'} class:text-orange-600={syncStatus === 'conflict'}>
					{#if syncStatus === 'success'}<CheckCircle2 class="h-4 w-4" />{/if}
					{#if syncStatus === 'error'}<XCircle class="h-4 w-4" />{/if}
					{#if syncStatus === 'conflict'}<AlertTriangle class="h-4 w-4" />{/if}
					{#if syncStatus === 'uploading' || syncStatus === 'downloading'}<RefreshCw class="h-4 w-4 animate-spin" />{/if}
					<span>{syncMessage}</span>
				</div>
			{/if}

			<div class="flex flex-wrap gap-2">
				<Button onclick={handleUpload} disabled={syncStatus === 'uploading' || syncStatus === 'downloading' || !isConfigured({ url, username, password, autoSync })}>
					<CloudUpload class="mr-2 h-4 w-4" />
					{syncStatus === 'uploading' ? m['sync.uploading']() : m['sync.upload']()}
				</Button>
				<Button variant="outline" onclick={handleDownload} disabled={syncStatus === 'uploading' || syncStatus === 'downloading' || !isConfigured({ url, username, password, autoSync })}>
					<CloudDownload class="mr-2 h-4 w-4" />
					{syncStatus === 'downloading' ? m['sync.downloading']() : m['sync.download']()}
				</Button>
			</div>

			{#if syncStatus === 'conflict'}
				<Button variant="destructive" size="sm" onclick={forceDownload}>
					{m['sync.forceDownload']()}
				</Button>
			{/if}
		</Card.Content>
	</Card.Root>
</div>