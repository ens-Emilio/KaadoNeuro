# KaadoNeuro

English | [Português](README.md) | [Español](README.es.md)

A local-first flashcard PWA built around focus, clarity, and the SM-2 spaced-repetition method.

## Overview

**KaadoNeuro** is a local-first study app. Decks, cards, review progress, preferences, and AI settings live in the browser. There is no account system, application server, or remote database.

The app can be installed as a PWA, used offline after the first visit, and hosted as a static site.

## Features

- **SM-2 spaced repetition**: review intervals based on recall quality.
- **Decks and cards**: organize multiple subjects with a focused review flow.
- **Bulk import**: import JSON, Markdown, plain text, or Anki `.apkg` packages.
- **Statistics**: review volume, card counts, and SM-2 quality distribution.
- **Editorial interface**: light and dark themes, responsive layout, and a calm visual system.
- **13 languages**: Portuguese, English, Spanish, French, German, Simplified Chinese, Japanese, Korean, Arabic, Hindi, Indonesian, Turkish, and Vietnamese.
- **Right-to-left support**: automatic RTL layout for Arabic.
- **Optional AI**: connect your own provider and review generated cards before saving.
- **Backup**: export and import complete local backups.

## Stack

- **Frontend**: Svelte 5 and SvelteKit
- **Styling**: Tailwind CSS and shadcn-svelte components
- **Persistence**: browser storage
- **Distribution**: static build and installable PWA
- **Icons**: Lucide
- **AI runtime**: direct browser calls to the provider chosen by the user

## Project structure

```text
src/
├── lib/
│   ├── ai/              # AI provider presets, prompts, validation, browser client
│   ├── components/      # Reusable UI and AI dialog components
│   ├── i18n/            # Locale names and RTL metadata
│   ├── backup.ts        # Full JSON backup and restore
│   ├── sm2.ts           # SM-2 algorithm
│   ├── stores.ts        # Local decks, cards, and review logs
│   └── types.ts
├── routes/
│   ├── +page.svelte
│   ├── decks/[id]/+page.svelte
│   ├── review/[deckId]/+page.svelte
│   ├── settings/ai/+page.svelte
│   ├── stats/+page.svelte
│   └── tutorial/+page.svelte
└── service-worker.ts
```

## Run locally

Requirements: Node.js **22.12 or newer** (validated on Node 24) and **pnpm 10**.

The repository keeps only `pnpm-lock.yaml`; npm and Yarn installs do not reproduce the tested dependency set.

```bash
corepack enable
pnpm install
pnpm dev
```

Open the local URL shown by Vite.

## Production build

```bash
pnpm build
pnpm preview
```

The static site is written to `build/`.

Run checks with:

```bash
pnpm check
pnpm test:unit -- --run
```

## Hosting

Publish the contents of `build/` to any static host with HTTPS, such as GitHub Pages, Cloudflare Pages, Netlify, Vercel, nginx, or Caddy.

No VPS, application server, PostgreSQL instance, account backend, or billing service is required by the current architecture.

See [DEPLOY.md](DEPLOY.md) for hosting details.

## Importing cards

In a deck, choose **Import** and use either:

1. **File**: select `.json`, `.md`, `.txt`, or an Anki `.apkg`. An `.apkg` supplies the deck name, the field text (HTML converted), and the tags; notes without a back side are skipped and the count is reported in the preview.
2. **Text**: paste content directly.

Markdown format:

```markdown
# Question

Answer text
Can span multiple lines.
---

# Another question

Another answer.
```

JSON format:

```json
[
	{ "front": "Question", "back": "Answer" },
	{ "front": "Term", "back": "Definition" }
]
```

The importer has a preview before saving.

## AI configuration

Open **AI** in the navigation or `/settings/ai`.

Supported providers:

- Anthropic
- OpenAI
- Google Gemini
- OpenRouter
- OpenAI-compatible endpoints

The provider request is made directly from the browser. The key is stored in this browser's local storage and is sent only to the selected provider. Do not enter a key on a site whose operator or host you do not trust.

The AI flow produces an editable proposal. No deck or card is saved until you confirm **Apply**.

Limits:

- up to 30 cards per batch;
- up to 12,000 characters of source context;
- JSON-shaped responses validated before display.

## Backup and privacy

- Local data is tied to the current browser profile and origin.
- Clearing browser site data removes decks, cards, and settings.
- Use **Tutorial → Backup** to export or import a full JSON file.
- There is no account recovery or cross-device synchronization.
- Prompts are sent only to the provider configured by the user.

## Tests and checks

```bash
pnpm test:unit -- --run
pnpm test:e2e
pnpm check
pnpm build
```

## License

Code is licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for attribution and the trademark policy.

---

Built by **ens-Emilio** with a focus on performance and simplicity.
