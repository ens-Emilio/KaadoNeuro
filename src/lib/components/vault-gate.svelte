<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { createVault, lockVault, unlockVault, vaultState } from '$lib/secret-vault.js';
	import { Lock, Unlock } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	let passphrase = $state('');
	let confirmPassphrase = $state('');
	let busy = $state(false);
	let error = $state('');

	async function submit() {
		busy = true;
		error = '';
		try {
			if ($vaultState.status === 'uninitialized') {
				if (passphrase !== confirmPassphrase) throw new Error(m['vault.passphraseMismatch']());
				await createVault(passphrase);
			} else {
				await unlockVault(passphrase);
			}
			passphrase = '';
			confirmPassphrase = '';
		} catch (e) {
			error = e instanceof Error ? e.message : m['vault.unlockError']();
		} finally {
			busy = false;
		}
	}
</script>

<section class="rounded-lg border border-border bg-card p-5" aria-labelledby="vault-heading">
	<div class="flex items-start gap-3">
		<span
			class="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--muted-surface)]"
			aria-hidden="true"
		>
			{#if $vaultState.status === 'unlocked'}<Unlock class="size-4" />{:else}<Lock
					class="size-4"
				/>{/if}
		</span>
		<div class="min-w-0 flex-1">
			<h2 id="vault-heading" class="text-sm font-semibold">
				{#if $vaultState.status === 'uninitialized'}{m[
						'vault.createTitle'
					]()}{:else if $vaultState.status === 'locked'}{m['vault.lockedTitle']()}{:else}{m[
						'vault.unlockedTitle'
					]()}{/if}
			</h2>
			{#if $vaultState.status === 'unlocked'}
				<p class="mt-1 text-xs text-muted-foreground">{m['vault.unlockedHint']()}</p>
				<Button class="mt-3" variant="outline" size="sm" onclick={lockVault}
					>{m['vault.lockNow']()}</Button
				>
			{:else}
				<p class="mt-1 text-xs text-muted-foreground">
					{#if $vaultState.status === 'uninitialized'}{m['vault.createHint']()}{:else}{m[
							'vault.lockedHint'
						]()}{/if}
				</p>
				<form
					class="mt-3 flex max-w-md flex-col gap-2"
					onsubmit={(event) => {
						event.preventDefault();
						void submit();
					}}
				>
					<Label for="vault-passphrase">{m['vault.passphrase']()}</Label>
					<Input
						id="vault-passphrase"
						type="password"
						autocomplete="current-password"
						bind:value={passphrase}
						minlength={12}
						required
					/>
					{#if $vaultState.status === 'uninitialized'}
						<Label for="vault-confirm">{m['vault.confirmPassphrase']()}</Label>
						<Input
							id="vault-confirm"
							type="password"
							autocomplete="new-password"
							bind:value={confirmPassphrase}
							minlength={12}
							required
						/>
					{/if}
					<Button type="submit" size="sm" disabled={busy}
						>{busy
							? m['vault.working']()
							: $vaultState.status === 'uninitialized'
								? m['vault.create']()
								: m['vault.unlock']()}</Button
					>
					{#if error}<p role="alert" class="text-xs text-destructive">{error}</p>{/if}
				</form>
			{/if}
		</div>
	</div>
</section>
