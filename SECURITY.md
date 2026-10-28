# Segurança

## Modelo

O KaadoNeuro é uma aplicação estática/local-first. Não há servidor da aplicação, banco remoto, contas ou backend de IA.

- baralhos, cartões e progresso ficam no armazenamento do navegador;
- a chave de IA é usada diretamente pelo navegador para chamar o provider escolhido;
- não envie uma chave de IA em um site hospedado por terceiros sem confiar no operador e no host.

## Cofre local de credenciais

A chave de IA e a senha WebDAV são guardadas em um cofre protegido por frase-senha:

- formato atual: `enc:v3:sal.iv.ciphertext`;
- derivação: PBKDF2-SHA-256, 310.000 iterações e salt aleatório de 16 bytes;
- cifra: AES-256-GCM com IV aleatório de 12 bytes;
- a frase-senha nunca é persistida;
- a chave derivada existe somente na memória do módulo;
- o cofre bloqueia após 15 minutos sem atividade ou pelo botão **Bloquear agora**;
- uma recarga da página exige nova frase-senha;
- os formulários não recuperam o segredo salvo; para substituir uma credencial, basta digitá-la novamente.

Valores antigos `enc:v1` e `enc:v2` usavam outra chave e não podem ser migrados sem a chave anterior. A interface sinaliza o formato legado e pede a credencial uma vez; o próximo salvamento grava `enc:v3`.

## Limite de segurança

O cofre fecha o acesso às credenciais em repouso sem a frase-senha. Enquanto estiver desbloqueado, código JavaScript comprometido na mesma origem ainda pode solicitar uma operação autorizada. O CSP reduz a superfície de ataque, mas não elimina esse risco.

### Content Security Policy

A política sai em dois lugares, e ambos precisam concordar:

- `src/hooks.server.ts` define o header em `dev` e `preview`;
- `src/app.html` define a mesma política como `<meta>`, porque o build estático servido por nginx, Caddy ou equivalente não passa por hook nenhum.

Diretivas relevantes:

- `script-src` inclui `'wasm-unsafe-eval'`, exigido pelo `sql.js` que lê pacotes `.apkg`. Isso habilita compilação WebAssembly, não `eval` de JavaScript.
- `connect-src` aceita `https:` e `localhost`/`127.0.0.1`, porque um provider compatível com OpenAI é configurado pelo usuário e o cliente exige HTTPS fora do loopback.
- `frame-ancestors` só vale como header; no `<meta>` ele é ignorado pelo navegador, então `X-Frame-Options` continua sendo a proteção efetiva ali.

Se você publica o `build/` atrás de um servidor, prefira remover o `<meta>` e enviar a política como header, onde todas as diretivas valem.

O contrato opcional `SecretProvider` em `src/lib/secret-vault.ts` permite que uma futura casca desktop guarde e use o segredo fora da página:

- o processo nativo acessa Keychain (macOS), Credential Manager (Windows) ou libsecret (Linux);
- o processo da página recebe apenas o resultado da operação, como listar modelos, testar conexão ou gerar cartões;
- a API key e a senha WebDAV nunca atravessam a bridge para a página.

O projeto atual é um SPA com `@sveltejs/adapter-static`; essa proteção só se torna efetiva quando existir uma aplicação desktop que implemente o contrato e distribua assinada e atualizada.

## Reportar vulnerabilidades

Não abra uma issue pública com detalhes exploráveis. Envie ao mantenedor um relatório privado com versão/commit, passos de reprodução, impacto e mitigação sugerida.

## Recomendações

- hospede por HTTPS;
- mantenha o navegador atualizado;
- faça backup dos dados;
- revogue qualquer chave de IA que possa ter sido exposta;
- limpar os dados do site remove todos os dados locais, incluindo o cofre;
- depois de limpar os dados do site, crie um novo cofre e reinsira as credenciais.
