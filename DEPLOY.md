# Hospedagem Gratuita do KaadoNeuro

O projeto está configurado para ser hospedado no **Netlify**, que oferece um plano gratuito excelente, suporte nativo ao SvelteKit e HTTPS automático.

## Opção 1: Via GitHub/GitLab (Recomendado)

Sempre que você der `git push`, o site atualizará automaticamente.

1.  Crie um repositório no [GitHub](https://github.com/new).
2.  Envie seu código:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/SEU_USUARIO/NOVO_REPO.git
    git push -u origin main
    ```
3.  Acesse [app.netlify.com](https://app.netlify.com/).
4.  Clique em **"Add new site"** -> **"Import an existing project"**.
5.  Selecione **GitHub** e escolha o repositório que você criou.
6.  O Netlify detectará as configurações automaticamente. Clique em **"Deploy site"**.

## Opção 2: Manual (Drag & Drop)

Se não quiser usar Git agora:

1.  No seu terminal, gere a pasta de build:
    ```bash
    npm run build
    ```
    *(Certifique-se que o `svelte.config.js` está usando `adapter-static` para gerar uma pasta `build` completa, ou use a CLI do Netlify para deploy manual)*.

    **Nota:** Como estamos usando `@sveltejs/adapter-netlify`, a opção 1 é muito melhor. A opção 2 requer instalar a CLI do Netlify: `npm install netlify-cli -g` e rodar `netlify deploy --prod`.

## Configurações Adicionais (Opcional)

Se o deploy falhar ou você quiser mudar algo, verifique:

-   **Build command**: `npm run build`
-   **Publish directory**: `build` (ou `.netlify` dependendo da versão do adaptador, mas o padrão costuma funcionar).

O arquivo `netlify.toml` na raiz já contém as configurações ideais para cache e PWA.
