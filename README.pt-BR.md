# KaadoNeuro

[English](README.md) | Português | [Español](README.es.md)

Aplicativo PWA de flashcards focado em simplicidade, com repetição espaçada SM-2 e funcionamento local-first.

## 🚀 Visão Geral

O **KaadoNeuro** é uma aplicação **Local-First**, o que significa que todos os seus dados (baralhos, cartões e progresso) são armazenados localmente no seu navegador (`localStorage`). Não há necessidade de login ou conexão constante com a internet para estudar.

### Funcionalidades Principais

- **Algoritmo SM-2**: Implementação fiel do algoritmo SuperMemo 2 para calcular os intervalos ideais de revisão.
- **Organização em Baralhos**: Crie múltiplos baralhos para separar seus tópicos de estudo.
- **Importação Flexível**: Adicione cartões em massa via arquivo (JSON, Markdown, TXT ou pacote Anki `.apkg`) ou cole o texto diretamente.
- **Gamificação**: Acompanhe seu progresso diário com o contador de "Streak" (dias consecutivos) e saudações dinâmicas (Bom dia/tarde/noite).
- **Estatísticas**: Visualize o volume de estudos e a qualidade das suas revisões.
- **PWA Completo**: Instale no seu dispositivo (celular ou desktop) e estude totalmente offline.
- **Interface editorial**: temas claro e escuro, 13 idiomas e layout responsivo.
- **IA opcional**: conecte seu próprio provider no navegador.
- **Backup**: exportação e importação completas pelo próprio app.

## 🛠️ Stack Tecnológico

- **Frontend**: [Svelte 5](https://svelte.dev/) + [SvelteKit](https://kit.svelte.dev/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn-svelte](https://www.shadcn-svelte.com/)
- **Persistência**: armazenamento local no dispositivo
- **Distribuição**: build estático, PWA instalável e qualquer hospedagem de arquivos
- **Ícones**: Lucide Icons
- **Hospedagem**: qualquer host estático, ou execução local

## 📂 Estrutura do Projeto

```text
src/
├── lib/
│   ├── ai/              # Presets de providers, prompts, validação e cliente no navegador
│   ├── components/      # Componentes reutilizáveis de UI e IA
│   ├── i18n/            # Nomes dos idiomas e metadados RTL
│   ├── backup.ts        # Backup e restauração completos em JSON
│   ├── sm2.ts           # Algoritmo SM-2
│   ├── stores.ts        # Baralhos, cartões e histórico local
│   └── types.ts         # Tipos TypeScript
├── routes/
│   ├── +page.svelte
│   ├── decks/[id]/+page.svelte
│   ├── review/[deckId]/+page.svelte
│   ├── review/quick/+page.svelte
│   ├── settings/ai/+page.svelte
│   ├── settings/sync/+page.svelte
│   ├── stats/+page.svelte
│   └── tutorial/+page.svelte
└── service-worker.ts
```

## 📦 Instalação e Execução

Pré-requisitos: Node.js **22.12 ou superior** (o projeto foi validado em Node 24) e **pnpm 10**.

O repositório mantém apenas `pnpm-lock.yaml`; `npm install` e `yarn install` não reproduzem o conjunto de dependências testado.

```bash
corepack enable
pnpm install
pnpm dev
```

Abra a URL local exibida pelo Vite.

## Build de produção

```bash
pnpm build
pnpm preview
```

O site estático é gerado em `build/`.

Para executar as verificações:

```bash
pnpm check
pnpm test:unit -- --run
```

## Hospedagem

Publique o conteúdo de `build/` em qualquer host estático com HTTPS, como GitHub Pages, Cloudflare Pages, Netlify, Vercel, nginx ou Caddy.

A arquitetura atual não exige VPS, servidor de aplicação, PostgreSQL, backend de contas ou serviço de cobrança.

Consulte [DEPLOY.md](DEPLOY.md) para os detalhes de hospedagem.

## 📤 Importação de Cartões

Dentro de um baralho, clique em **Importar** e use uma destas opções:

1. **Arquivo**: selecione `.json`, `.md`, `.txt` ou um pacote Anki `.apkg`. Um `.apkg` traz o nome do baralho, o texto dos campos (HTML convertido) e as tags; notas sem verso são ignoradas e o total aparece na prévia.
2. **Texto**: cole o conteúdo diretamente.

Formato Markdown:

```markdown
# Pergunta

Resposta.
Pode ocupar várias linhas.
---

# Outra pergunta

Outra resposta.
```

Formato JSON:

```json
[
	{ "front": "Pergunta", "back": "Resposta" },
	{ "front": "Termo", "back": "Definição" }
]
```

O importador exibe uma prévia antes de salvar.

## Configuração de IA

Acesse **IA** na navegação principal ou `/settings/ai`.

Providers disponíveis:

- Anthropic
- OpenAI
- Google Gemini
- OpenRouter
- Endpoints compatíveis com OpenAI

A requisição é feita diretamente pelo navegador. A chave fica no armazenamento local deste dispositivo e só é enviada ao provider escolhido. Não informe uma chave em um site cujo operador ou host você não confia.

O fluxo de geração mostra uma prévia editável. Nenhum baralho ou cartão é salvo antes da confirmação em **Aplicar**.

Limites:

- até 30 cartões por lote;
- até 12.000 caracteres de contexto por geração;
- respostas em formato JSON são validadas antes de aparecerem.

## Backup e privacidade

- Os dados locais pertencem ao perfil atual do navegador e à origem do site.
- Limpar os dados do site remove baralhos, cartões e configurações.
- Use **Tutorial → Backup** para exportar ou importar um arquivo JSON completo.
- Não há recuperação de conta nem sincronização entre dispositivos.
- Os prompts são enviados somente ao provider configurado pelo usuário.

## Testes e verificações

```bash
pnpm test:unit -- --run
pnpm test:e2e
pnpm check
pnpm build
```

## Licença

O código usa a [Licença Apache 2.0](LICENSE). Consulte [NOTICE](NOTICE) para atribuição e a política de marca.

---

Desenvolvido por **ens-Emilio** com foco em performance e simplicidade.
