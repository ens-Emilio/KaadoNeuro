import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';

const security: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set('X-Frame-Options', 'DENY');
	const csp = [
		"default-src 'self'",
		// 'wasm-unsafe-eval' is required by sql.js, which compiles the SQLite
		// WebAssembly module that reads .apkg collections. It does not allow
		// JavaScript eval.
		"script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
		// Custom OpenAI-compatible base URLs are a supported provider and must be
		// HTTPS (client.ts enforces it); localhost stays reachable for self-hosted
		// models during development.
		"connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"img-src 'self' data: blob:",
		"frame-ancestors 'none'"
	].join('; ');
	response.headers.set('Content-Security-Policy', csp);
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	if (process.env.NODE_ENV === 'production') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
	return response;
};

const localization: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

export const handle = sequence(localization, security);
