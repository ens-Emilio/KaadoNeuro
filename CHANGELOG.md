# Changelog

All notable changes to this project are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Documentation is now English by default. `README.md` is the canonical README, `README.pt-BR.md` holds the Portuguese version, `README.es.md` holds the Spanish one, and `README.en.md` was removed as a duplicate.

## [1.0.0] - 2026-10-28

First published version. The app is static and local-first: it runs in the browser with no backend, account, or remote database.

### Added

- Local credential vault with PBKDF2-SHA-256 (310,000 iterations) and AES-256-GCM, protecting the AI key and the WebDAV password. Automatic lock after 15 minutes of inactivity.
- Deck sharing by link, with a Zod-validated payload, a 100-card limit, and new IDs generated on import.
- Anki `.apkg` import, including `collection.anki21` compressed with Zstandard, read through SQLite in WebAssembly, with HTML conversion and tag preservation.
- Export to Anki CSV.
- Read-aloud (TTS) for cards, with markup stripped.
- Cloze cards with an answer field and checking.
- App badge showing the number of due cards.
- Pomodoro mode with focus and break cycles.
- WebDAV synchronization page (`/settings/sync`).
- Tag filters, including cross-deck review.
- Per-deck SM-2 settings: initial interval, EF modifier, and maximum interval.
- KaTeX support in the Markdown renderer.

### Security

- Content Security Policy applied through a server header and a `<meta>` tag in the static build, with `wasm-unsafe-eval` limited to what the Anki importer needs.
- Rendered HTML sanitized with DOMPurify.
- `connect-src` limited to HTTPS and loopback, matching the TLS requirement of the AI client.

### Changed

- Stores migrated to a custom persistent-storage implementation, removing the dependency on the reactive behavior of `svelte-local-storage-store`.
- The service worker now pre-caches the app shell and referenced assets, leaving chunks of unvisited routes to load on demand.
- Installation documentation standardized on pnpm 10 and Node.js 22.12 or newer.

### Removed

- `package-lock.json` and `yarn.lock`, keeping `pnpm-lock.yaml` as the dependency source.
- Orphan `.env` inherited from a scaffold with Drizzle and Better Auth that the project does not use.
- `crypto-utils.ts`, replaced by the credential vault.

### Known limitations

- No account backend, password recovery, or automatic synchronization between devices.
- WebDAV synchronization depends on the remote server allowing CORS.
- Image-to-card generation (OCR) is not implemented.
- Data lives in the browser: clearing site data erases decks, cards, and the vault.

[1.0.0]: https://github.com/ens-Emilio/KaadoNeuro/releases/tag/v1.0.0
