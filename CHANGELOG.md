# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-10-28

Primeira versão publicada. O app é estático e local-first: roda no navegador, sem backend, conta ou banco remoto.

### Adicionado

- Cofre local de credenciais com PBKDF2-SHA-256 (310.000 iterações) e AES-256-GCM, protegendo a chave de IA e a senha WebDAV. Bloqueio automático após 15 minutos sem atividade.
- Compartilhamento de baralho por link, com payload validado por Zod, limite de 100 cartões e geração de novos IDs na importação.
- Importação de pacotes Anki `.apkg`, incluindo `collection.anki21` comprimido com Zstandard, leitura via SQLite em WebAssembly, conversão de HTML e preservação de tags.
- Exportação para Anki em CSV.
- Leitura em voz alta do cartão (TTS) com o texto sem marcação.
- Cartões cloze com campo de resposta e conferência.
- Badge de app com o número de cartões devidos.
- Modo Pomodoro com ciclos de foco e pausa.
- Página de sincronização WebDAV (`/settings/sync`).
- Filtros por tag, incluindo revisão cruzada entre baralhos.
- Parâmetros SM-2 por baralho: intervalo inicial, modificador de EF e intervalo máximo.
- Suporte a KaTeX no renderizador Markdown.

### Segurança

- Content Security Policy aplicada por header no servidor e por `<meta>` no build estático, com `wasm-unsafe-eval` restrito ao necessário para o importador Anki.
- Sanitização de HTML renderizado com DOMPurify.
- `connect-src` limitado a HTTPS e loopback, acompanhando o requisito de TLS do cliente de IA.

### Alterado

- Stores migrados para uma implementação própria de armazenamento persistente, removendo a dependência de comportamento reativo de `svelte-local-storage-store`.
- Service worker passa a pré-cachear o app shell e os assets referenciados, deixando chunks de rotas não visitadas para carregamento sob demanda.
- Documentação de instalação padronizada em pnpm 10 e Node.js 22.12 ou superior.

### Removido

- `package-lock.json` e `yarn.lock`, mantendo apenas `pnpm-lock.yaml` como fonte de dependências.
- `.env` órfão, herdado de um scaffold com Drizzle e Better Auth que o projeto não usa.
- `crypto-utils.ts`, substituído pelo cofre de credenciais.

### Limitações conhecidas

- Não há backend de conta, recuperação de senha nem sincronização automática entre dispositivos.
- A sincronização WebDAV depende de o servidor remoto permitir CORS.
- Geração de cartões a partir de imagem (OCR) não está implementada.
- Os dados vivem no navegador: limpar os dados do site apaga baralhos, cartões e o cofre.

[1.0.0]: https://github.com/ens-Emilio/KaadoNeuro/releases/tag/v1.0.0
