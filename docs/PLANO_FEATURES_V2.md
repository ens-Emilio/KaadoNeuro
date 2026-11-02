# Plano de Implementação — KaadoNeuro v2.0

Este documento organiza as 20 novas features sugeridas em fases sequenciais, respeitando a arquitetura local-first/PWA/open-source do projeto. Cada fase deve ser concluída com testes passando antes de iniciar a próxima.

---

## Fase 1: Gaps Documentados e Estabilidade (Prioridade Alta)

Features já identificadas como pendências ou riscos no plano v1.0.0.

| #   | Feature                               | Arquivos Afetados                                              | Detalhes Técnicos                                                                                 | Critério de Aceite                                                             |
| --- | ------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | **Pomodoro com bloqueio estrito**     | `src/lib/pomodoro.ts`, `pomodoro-store.ts`                     | Adicionar lógica de bloqueio obrigatório após 4 ciclos; UI de countdown durante pausa forçada.    | Timer bloqueia review após 4º ciclo; não há bypass sem completar pausa.        |
| 2   | **OCR/Imagem na IA**                  | `src/lib/ai/prompt.ts`, `types.ts`, `settings/ai/+page.svelte` | Upload base64 + capability check do provider; prompt multimodal condicional.                      | Imagem enviada apenas se provider suportar; fallback graceful para texto puro. |
| 3   | **Sync WebDAV bidirecional real**     | `src/lib/sync-webdav.ts`, `settings/sync/+page.svelte`         | Merge por timestamp com detecção de conflitos; UI de resolução manual quando timestamps divergem. | Conflitos detectados e apresentados ao usuário; sem perda silenciosa de dados. |
| 4   | **Validação de integridade de dados** | `src/lib/backup.ts`, `sync-webdav.ts`                          | Checksum SHA-256 no snapshot JSON; verificação antes de restore/sync.                             | Backup corrompido rejeitado com erro claro; checksum válido passa.             |

---

## Fase 2: Algoritmo e Aprendizado

Melhorias no core de repetição espaçada e geração de conteúdo.

| #   | Feature                          | Arquivos Afetados                                      | Detalhes Técnicos                                                                                                        | Critério de Aceite                                                                                |
| --- | -------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 5   | **FSRS-5 como opção**            | Novo `src/lib/fsrs.ts`, `types.ts`, deck editor        | Implementar FSRS-5 em módulo separado; toggle `algorithm: 'sm2' \| 'fsrs'` em Deck; migração segura de cards existentes. | Cards revisados com FSRS-5 produzem intervalos distintos do SM-2; toggle persiste.                |
| 6   | **Gerador de Cloze via IA**      | `src/lib/ai/prompt.ts`, `ai-generate-dialog.svelte`    | Prompt específico para extrair múltiplos clozes de texto longo; preview editável antes de salvar.                        | ≥1 cloze gerado por parágrafo relevante; usuário pode editar/remover antes de aplicar.            |
| 7   | **Revisão antecipada (Overdue)** | `src/lib/review-session.ts`, `review-runner.svelte.ts` | Filtro "cards vencidos" independente da data; não altera intervalo SM-2/FSRS.                                            | Cards overdue aparecem em sessão dedicada; intervalo original preservado após review.             |
| 8   | **Importação CSV genérico**      | Novo `src/lib/csv-import.ts`, import UI                | Parser com mapeamento configurável de colunas (front/back/tags); preview antes de salvar.                                | CSV arbitrário importado corretamente após mapeamento; erros de parsing reportados linha a linha. |

---

## Fase 3: UX e Acessibilidade

Polimento de interação e conformidade com padrões de acessibilidade.

| #   | Feature                          | Arquivos Afetados                                                | Detalhes Técnicos                                                                | Critério de Aceite                                                      |
| --- | -------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 9   | **Atalhos de teclado completos** | `src/lib/components/review-card.svelte`, `+page.svelte` (review) | 1-4 para qualidade, espaço para virar, E para editar; documentar em `/tutorial`. | Navegação completa sem mouse; atalhos não conflitam com browser/OS.     |
| 10  | **Acessibilidade WCAG AA**       | Múltiplos componentes, `e2e/review-a11y.test.ts`                 | Audit completo: contraste ≥4.5:1, labels ARIA, focus visible, skip links.        | Axe-core passa sem violações críticas; screen reader navega todo fluxo. |
| 11  | **Font-size ajustável**          | Novo `src/lib/font-size-store.ts`, layout.css                    | Escala global (80%-150%) via CSS custom property; persistido em localStorage.    | Texto escala uniformemente; layout não quebra em 150%.                  |
| 12  | **Preview Markdown split-view**  | Editor de cards, `markdown-renderer.svelte`                      | Toggle lado-a-lado ou split vertical; sync scroll entre editor e preview.        | Preview atualiza em tempo real; edição não perde foco ao alternar.      |

---

## Fase 4: Dados e Portabilidade

Expansão de formatos e resiliência de dados.

| #   | Feature                         | Arquivos Afetados                                | Detalhes Técnicos                                                                             | Critério de Aceite                                                                   |
| --- | ------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 13  | **Export .apkg nativo**         | Novo `src/lib/apkg-export.ts`, deck page         | Gerar SQLite zipado via WASM (reusando infra do `apkg-import.ts`); mapear campos SM-2 → Anki. | Arquivo abre no Anki Desktop 2.1+; tags e clozes preservados.                        |
| 14  | **Backup automático periódico** | `service-worker.ts`, novo `auto-backup-store.ts` | Trigger silencioso a cada N dias (configurável); download automático do snapshot JSON.        | Backup baixa automaticamente; usuário pode desativar; não bloqueia UI.               |
| 15  | **Decks aninhados / Subdecks**  | `types.ts`, `stores.ts`, home/deck pages         | `parentId?: string` em Deck; UI de árvore com drag-and-drop; filtros herdam hierarquia.       | Subdecks renderizam indentados; mover deck atualiza filhos; busca cruza níveis.      |
| 16  | **Modo escuro por horário**     | `theme-store.ts`, settings UI                    | Schedule manual (hora início/fim) além de `prefers-color-scheme`; persistido.                 | Tema muda automaticamente no horário configurado; override manual respeita schedule. |

---

## Fase 5: Engajamento e Extensibilidade

Retenção de usuários e abertura para comunidade.

| #   | Feature                       | Arquivos Afetados                   | Detalhes Técnicos                                                                                         | Critério de Aceite                                                                 |
| --- | ----------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 17  | **Badges desbloqueáveis**     | `gamification-store.ts`, home/stats | Marcos reais (1000 reviews, 30 dias streak, 10 decks); notificação toast ao desbloquear.                  | Badge aparece após marco atingido; persiste entre sessões; lista visível em stats. |
| 18  | **Feedback háptico refinado** | `haptics.ts`, review-card.svelte    | Padrões distintos: vibração curta (acerto), longa (erro), dupla (fim sessão); toggle global.              | Haptics diferenciados por evento; respeita `navigator.vibrate` availability.       |
| 19  | **Estatísticas preditivas**   | `stats-store.ts`, stats page        | Curva de esquecimento individual; estimativa de "data de domínio" por deck/card.                          | Previsão baseada em dados reais do usuário; disclaimer de precisão visível.        |
| 20  | **Plugin system (hooks)**     | Novo `src/lib/plugins/`, types.ts   | API mínima de hooks (`onCardSave`, `onReviewComplete`, `customExport`); dynamic import de módulos locais. | Plugin carregado sem rebuild; hooks executam na ordem registrada; erros isolados.  |

---

## Ordem de Execução Recomendada

```
Fase 1 (1→2→3→4) → Fase 2 (5→6→7→8) → Fase 3 (9→10→11→12) → Fase 4 (13→14→15→16) → Fase 5 (17→18→19→20)
```

Cada feature é unidade independente com testes unitários/e2e passando antes de prosseguir. Features dentro da mesma fase podem ser paralelizadas se não compartilharem arquivos.

## Riscos e Mitigações

| Risco                                       | Mitigação                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| FSRS-5 incompatível com histórico SM-2      | Migração one-way com backup automático antes da troca; manter SM-2 como fallback perpétuo.           |
| Export .apkg WASM aumenta bundle size       | Lazy-load do módulo WASM apenas na ação de export; medir impacto no LCP.                             |
| Plugin system introduz superfície de ataque | Sandboxing via iframe ou Worker; whitelist de hooks permitidos; assinatura opcional.                 |
| Backup automático consome storage/bandwidth | Limite de retenção (últimos 3 backups); compressão gzip do JSON; opt-in explícito.                   |
| Decks aninhados quebram queries planas      | Store derivado `flatDecks` para compatibilidade retroativa; migração silenciosa de dados existentes. |

## Estado Atual

Todas as 20 features foram **implementadas e verificadas** em 2026-10-29.

| Fase                             | Features | Status       | Testes   |
| -------------------------------- | -------- | ------------ | -------- |
| 1: Gaps & Estabilidade           | #1–#4    | ✅ Concluído | Passando |
| 2: Algoritmo & Aprendizado       | #5–#8    | ✅ Concluído | Passando |
| 3: UX & Acessibilidade           | #9–#12   | ✅ Concluído | Passando |
| 4: Dados & Portabilidade         | #13–#16  | ✅ Concluído | Passando |
| 5: Engajamento & Extensibilidade | #17–#20  | ✅ Concluído | Passando |

Total: 279 testes unitários passando em 28 arquivos de teste. Typecheck limpo nos arquivos modificados (erros pré-existentes em `src/routes/decks/[id]/+page.svelte` não relacionados).

### Arquivos Criados/Modificados por Fase

**Fase 1:** `pomodoro.ts`, `pomodoro-store.ts`, `ai/prompt.ts`, `ai/vision.ts`, `sync-conflict.ts`, `backup.ts`, `snapshot-schema.ts`
**Fase 2:** `fsrs.ts`, `ai/cloze-prompt.ts`, `review-session.ts` (overdue), `csv-import.ts`
**Fase 3:** `review-runner.svelte.ts` (shortcuts), `font-size-store.ts`, `markdown-renderer.svelte` (split-view), a11y audit fixes
**Fase 4:** `apkg-export.ts`, `auto-backup-store.ts`, `types.ts` (parentId), `theme-store.ts` (schedule)
**Fase 5:** `gamification-store.ts`, `haptics.ts`, `stats-predictive.ts`, `plugin-api.ts`, `plugin-loader.ts`

---

_Documento criado em 2026-10-28 como complemento ao PLANO_COMPLETO.md (v1.0.0)._
