import { beforeEach, describe, expect, it } from 'vitest';
import {
	clearVaultForTests,
	createVault,
	decryptSecret,
	encryptSecret,
	isLegacySecret,
	isVaultEncrypted,
	lockVault,
	unlockVault
} from './secret-vault.js';

describe('secret-vault', () => {
	beforeEach(() => {
		localStorage.clear();
		clearVaultForTests();
	});

	it('round-trips a secret without storing plaintext', async () => {
		await createVault('correct horse battery staple');
		const secret = 'sk-test-credential-123';
		const encrypted = await encryptSecret(secret);
		expect(encrypted).not.toContain(secret);
		expect(isVaultEncrypted(encrypted)).toBe(true);
		expect(await decryptSecret(encrypted)).toBe(secret);
	});

	it('requires the passphrase after locking', async () => {
		await createVault('correct horse battery staple');
		const encrypted = await encryptSecret('webdav-password');
		lockVault();
		await unlockVault('correct horse battery staple');
		expect(await decryptSecret(encrypted)).toBe('webdav-password');
	});

	it('rejects a wrong passphrase', async () => {
		await createVault('correct horse battery staple');
		lockVault();
		await expect(unlockVault('incorrect passphrase')).rejects.toThrow('Incorrect passphrase');
	});

	it('rejects tampered ciphertext and legacy formats', async () => {
		await createVault('correct horse battery staple');
		const encrypted = await encryptSecret('secret');
		const tampered = encrypted.slice(0, -1) + (encrypted.endsWith('A') ? 'B' : 'A');
		await expect(decryptSecret(tampered)).rejects.toThrow();
		expect(isLegacySecret('enc:v1:old')).toBe(true);
		expect(isLegacySecret('enc:v2:old')).toBe(true);
	});

	it('uses a fresh IV and salt for each encryption', async () => {
		await createVault('correct horse battery staple');
		expect(await encryptSecret('same')).not.toBe(await encryptSecret('same'));
	});

	it('migrates a legacy plaintext secret through the vault', async () => {
		await createVault('correct horse battery staple');
		const encrypted = await encryptSecret('legacy-plaintext');
		expect(await decryptSecret(encrypted)).toBe('legacy-plaintext');
		expect(isLegacySecret(encrypted)).toBe(false);
	});
});
