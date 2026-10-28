/// <reference types="@sveltejs/kit" />
import { files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const RUNTIME = `runtime-${version}`;
const SHELL_PATHS = new Set(['/', ...files]);

self.addEventListener('install', (event: ExtendableEvent) => {
	// Precache the root document and only the assets it references. Route entry
	// chunks stay out of install, so code-splitting still defers unvisited pages.
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			const root = await fetch(new Request('/', { cache: 'reload' }));
			if (!root.ok) throw new Error(`Failed to precache app shell: ${root.status}`);
			const html = await root.clone().text();
			const referenced = [...html.matchAll(/(?:src|href)="(\/_app\/[^"]+)"/g)].map(
				([, path]) => path
			);
			await cache.put('/', root);
			await cache.addAll([...files, ...new Set(referenced)]);
		})()
	);
});

self.addEventListener('activate', (event: ExtendableEvent) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((key) => key !== CACHE && key !== RUNTIME).map((key) => caches.delete(key))
				)
			)
	);
});

self.addEventListener('fetch', (event: FetchEvent) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== location.origin) return;

	async function respond(): Promise<Response> {
		const cache = await caches.open(CACHE);
		if (SHELL_PATHS.has(url.pathname)) {
			const shell = await cache.match(event.request);
			if (shell) return shell;
		}

		try {
			const response = await fetch(event.request);
			if (response.ok) {
				const runtime = await caches.open(RUNTIME);
				runtime.put(event.request, response.clone());
			}
			return response;
		} catch {
			const runtime = await caches.open(RUNTIME);
			const cached = await runtime.match(event.request);
			if (cached) return cached;
			if (event.request.headers.get('Accept')?.includes('text/html')) {
				return (await cache.match('/')) ?? Response.error();
			}
			return Response.error();
		}
	}

	event.respondWith(respond());
});
