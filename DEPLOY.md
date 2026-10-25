# Hospedagem

O KaadoNeuro é um site estático e local-first. Não exige servidor de aplicação nem banco de dados remoto.

## Rodar no PC do usuário

```bash
npm ci
npm run dev
```

Para gerar a versão instalável:

```bash
npm run build
npm run preview
```

## Hospedar

Publique o conteúdo da pasta `build` em qualquer host estático com HTTPS, por exemplo:

- GitHub Pages;
- Cloudflare Pages;
- Netlify;
- Vercel;
- nginx, Caddy ou outro servidor de arquivos.

Configuração de build em todos os casos:

- comando: `npm run build`
- diretório publicado: `build`
- fallback/SPA: `index.html`

## Atualizações

O service worker mantém os arquivos em cache. Após publicar uma nova versão, o usuário recebe a atualização na próxima visita.

## IA

O provider de IA é configurado pelo usuário no próprio navegador. A chave fica armazenada somente naquele dispositivo e não existe backend do KaadoNeuro para recebê-la.

## Backup

A página **Tutorial** explica o formato de importação. O backup completo está disponível nas funções de importação e exportação da interface.

## Limites do modelo

- Os dados pertencem ao navegador do usuário; limpar os dados do site apaga o conteúdo.
- Não há sincronização entre dispositivos.
- Para transferir dados, use o backup em JSON.