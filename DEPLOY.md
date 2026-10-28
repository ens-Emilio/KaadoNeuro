# Hosting

KaadoNeuro is a static, local-first site. It needs no application server, remote database, or user account.

## Run on a local machine

Requirements: Node.js 22.12 or newer and pnpm 10.

```bash
corepack enable
pnpm install
pnpm dev
```

To produce the production build:

```bash
pnpm build
pnpm preview
```

## Hosting

Publish the contents of the `build` directory to any static host with HTTPS, for example:

- GitHub Pages;
- Cloudflare Pages;
- Netlify;
- Vercel;
- nginx, Caddy, or another file server.

Build configuration in every case:

- command: `pnpm build`
- published directory: `build`
- fallback/SPA: `index.html`

### MIME types

Serve `.wasm` as `application/wasm`. The Anki package importer compiles SQLite to WebAssembly, and a wrong MIME type makes the browser reject the module.

### CSP

The app ships the policy in a `<meta>` tag (see `SECURITY.md`), so it works without extra configuration. To send it as a header instead, remove the `<meta>` tag from `build/index.html` during deployment and configure the server:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; img-src 'self' data: blob:; frame-ancestors 'none'" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
```

`frame-ancestors` only takes effect as a header.

## Updates

The service worker caches the app shell. After you publish a new version, the user receives the update on the next visit.

## AI

The user configures the AI provider in their own browser. The key is stored only on that device, and KaadoNeuro has no backend that receives it.

## Backup

The **Tutorial** page explains the import formats. Full backup is available through the import and export functions in the interface.

## Model limits

- Data belongs to the user's browser. Clearing site data removes the content.
- There is no cross-device synchronization and no account backend.
- To move data between devices, use the JSON backup or a deck share link.
