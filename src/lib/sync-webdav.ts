import type { Snapshot } from './snapshot-schema.js';

const SYNC_PATH = '/kaadoneuro/snapshot.json';
const TIMEOUT_MS = 15_000;

export interface SyncResult {
	ok: boolean;
	error?: string;
	cors?: boolean;
}

function authHeader(user: string, pass: string): string {
	return `Basic ${btoa(`${user}:${pass}`)}`;
}

function resolveUrl(base: string): string {
	const trimmed = base.replace(/\/+$/, '');
	return `${trimmed}${SYNC_PATH}`;
}

export async function uploadSnapshot(
	url: string,
	user: string,
	pass: string,
	snapshot: Snapshot
): Promise<SyncResult> {
	const target = resolveUrl(url);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const res = await fetch(target, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: authHeader(user, pass)
			},
			body: JSON.stringify(snapshot),
			signal: controller.signal
		});

		if (!res.ok) {
			const detail = await res.text().catch(() => '');
			return { ok: false, error: `HTTP ${res.status}: ${detail || res.statusText}` };
		}

		return { ok: true };
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') {
			return { ok: false, error: 'Timeout: server did not respond in time.' };
		}
		if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
			return { ok: false, cors: true, error: 'CORS or network error. If your WebDAV server does not allow browser requests, use a CORS proxy or a local sync tool.' };
		}
		return { ok: false, error: err instanceof Error ? err.message : String(err) };
	} finally {
		clearTimeout(timer);
	}
}

export async function downloadSnapshot(
	url: string,
	user: string,
	pass: string
): Promise<{ snapshot: Snapshot | null } & SyncResult> {
	const target = resolveUrl(url);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const res = await fetch(target, {
			method: 'GET',
			headers: { Authorization: authHeader(user, pass) },
			signal: controller.signal
		});

		if (res.status === 404) {
			return { ok: true, snapshot: null };
		}

		if (!res.ok) {
			const detail = await res.text().catch(() => '');
			return { ok: false, snapshot: null, error: `HTTP ${res.status}: ${detail || res.statusText}` };
		}

		const data = await res.json();
		return { ok: true, snapshot: data as Snapshot };
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') {
			return { ok: false, snapshot: null, error: 'Timeout: server did not respond in time.' };
		}
		if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
			return { ok: false, snapshot: null, cors: true, error: 'CORS or network error. If your WebDAV server does not allow browser requests, use a CORS proxy or a local sync tool.' };
		}
		return { ok: false, snapshot: null, error: err instanceof Error ? err.message : String(err) };
	} finally {
		clearTimeout(timer);
	}
}

export async function testConnection(url: string, user: string, pass: string): Promise<SyncResult> {
	const target = resolveUrl(url);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		// PROPFIND is the canonical WebDAV probe, but many servers also accept HEAD/OPTIONS.
		// We use OPTIONS first because it's universally safe for CORS preflight checks.
		const res = await fetch(target, {
			method: 'OPTIONS',
			headers: { Authorization: authHeader(user, pass) },
			signal: controller.signal
		});

		// Some servers return 405 for OPTIONS but still work; accept 2xx and 405.
		if (res.ok || res.status === 405) {
			return { ok: true };
		}

		if (res.status === 401 || res.status === 403) {
			return { ok: false, error: 'Authentication failed. Check username and password.' };
		}

		const detail = await res.text().catch(() => '');
		return { ok: false, error: `HTTP ${res.status}: ${detail || res.statusText}` };
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') {
			return { ok: false, error: 'Timeout: server did not respond in time.' };
		}
		if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
			return { ok: false, cors: true, error: 'CORS or network error. If your WebDAV server does not allow browser requests, use a CORS proxy or a local sync tool.' };
		}
		return { ok: false, error: err instanceof Error ? err.message : String(err) };
	} finally {
		clearTimeout(timer);
	}
}