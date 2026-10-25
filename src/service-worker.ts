/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;

const ASSETS = [
    ...build, // the app itself
    ...files  // everything in `static`
];

self.addEventListener('install', (event: ExtendableEvent) => {
    // Create a new cache and add all files to it
    async function addFilesToCache() {
        const cache = await caches.open(CACHE);
        await cache.addAll(ASSETS);
    }

    event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event: ExtendableEvent) => {
    // Remove previous cached data from disk
    async function deleteOldCaches() {
        for (const key of await caches.keys()) {
            if (key !== CACHE) await caches.delete(key);
        }
    }

    event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event: FetchEvent) => {
    // ignore POST requests etc
    if (event.request.method !== 'GET') return;
    // ignore requests for other domains?
    const url = new URL(event.request.url);
    if (url.origin !== location.origin) return;

    async function respond() {
        const url = new URL(event.request.url);
        const cache = await caches.open(CACHE);

        // Serve build files from cache
        if (ASSETS.includes(url.pathname)) {
            const response = await cache.match(url.pathname);
            if (response) return response;
        }

        try {
            const response = await fetch(event.request);

            if (response.status === 200) {
                cache.put(event.request, response.clone());
            }

            return response;
        } catch {
            const cached = await cache.match(event.request);
            if (cached) return cached;

            // if offline and navigate to page -> dashboard fallback (or index)
            // returning cache.match('/') is usually safe for SPA
            if (event.request.headers.get('Accept').includes('text/html')) {
                return cache.match('/');
            }
        }
    }

    event.respondWith(respond());
});
