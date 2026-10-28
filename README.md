# KaadoNeuro

Português | [English](README.en.md) | [Español](README.es.md)

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

```
src/
├── lib/
│   ├── components/     # Componentes de UI reutilizáveis (botões, cards, inputs, dialogs)
│   ├── sm2.ts          # Lógica do algoritmo de repetição espaçada (SM-2)
│   ├── stores.ts       # Gerenciamento de estado global e persistência (Decks, Cards, Logs)
│   ├── types.ts        # Definições de tipos TypeScript (Flashcard, Deck, ReviewLog)
│   └── utils.ts        # Funções utilitárias
├── routes/
│   ├── +page.svelte           # Dashboard (Lista de baralhos, Streak, Resumo)
│   ├── decks/[id]/+page.svelte # Editor de Baralho (Adicionar/Remover/Importar cartões)
│   ├── review/[deckId]/+page.svelte # Interface de Estudo (Frente/Verso, Avaliação)
│   └── stats/+page.svelte      # Página de Estatísticas
└── service-worker.ts   # Configuração PWA para funcionamento offline
```

## 🧠 Como Funciona o Algoritmo SM-2

O arquivo `src/lib/sm2.ts` contém a lógica central. Quando você revisa um cartão:

1.  Você avalia sua memória de 0 (Apagão) a 5 (Perfeito).
2.  O algoritmo calcula:
    - **Intervalo**: Dias até a próxima revisão.
    - **Fator de Facilidade (EF)**: Ajusta o quão rápido o intervalo cresce.
    - **Repetições**: Contagem de acertos consecutivos.

## 📦 Instalação e Execução

Pré-requisitos: Node.js **22.12 ou superior** (o projeto foi validado em Node 24) e **pnpm 10**.

O repositório mantém apenas `pnpm-lock.yaml`; `npm install` e `yarn install` não reproduzem o conjunto de dependências testado.

1.  **Instale as dependências**:

    ```bash
    corepack enable
    pnpm install
    ```

2.  **Inicie o servidor de desenvolvimento**:

    ```bash
    pnpm dev
    ```

3.  **Build para produção**:

    ```bash
    pnpm build
    pnpm preview
    ```

4.  **Verificações**:
    ```bash
    pnpm check
    pnpm test:unit -- --run
    ```

## 📤 Importação de Cartões

Dentro de um baralho, clique em **Importar** para abrir as opções:

### 1. Aba Arquivo

Arraste ou selecione arquivos `.json`, `.md`, `.txt` ou pacotes Anki `.apkg`. Um `.apkg` traz o nome do baralho, o texto dos campos (HTML convertido) e as tags; notas sem verso são ignoradas e o total é informado na prévia.

### 2. Aba Texto

Cole seu conteúdo diretamente. Ideal para notas rápidas ou copiar/colar do ChatGPT.
O importador mostra uma prévia antes de salvar.

**Formatos Aceitos:**

**Texto/Markdown (Recomendado):**
Separe os cartões com `---`. A primeira linha é a Frente, o resto é o Verso.

```markdown
# Pergunta ou Frente do Cartão

Conteúdo da resposta ou verso.
Pode ter múltiplas linhas.
---

# Próxima Pergunta

Próxima resposta.
```

**JSON:**

```json
[
	{ "front": "Pergunta", "back": "Resposta" },
	{ "front": "Termo", "back": "Definição" }
]
```

## Backup

A seção **Backup dos seus dados** no Tutorial permite exportar e importar um arquivo JSON completo. Os dados ficam no navegador atual e não há sincronização entre dispositivos.

## Configuração de IA

Acesse **IA** na navegação principal ou `/settings/ai` para conectar um provedor próprio e conferir os modelos disponíveis.

Providers disponíveis:

- Anthropic
- OpenAI
- Google Gemini
- OpenRouter
- OpenAI-compatible, com URL base própria

A requisição é feita diretamente pelo navegador. A chave fica no armazenamento local deste dispositivo e só é enviada ao provider escolhido. Não informe uma chave em um site cujo operador ou host você não confia.

O fluxo de geração mostra uma prévia editável antes de gravar. Nenhum baralho ou cartão é salvo sem confirmação.

### Limites

- até 30 cartões por lote;
- até 12.000 caracteres de contexto por geração;
- resposta em formato JSON validada antes de aparecer na prévia.

### Segurança

- a chave não entra em URL, log ou telemetria;
- providers compatíveis remotos exigem HTTPS;
- HTTP sem TLS é aceito somente em `localhost` e `127.0.0.1`.

---

_Desenvolvido por **ens-Emilio** com foco em performance e simplicidade._
