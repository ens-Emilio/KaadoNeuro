# Security

## Model

KaadoNeuro is a static, local-first application. There is no application server, remote database, account system, or AI backend.

- decks, cards, and progress stay in browser storage;
- the AI key is used directly by the browser to call the chosen provider;
- do not enter an AI key on a site hosted by a third party unless you trust the operator and the host.

## Local credential vault

The AI key and the WebDAV password are kept in a vault protected by a passphrase:

- current format: `enc:v3:salt.iv.ciphertext`;
- derivation: PBKDF2-SHA-256, 310,000 iterations, random 16-byte salt;
- cipher: AES-256-GCM with a random 12-byte IV;
- the passphrase is never persisted;
- the derived key exists only in module memory;
- the vault locks after 15 minutes of inactivity, or through the **Lock now** button;
- a page reload requires the passphrase again;
- the forms do not recover the stored secret; to replace a credential, type it again.

Older `enc:v1` and `enc:v2` values used another key and cannot be migrated without the previous one. The interface flags the legacy format and asks for the credential once; the next save writes `enc:v3`.

## Security boundary

The vault closes off access to credentials at rest without the passphrase. While it is unlocked, compromised JavaScript on the same origin can still request an authorized operation. CSP reduces the attack surface but does not remove that risk.

### Content Security Policy

The policy is emitted in two places, and both must agree:

- `src/hooks.server.ts` sets the header in `dev` and `preview`;
- `src/app.html` sets the same policy as a `<meta>` tag, because a static build served by nginx, Caddy, or an equivalent never passes through a hook.

Relevant directives:

- `script-src` includes `'wasm-unsafe-eval'`, required by the `sql.js` build that reads `.apkg` packages. This enables WebAssembly compilation, not JavaScript `eval`.
- `connect-src` accepts `https:` and `localhost`/`127.0.0.1`, because the user configures an OpenAI-compatible provider and the client requires HTTPS outside loopback.
- `frame-ancestors` only applies as a header; browsers ignore it in a `<meta>` tag, so `X-Frame-Options` remains the effective protection there.

If you publish `build/` behind a server, prefer removing the `<meta>` tag and sending the policy as a header, where every directive applies.

The optional `SecretProvider` contract in `src/lib/secret-vault.ts` lets a future desktop shell store and use the secret outside the page:

- the native process reaches Keychain (macOS), Credential Manager (Windows), or libsecret (Linux);
- the page process receives only the result of the operation, such as listing models, testing a connection, or generating cards;
- the API key and the WebDAV password never cross the bridge into the page.

The current project is an SPA built with `@sveltejs/adapter-static`; that protection only takes effect once a desktop application implements the contract and ships signed and updated.

## Reporting vulnerabilities

Do not open a public issue with exploitable details. Send the maintainer a private report with the version or commit, reproduction steps, impact, and a suggested mitigation.

## Recommendations

- host over HTTPS;
- keep the browser up to date;
- back up your data;
- revoke any AI key that may have been exposed;
- clearing site data removes all local data, including the vault;
- after clearing site data, create a new vault and enter the credentials again.
