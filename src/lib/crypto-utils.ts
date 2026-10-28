/**
 * Web Crypto API encryption utilities for localStorage secrets.
 *
 * ponytail: Uses a hardcoded app secret + fixed salt for MVP key derivation.
 * This protects against casual localStorage inspection but NOT against
 * a determined attacker with DevTools access. Upgrade path: derive key
 * from user passphrase or use OPFS/IndexedDB with OS-backed keychain.
 */

const APP_SECRET = 'kaadoneuro-local-encryption-key-v1';
const FIXED_SALT = new TextEncoder().encode('kaadoneuro-salt-v1');
const ALGO = 'AES-GCM';
const KEY_BITS = 256;
const IV_BYTES = 12;
const PREFIX = 'enc:v1:';

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
	if (cachedKey) return cachedKey;
	const raw = new TextEncoder().encode(APP_SECRET);
	const base = await crypto.subtle.importKey('raw', raw, 'PBKDF2', false, ['deriveKey']);
	cachedKey = await crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt: FIXED_SALT, iterations: 100_000, hash: 'SHA-256' },
		base,
		{ name: ALGO, length: KEY_BITS },
		false,
		['encrypt', 'decrypt']
	);
	return cachedKey;
}

export async function encrypt(plaintext: string): Promise<string> {
	try {
		const key = await getKey();
		const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
		const data = new TextEncoder().encode(plaintext);
		const ct = await crypto.subtle.encrypt({ name: ALGO, iv }, key, data);
		const combined = new Uint8Array(iv.length + new Uint8Array(ct).length);
		combined.set(iv, 0);
		combined.set(new Uint8Array(ct), iv.length);
		let binary = '';
		for (let i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i]);
		return PREFIX + btoa(binary);
	} catch (e) {
		if (import.meta.env.DEV) console.warn('[crypto] encrypt failed, falling back to plaintext:', e);
		return plaintext;
	}
}

export async function decrypt(stored: string): Promise<string> {
	if (!stored.startsWith(PREFIX)) return stored;
	try {
		const key = await getKey();
		const raw = atob(stored.slice(PREFIX.length));
		const bytes = new Uint8Array(raw.length);
		for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
		const iv = bytes.slice(0, IV_BYTES);
		const ct = bytes.slice(IV_BYTES);
		const pt = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ct);
		return new TextDecoder().decode(pt);
	} catch (e) {
		if (import.meta.env.DEV) console.warn('[crypto] decrypt failed, returning raw value:', e);
		return stored.startsWith(PREFIX) ? stored : stored;
	}
}

export function isEncrypted(value: string): boolean {
	return value.startsWith(PREFIX);
}