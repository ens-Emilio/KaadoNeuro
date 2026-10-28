# Hospedagem

O KaadoNeuro é um site estático e local-first. Não exige servidor de aplicação, banco remoto nem conta de usuário.

## Rodar no PC do usuário

Requisitos: Node.js 22.12 ou superior e pnpm 10.

```bash
corepack enable
pnpm install
pnpm dev
```

Para gerar a versão de produção:

```bash
pnpm build
pnpm preview
```

## Hospedar

Publique o conteúdo da pasta `build` em qualquer host estático com HTTPS, por exemplo:

- GitHub Pages;
- Cloudflare Pages;
- Netlify;
- Vercel;
- nginx, Caddy ou outro servidor de arquivos.

Configuração de build em todos os casos:

- comando: `pnpm build`
- diretório publicado: `build`
- fallback/SPA: `index.html`

### Tipos MIME

Sirva `.wasm` como `application/wasm`. O importador de pacotes Anki compila SQLite em WebAssembly; um MIME errado faz o navegador recusar o módulo.

### CSP

O app já sai com a política em `<meta>` (ver `SECURITY.md`), então funciona sem configuração extra. Se preferir enviá-la como header, remova a `<meta>` de `build/index.html` no deploy e configure no servidor:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; img-src 'self' data: blob:; frame-ancestors 'none'" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
```

`frame-ancestors` só tem efeito como header.

## Atualizações

O service worker mantém o app shell em cache. Após publicar uma nova versão, o usuário recebe a atualização na próxima visita.

## IA

O provider de IA é configurado pelo usuário no próprio navegador. A chave fica armazenada somente naquele dispositivo e não existe backend do KaadoNeuro para recebê-la.

## Backup

A página **Tutorial** explica o formato de importação. O backup completo está disponível nas funções de importação e exportação da interface.

## Limites do modelo

- Os dados pertencem ao navegador do usuário; limpar os dados do site apaga o conteúdo.
- Não há sincronização entre dispositivos nem backend de conta.
- Para transferir dados, use o backup em JSON ou o link de compartilhamento de um baralho.
