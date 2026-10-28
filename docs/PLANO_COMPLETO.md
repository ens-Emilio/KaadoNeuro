# Plano Completo de Evolução — KaadoNeuro

Este documento consolida os dois planos de implementação definidos para o projeto: as melhorias de base (code review inicial) e as 10 novas features solicitadas posteriormente.

---

## Parte 1: Melhorias de Base e Qualidade (Concluído)

Estas tarefas foram executadas para estabilizar o projeto antes de adicionar novas funcionalidades.

| #   | Tarefa                            | Status       | Descrição                                                                                                               |
| --- | --------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Validação Zod nos Stores          | ✅ Concluído | Adição de schemas Zod em `storage-schema.ts` e integração em `stores.ts` com migração silenciosa de dados corrompidos.  |
| 2   | Correção de Streak (Fuso Local)   | ✅ Concluído | Ajuste no cálculo de streak para usar fuso horário local em vez de UTC, evitando quebras após 21h.                      |
| 3   | Extração de Lógica de Review      | ✅ Concluído | Criação de `src/lib/review-session.ts` com lógica pura e testes unitários; componente Svelte agora apenas orquestra UI. |
| 4   | Testes SM-2 + Import Parser       | ✅ Concluído | Cobertura unitária completa para algoritmo SM-2 e parser de importação (`sm2.test.ts`, `import.test.ts`).               |
| 5   | Export/Import Completo (Snapshot) | ✅ Concluído | Módulo `backup.ts` com validação Zod (`SnapshotSchema`) e UI integrada na página de tutorial.                           |
| 6   | Limite de Sessão de Review        | ✅ Concluído | Configuração de limite de cards por sessão (padrão 50) com botão "Continuar" ao atingir o teto.                         |
| 7   | Otimização de Stats               | ✅ Concluído | Criação de `stats-store.ts` com store derivado cacheado para evitar recálculos pesados a cada render.                   |
| 8   | Onboarding Automático             | ✅ Concluído | Redirecionamento automático para `/tutorial` quando não há decks; streak visível na home.                               |

---

## Parte 2: Novas Features (Plano de 10 Itens)

Plano técnico detalhado para expansão do produto, organizado em fases sequenciais.

### Fase 1: Base & Dados

_Dependências fundamentais para as demais features._

| #   | Feature                    | Arquivos Afetados                                                  | Detalhes Técnicos                                                                                             | Critério de Aceite                                      |
| --- | -------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | **Tags e Filtros**         | `types.ts`, `storage-schema.ts`, `stores.ts`, novo `tags-store.ts` | Adicionar `tags: string[]` em Flashcard; store derivado `allTags`; UI de chips no editor e filtros na review. | Tags persistem; filtro cruza decks; typecheck passa.    |
| 4   | **Markdown/Rich Text**     | Novo `markdown-renderer.svelte`, editor de cards                   | Instalar `marked`; renderizar front/back como HTML sanitizado; preview no editor.                             | Markdown renderiza; XSS bloqueado; toggle preview/edit. |
| 6   | **Import/Export Granular** | Novo `deck-export.ts`, editar deck page                            | `exportDeck(id)` gera JSON do deck; `importDeck(json)` restaura sem duplicar IDs.                             | Round-trip funciona; arquivo válido.                    |

### Fase 2: Experiência de Review

_Melhorias diretas na sessão de estudo._

| #   | Feature            | Arquivos Afetados                      | Detalhes Técnicos                                                                      | Critério de Aceite                                 |
| --- | ------------------ | -------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 2   | **Modo Pomodoro**  | Novo `pomodoro.ts`, editar review page | Store `pomodoroState` (work/break/paused); timer 25/5min; pausa automática.            | Timer preciso; break obrigatório após 4 ciclos.    |
| 3   | **Revisão Rápida** | Nova rota `review/quick/+page.svelte`  | Agrega dueCards de todos os decks; usa `processReviewLogic`; filtro opcional por tags. | Cards misturados; limite respeitado; stats contam. |

### Fase 3: Engajamento & Visual

_Retenção e polimento visual._

| #   | Feature                  | Arquivos Afetados                        | Detalhes Técnicos                                                              | Critério de Aceite                                         |
| --- | ------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 5   | **Gamificação Leve**     | Novo `gamification-store.ts`, home/stats | Derivar XP (10pts/review, 50pts/streak) e nível (sqrt(xp/100)); badge na home. | XP acumula; level sobe auto; persiste.                     |
| 7   | **Dark Mode Automático** | `layout.css`, novo `theme-store.ts`      | CSS vars + `prefers-color-scheme` media query + toggle manual persistido.      | Auto-detect funciona; toggle sobrescreve; transição suave. |

### Fase 4: Avançado / Integrações

_Diferencial técnico e portabilidade._

| #   | Feature                  | Arquivos Afetados                       | Detalhes Técnicos                                                                     | Critério de Aceite                        |
| --- | ------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------- |
| 8   | **OCR/Imagem na IA**     | `ai/types.ts`, `prompt.ts`, settings/ai | Estender input com `imageBase64?`; adaptar prompt multimodal; upload com preview.     | Imagem enviada à API; fallback graceful.  |
| 9   | **Sync Remoto (WebDAV)** | Novo `sync-webdav.ts`, settings UI      | Config URL/user/pass (cofre); sync auto/manual usando backup.ts; merge por timestamp. | Upload/download OK; credenciais seguras.  |
| 10  | **Anki Export**          | Novo `anki-export.ts`, deck page        | Gerar `.apkg` ou CSV compatível; mapear campos SM-2 → Anki.                           | Abre no Anki Desktop; mantém tags/campos. |

---

## Ordem de Execução Recomendada

```
Fase 1 (1 → 4 → 6) → Fase 2 (2 → 3) → Fase 3 (5 → 7) → Fase 4 (8 → 9 → 10)
```

Cada feature deve ser implementada como unidade independente com testes passando antes de prosseguir.

## Riscos Identificados

- **Feature 8 (OCR):** Depende do provider suportar multimodal. Implementar capability check antes de habilitar UI.
- **Feature 9 (WebDAV):** CORS pode bloquear chamadas diretas do browser. Pode precisar de proxy serverless ou extensão CORS.
- **Feature 10 (Anki):** Formato .apkg é SQLite zipado. Biblioteca JS pura pode ser limitada; alternativa segura é exportar CSV compatível primeiro.

## Estado da Entrega — v1.0.0

| #   | Feature                | Estado                                                                       |
| --- | ---------------------- | ---------------------------------------------------------------------------- |
| 1   | Tags e Filtros         | Entregue                                                                     |
| 2   | Modo Pomodoro          | Entregue (`pomodoro.ts`, `pomodoro-store.ts`)                                |
| 3   | Revisão Rápida         | Entregue (`/review/quick`)                                                   |
| 4   | Markdown/Rich Text     | Entregue (`marked` + `dompurify` + KaTeX)                                    |
| 5   | Gamificação Leve       | Entregue (`gamification-store.ts`)                                           |
| 6   | Import/Export Granular | Entregue (`deck-export.ts`, `deck-share.ts`)                                 |
| 7   | Dark Mode Automático   | Entregue (`theme-store.ts`, toggle manual)                                   |
| 8   | OCR/Imagem na IA       | Não entregue                                                                 |
| 9   | Sync Remoto (WebDAV)   | Entregue (`sync-webdav.ts`, `/settings/sync`, cofre)                         |
| 10  | Anki Export            | Entregue como CSV (`anki-export.ts`) e importação `.apkg` (`apkg-import.ts`) |

Fora do plano original e entregue na mesma versão: cofre de credenciais com PBKDF2/AES-GCM, CSP, compartilhamento de baralho por link, leitura em voz alta (TTS), cloze, badges de app e limite de sessão.

O modo Pomodoro existe como store e UI de foco; não há bloqueio obrigatório de pausa a cada quatro ciclos.

---

_Documento gerado automaticamente pelo Vynex Forge em 2026-10-28; estado de entrega atualizado na v1.0.0._
