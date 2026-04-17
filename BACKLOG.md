# Backlog de Desenvolvimento — Inti-mate

> Última atualização: 2026-04-12
> Branch de trabalho: `feat/missing-features`
> Legenda: ✅ Completo · 🔧 Incompleto · ❌ Faltando

---

## Estado atual do MVP

O núcleo da plataforma está funcional: autenticação, assinaturas, conteúdo, pagamentos, saque PIX, lives, mensagens, denúncias e painel admin. O que segue é o que falta ou precisa de polish para o produto estar completo.

---

## Itens por prioridade crescente (menor → maior complexidade)

### #1 — Featured Creators (Discovery)
**Complexidade: Baixa**

- **Problema:** `recommendations.service.ts` tem TODO sobre campo `featured` inexistente no schema `UserProfile`.
- **O que fazer:**
  - Adicionar campo `featured Boolean @default(false)` em `UserProfile` no schema
  - Criar migration
  - Expor endpoint admin `PATCH /admin/users/:id/feature` para marcar/desmarcar
  - Corrigir `RecommendationsService.getFeatured()` para usar o campo real
  - Validar que a página `/discover` já consome o endpoint (se não, ajustar)

---

### #2 — Story Browsing (página /stories)
**Complexidade: Baixa**

- **Problema:** Stories têm backend completo (`StoriesModule`) mas não há página no frontend para o usuário navegar stories de quem segue/assina.
- **O que fazer:**
  - Criar `apps/web/src/app/(home)/stories/page.tsx` — grid de avatares com indicador de story novo
  - Criar `apps/web/src/app/(home)/stories/[storyId]/page.tsx` — viewer com barra de progresso, auto-avanço, tap para próximo
  - Chamar `GET /v1/stories/feed` para listar stories disponíveis
  - Chamar `POST /v1/stories/:id/view` ao assistir

---

### #3 — Edit Suggestions (frontend completo)
**Complexidade: Baixa-Média**

- **Problema:** Backend existe (`edit-suggestions` controller/service), sem nenhuma página no frontend.
- **O que fazer:**
  - Criar `apps/web/src/app/(dashboard)/dashboard/edit-suggestions/page.tsx` — lista de sugestões recebidas por fãs
  - Ações: aceitar (`PATCH /v1/edit-suggestions/:id/accept`) ou rejeitar (`PATCH /v1/edit-suggestions/:id/reject`)
  - Para fãs: formulário de sugestão na página de conteúdo `/content/[mediaId]`

---

### #4 — Verified Tier (UI de gestão)
**Complexidade: Baixa-Média**

- **Problema:** API existe (`verified-tier` controller) mas não há tela para o criador gerenciar o acesso nem para o admin revogar/conceder.
- **O que fazer:**
  - Criar `apps/web/src/app/(dashboard)/dashboard/verified-tier/page.tsx` — status, botão de solicitar/revogar, benefícios
  - Adicionar seção no painel admin `apps/web/src/app/(admin)/admin/verified-tier/page.tsx` — listar solicitações, aprovar/revogar
  - Adicionar endpoint admin `PATCH /admin/verified-tier/:userId/approve` e `/revoke` no `AdminController`

---

### #5 — Tournaments (frontend completo)
**Complexidade: Média**

- **Problema:** Backend completo (controller + service com leaderboard), sem nenhuma página no frontend.
- **O que fazer:**
  - Criar `apps/web/src/app/(home)/tournaments/page.tsx` — lista de torneios ativos/próximos
  - Criar `apps/web/src/app/(home)/tournaments/[tournamentId]/page.tsx` — detalhe com leaderboard em tempo real, botão de inscrição
  - Criar `apps/web/src/app/(dashboard)/dashboard/tournaments/page.tsx` — torneios do criador, resultado, prêmios ganhos
  - Adicionar link no nav de `/dashboard` e `/home`

---

### #6 — Social Scheduler (UI completa)
**Complexidade: Média**

- **Problema:** Backend completo (`SchedulerController` com POST/PATCH/GET/suggest/report) mas sem nenhuma página no frontend.
- **O que fazer:**
  - Criar `apps/web/src/app/(dashboard)/dashboard/scheduler/page.tsx`:
    - Calendário/lista de posts agendados
    - Formulário para agendar novo post (plataforma, legenda, mídia, data/hora)
    - Botão de cancelar post
    - Aba de relatório de cliques/conversões por plataforma
    - Aba de sugestão de melhores horários (`GET /v1/scheduler/suggest`)

---

### #7 — Content Generation (UI)
**Complexidade: Média**

- **Problema:** Backend com jobs de geração por IA existe (`ContentGenController`) mas sem UI para o criador usar.
- **O que fazer:**
  - Criar `apps/web/src/app/(dashboard)/dashboard/content-gen/page.tsx`:
    - Formulário de prompt + tipo de job (background / effect / scene)
    - Upload opcional de mídia base
    - Lista de jobs com status (PENDING / PROCESSING / DONE / FAILED)
    - Preview do output quando concluído
    - Botão de usar output como novo conteúdo

---

### #8 — Push Notifications (frontend)
**Complexidade: Média**

- **Problema:** Backend de push (`NotificationsModule`) está completo com `PushSubscription` no schema, mas o frontend não solicita permissão nem registra o service worker.
- **O que fazer:**
  - Criar `apps/web/public/sw.js` — service worker para receber push
  - Criar hook `usePushNotifications` que pede permissão e chama `POST /v1/notifications/push/subscribe`
  - Integrar o hook no layout principal após login
  - Chamar `DELETE /v1/notifications/push/unsubscribe` nas configurações

---

### #9 — AI Chat History / Archive (UI)
**Complexidade: Média**

- **Problema:** AI Persona chat funciona (`/creator/[username]/ai-chat`) mas não há tela para o usuário ver histórico de conversas anteriores com personas.
- **O que fazer:**
  - Criar `apps/web/src/app/(home)/ai-chats/page.tsx` — lista de conversas com personas (agrupadas por criador)
  - Reutilizar a UI de chat existente ao navegar para uma conversa específica
  - Adicionar paginação de mensagens no chat existente (`GET /v1/ai-persona/:personaId/messages?page=N`)
  - Adicionar link no menu principal

---

### #10 — VR Content (frontend completo)
**Complexidade: Alta**

- **Problema:** Backend VR completo (attach, list, WebXR config, access URL por qualidade), sem nenhuma página no frontend.
- **O que fazer:**
  - Criar `apps/web/src/app/(home)/vr/page.tsx` — galeria de conteúdos VR disponíveis
  - Criar `apps/web/src/app/(home)/vr/[mediaId]/page.tsx` — player WebXR com A-Frame:
    - Detectar capacidade VR do dispositivo
    - Carregar config via `GET /v1/vr-content/:mediaId/webxr-config`
    - Obter URL via `GET /v1/vr-content/:mediaId/access/:quality`
    - Suporte a VR180 e VR360, modos top-bottom e side-by-side
  - Para criadores: formulário de upload VR em `/dashboard/content` (botão "Adicionar metadados VR")
  - Adicionar `a-frame` como dependência no `apps/web`

---

## Resumo de progresso

| # | Feature | Backend | Frontend | Prioridade |
|---|---------|---------|----------|------------|
| 1 | Featured Creators | ✅ | ✅ | Baixa |
| 2 | Story Browsing | ✅ | ✅ | Baixa |
| 3 | Edit Suggestions | ✅ | ✅ | Baixa-Média |
| 4 | Verified Tier UI | ✅ | ✅ | Baixa-Média |
| 5 | Tournaments | ✅ | ✅ | Média |
| 6 | Social Scheduler | ✅ | ✅ | Média |
| 7 | Content Generation UI | ✅ | ✅ | Média |
| 8 | Push Notifications | ✅ | ✅ | Média |
| 9 | AI Chat History | ✅ | ✅ | Média |
| 10 | VR Content | ✅ | ✅ | Alta |
