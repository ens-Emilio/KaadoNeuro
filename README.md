# KaadoNeuro (MVP)

Um aplicativo de Flashcards PWA (Progressive Web App) focado em eficiência e simplicidade, utilizando o algoritmo de repetição espaçada SM-2 para otimizar o aprendizado.

## 🚀 Visão Geral

O **KaadoNeuro** é uma aplicação **Local-First**, o que significa que todos os seus dados (baralhos, cartões e progresso) são armazenados localmente no seu navegador (`localStorage`). Não há necessidade de login ou conexão constante com a internet para estudar.

### Funcionalidades Principais

-   **Algoritmo SM-2**: Implementação fiel do algoritmo SuperMemo 2 para calcular os intervalos ideais de revisão.
-   **Organização em Baralhos**: Crie múltiplos baralhos para separar seus tópicos de estudo.
-   **Sistema de Importação**: Adicione cartões em massa via arquivos JSON ou texto/markdown simples.
-   **Gamificação**: Acompanhe seu progresso diário com o contador de "Streak" (dias consecutivos).
-   **Estatísticas**: Visualize o volume de estudos e a qualidade das suas revisões.
-   **PWA**: Instale no seu dispositivo (celular ou desktop) e estude offline.
-   **Interface Moderna**: Design limpo e responsivo com temas claro/escuro (baseado no sistema/Tailwind).

## 🛠️ Stack Tecnológico

-   **Frontend**: [Svelte 5](https://svelte.dev/) + [SvelteKit](https://kit.svelte.dev/)
-   **Estilização**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn-svelte](https://www.shadcn-svelte.com/)
-   **Persistência**: `svelte-local-storage-store` (Armazenamento local persistente e reativo)
-   **Ícones**: Lucide Icons
-   **i18n**: Paraglide JS (Configurado para expansão futura)

## 📂 Estrutura do Projeto

```
src/
├── lib/
│   ├── components/     # Componentes de UI reutilizáveis (botões, cards, inputs)
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
    *   **Intervalo**: Dias até a próxima revisão.
    *   **Fator de Facilidade (EF)**: Ajusta o quão rápido o intervalo cresce.
    *   **Repetições**: Contagem de acertos consecutivos.

## 📦 Instalação e Execução

Pré-requisitos: Node.js (v18+) e gerenciador de pacotes (npm, yarn ou pnpm).

1.  **Instale as dependências**:
    ```bash
    yarn install
    # ou
    npm install
    ```

2.  **Inicie o servidor de desenvolvimento**:
    ```bash
    yarn dev
    # ou
    npm run dev
    ```

3.  **Build para produção**:
    ```bash
    yarn build
    ```

## 📤 Importação de Cartões

Na tela de edição de baralho, você pode importar arquivos:

**Formato JSON (.json):**
```json
[
  { "front": "Pergunta", "back": "Resposta" },
  { "front": "Termo", "back": "Definição" }
]
```

**Formato Texto/Markdown (.txt, .md):**
```markdown
# Pergunta ou Frente do Cartão
Conteúdo da resposta ou verso.
Pode ter múltiplas linhas.
---
# Próxima Pergunta
Próxima resposta.
```

---
*Desenvolvido por **ens-Emilio** com foco em performance e simplicidade.*
