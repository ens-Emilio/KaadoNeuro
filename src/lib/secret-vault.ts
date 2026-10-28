/**
 * Passphrase-protected credential vault.
 *
 * The passphrase is never persisted. It derives a non-extractable AES-GCM key
 * with PBKDF2-SHA-256 and a random per-vault salt. The derived key lives only
 * in module memory and is discarded by lock() or inactivity.
 */

import { writable } from 'svelte/store';

const ALGO = 'AES-GCM';
const KDF = 'PBKDF2';
const KDF_HASH = 'SHA-256';
const KDF_ITERATIONS = 310_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const SALT_KEY = 'kaadoneuro_vault_salt';
const VERIFIER_KEY = 'kaadoneuro_vault_verifier';
const VERIFIER_TEXT = 'kaadoneuro-vault-ok';
const VERSION = 3;
const PREFIX = `enc:v${VERSION}:`;
const AUTO_LOCK_MS = 15 * 60 * 1000;

export type VaultStatus = 'uninitialized' | 'locked' | 'unlocked';

export interface VaultState {
	status: VaultStatus;
	unlockExpiresAt: number | null;
}

export interface SecretProvider {
	get(handle: string): Promise<string | null>;
	set(handle: string, value: string): Promise<void>;
	delete(handle: string): Promise<void>;
}

interface VaultEnvelope {
	salt: Uint8Array<ArrayBuffer>;
	iv: Uint8Array<ArrayBuffer>;
	ciphertext: Uint8Array<ArrayBuffer>;
}

let key: CryptoKey | null = null;
let keySalt: Uint8Array<ArrayBuffer> | null = null;
let autoLockTimer: ReturnType<typeof setTimeout> | undefined;
let activeProvider: SecretProvider | null = null;

function initialState(): VaultState {
	if (typeof window === 'undefined') return { status: 'uninitialized', unlockExpiresAt: null };
	return {
		status:
			localStorage.getItem(SALT_KEY) && localStorage.getItem(VERIFIER_KEY)
				? 'locked'
				: 'uninitialized',
		unlockExpiresAt: null
	};
}

export const vaultState = writable<VaultState>(initialState());

export function installSecretProvider(provider: SecretProvider | null): void {
	activeProvider = provider;
}

export function hasSecretProvider(): boolean {
	return activeProvider !== null;
}

function toBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
	const raw = atob(value);
	const bytes = new Uint8Array(new ArrayBuffer(raw.length));
	for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
	return bytes;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
	return crypto.getRandomValues(new Uint8Array(length)) as Uint8Array<ArrayBuffer>;
}

function encodeEnvelope(envelope: VaultEnvelope): string {
	return `${PREFIX}${toBase64(envelope.salt)}.${toBase64(envelope.iv)}.${toBase64(envelope.ciphertext)}`;
}

function decodeEnvelope(stored: string): VaultEnvelope {
	if (!stored.startsWith(PREFIX)) throw new Error('Unsupported vault format.');
	const parts = stored.slice(PREFIX.length).split('.');
	if (parts.length !== 3) throw new Error('Malformed vault envelope.');
	return {
		salt: fromBase64(parts[0]),
		iv: fromBase64(parts[1]),
		ciphertext: fromBase64(parts[2])
	};
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
	const material = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(passphrase),
		KDF,
		false,
		['deriveKey']
	);
	return crypto.subtle.deriveKey(
		{ name: KDF, salt, iterations: KDF_ITERATIONS, hash: KDF_HASH },
		material,
		{ name: ALGO, length: KEY_BITS },
		false,
		['encrypt', 'decrypt']
	);
}

function scheduleAutoLock(): void {
	clearTimeout(autoLockTimer);
	const expires = Date.now() + AUTO_LOCK_MS;
	vaultState.update((state) =>
		state.status === 'unlocked' ? { ...state, unlockExpiresAt: expires } : state
	);
	autoLockTimer = setTimeout(() => lockVault(), AUTO_LOCK_MS);
}

export function touchVault(): void {
	if (key) scheduleAutoLock();
}

export function isVaultUnlocked(): boolean {
	return key !== null || activeProvider !== null;
}

export function isVaultEncrypted(value: string): boolean {
	return value.startsWith(PREFIX);
}

export function isLegacySecret(value: string): boolean {
	return /^enc:v[12]:/.test(value);
}

export function lockVault(): void {
	key = null;
	keySalt = null;
	clearTimeout(autoLockTimer);
	autoLockTimer = undefined;
	vaultState.set({ status: 'locked', unlockExpiresAt: null });
}

export async function createVault(passphrase: string): Promise<void> {
	if (passphrase.length < 12) throw new Error('Passphrase must contain at least 12 characters.');
	const salt = randomBytes(SALT_BYTES);
	key = await deriveKey(passphrase, salt);
	keySalt = salt;
	localStorage.setItem(SALT_KEY, toBase64(salt));
	localStorage.setItem(VERIFIER_KEY, await encryptSecret(VERIFIER_TEXT));
	vaultState.set({ status: 'unlocked', unlockExpiresAt: Date.now() + AUTO_LOCK_MS });
	scheduleAutoLock();
}

export async function unlockVault(passphrase: string): Promise<void> {
	const verifier = localStorage.getItem(VERIFIER_KEY);
	if (!localStorage.getItem(SALT_KEY) || !verifier) throw new Error('Vault is not initialized.');
	const envelope = decodeEnvelope(verifier);
	const candidate = await deriveKey(passphrase, envelope.salt);
	try {
		const plaintext = await crypto.subtle.decrypt(
			{ name: ALGO, iv: envelope.iv },
			candidate,
			envelope.ciphertext
		);
		if (new TextDecoder().decode(plaintext) !== VERIFIER_TEXT) throw new Error();
	} catch {
		throw new Error('Incorrect passphrase.');
	}
	key = candidate;
	keySalt = envelope.salt;
	vaultState.set({ status: 'unlocked', unlockExpiresAt: Date.now() + AUTO_LOCK_MS });
	scheduleAutoLock();
}

export async function encryptSecret(plaintext: string): Promise<string> {
	if (!key) throw new Error('Vault is locked.');
	const salt = keySalt ?? randomBytes(SALT_BYTES);
	const iv = randomBytes(IV_BYTES);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: ALGO, iv },
		key,
		new TextEncoder().encode(plaintext)
	);
	scheduleAutoLock();
	return encodeEnvelope({ salt, iv, ciphertext: new Uint8Array(ciphertext) });
}

export async function decryptSecret(stored: string): Promise<string> {
	if (!key) throw new Error('Vault is locked.');
	const envelope = decodeEnvelope(stored);
	const plaintext = await crypto.subtle.decrypt(
		{ name: ALGO, iv: envelope.iv },
		key,
		envelope.ciphertext
	);
	scheduleAutoLock();
	return new TextDecoder().decode(plaintext);
}

/** Runs a callback with plaintext without publishing it through UI state. */
export async function useSecret<T>(
	stored: string,
	callback: (plaintext: string) => Promise<T>
): Promise<T> {
	if (stored.startsWith('native:')) {
		if (!activeProvider) throw new Error('Native secret provider is unavailable.');
		const value = await activeProvider.get(stored);
		if (value === null) throw new Error('Secret is unavailable in the host keychain.');
		return callback(value);
	}
	const plaintext = await decryptSecret(stored);
	try {
		return await callback(plaintext);
	} finally {
		touchVault();
	}
}

export async function storeSecret(handle: string, plaintext: string): Promise<string> {
	if (activeProvider) {
		await activeProvider.set(handle, plaintext);
		return `native:${handle}`;
	}
	return encryptSecret(plaintext);
}

export async function deleteHostSecret(handle: string): Promise<void> {
	if (activeProvider) await activeProvider.delete(handle);
}

/** Test-only reset: clears in-memory state without touching persisted ciphertext. */
export function clearVaultForTests(): void {
	key = null;
	keySalt = null;
	activeProvider = null;
	clearTimeout(autoLockTimer);
	autoLockTimer = undefined;
}

/** Re-encrypts a v2 secret after the user re-enters it. */
export async function migrateLegacySecret(legacyPlaintext: string): Promise<string> {
	return encryptSecret(legacyPlaintext);
}
