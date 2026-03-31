# Inti.mate — Novas Features Propostas

> Gerado em 2026-03-31 após auditoria completa do projeto.
> Prioridade: P0 (crítico) > P1 (alto) > P2 (médio) > P3 (nice-to-have)

---

## P0 — Funcionalidades Ausentes que Impedem o Lançamento

### 1. Sistema de Autenticação Completo (Web)
- [ ] AuthContext/Provider com React Context + localStorage
- [ ] Middleware de rota protegida (redirect para /login se não autenticado)
- [ ] Layout de dashboard com sidebar/nav e auth guard
- [ ] Página de "Esqueci minha senha" com fluxo de reset
- [ ] Página de verificação de email (/verify-email?token=xxx)
- **Impacto:** Sem isso, qualquer pessoa acessa páginas financeiras.

### 2. Testes Automatizados
- [ ] Testes unitários dos services da API (Jest + mocks de Prisma)
- [ ] Testes de integração dos controllers (supertest)
- [ ] Testes E2E do fluxo de registro → login → assinatura
- [ ] Cobertura mínima de 60% antes do deploy
- **Impacto:** Sem testes, cada deploy é um risco.

### 3. Seed de Dados e Migrations
- [ ] Criar `packages/database/src/seed.ts` com dados de demo
- [ ] Script de migration automática no CI e docker
- [ ] Dados de exemplo: 3 criadores, 5 fãs, planos, conteúdos

### 4. Webhook com Validação de Assinatura
- [ ] Validar HMAC signature dos webhooks Pagar.me
- [ ] Validar Stripe webhook signature (`stripe-signature` header)
- [ ] Retornar 400 se assinatura inválida

---

## P1 — Features de Alto Valor para MVP

### 5. Chat em Tempo Real (WebSocket)
- [ ] Implementar WebSocket gateway (NestJS `@WebSocketGateway`)
- [ ] Eventos: `message:new`, `message:read`, `typing`
- [ ] Substituir polling por WebSocket no LivePlayer (super chats)
- [ ] Fallback para polling em browsers sem WebSocket

### 6. Upload de Conteúdo (Frontend)
- [ ] Componente de upload com drag-and-drop
- [ ] Preview de imagem/vídeo antes do envio
- [ ] Barra de progresso com upload multipart para S3
- [ ] Integração com moderação automática (retorno de status)

### 7. Player de Vídeo HLS
- [ ] Integrar hls.js para reprodução de vídeos processados
- [ ] Controle de qualidade adaptativo
- [ ] Preview/teaser público com marca d'água
- [ ] Player seguro que impede download direto

### 8. Notificações Push Reais
- [ ] Instalar e configurar `web-push`
- [ ] Service Worker para receber push notifications
- [ ] UI de permissão de notificações no primeiro acesso
- [ ] Integrar com endpoint existente de PushSubscription

### 9. Dashboard do Criador
- [ ] Visão geral: assinantes, receita, conteúdos
- [ ] Gráficos de evolução (receita por dia/semana/mês)
- [ ] Gerenciamento de planos (criar, editar, desativar)
- [ ] Gerenciamento de conteúdo (galeria, status de moderação)

### 10. Integração LiveKit para Lives
- [ ] Instalar `@livekit/components-react` e `livekit-server-sdk`
- [ ] Criar sala LiveKit ao iniciar live
- [ ] Token JWT para host e viewers
- [ ] UI de live com chat integrado
- [ ] Configurações de LIVEKIT_* no .env

---

## P2 — Features de Diferenciação

### 11. PWA (Progressive Web App)
- [ ] Manifest.json com ícones e tema
- [ ] Service Worker para cache offline de assets estáticos
- [ ] Banner "Instalar app" em dispositivos móveis
- [ ] Funcionalidade offline básica (ver conteúdo já carregado)

### 12. Dark/Light Mode
- [ ] Toggle de tema no header
- [ ] Persistir preferência em localStorage
- [ ] CSS variables para cores do tema
- [ ] Respeitar `prefers-color-scheme` do sistema

### 13. Internacionalização (i18n)
- [ ] Instalar `next-intl` ou `react-i18next`
- [ ] Arquivos de tradução: pt-BR, en-US, es
- [ ] Seletor de idioma no footer
- [ ] Tradução de emails transacionais

### 14. Sistema de Busca Completo
- [ ] Página /search com filtros (categoria, preço, localização)
- [ ] Autocomplete com debounce
- [ ] Integração Elasticsearch (já configurado no docker)
- [ ] Indexação automática de criadores no ES

### 15. Sistema de Reviews/Avaliações
- [ ] Modelo `Review` no Prisma (rating 1-5, texto, creatorId, fanId)
- [ ] Apenas assinantes ativos podem avaliar
- [ ] Média de avaliação no perfil público do criador
- [ ] Moderação de reviews ofensivas

### 16. Stories Interativos
- [ ] Enquetes em stories (modelo `StoryPoll` com opções)
- [ ] Perguntas abertas (Q&A stories)
- [ ] Countdown/Timer para eventos
- [ ] Swipe gestures no mobile

---

## P3 — Inovação e Escalabilidade

### 17. Gamificação Avançada
- [ ] Sistema de XP e níveis para fãs
- [ ] Badges por engajamento (comentários, super chats, tempo de assinatura)
- [ ] Leaderboard público de fãs mais engajados por criador
- [ ] Recompensas desbloqueáveis (conteúdo exclusivo, desconto)

### 18. Analytics Avançado para Criadores
- [ ] Heatmap de horários com mais engajamento
- [ ] Análise de retenção de assinantes (churn rate)
- [ ] Comparativo com médias da plataforma
- [ ] Sugestões de melhores horários para postar

### 19. Sistema de Denúncias e Moderação Comunitária
- [ ] Botão "Denunciar" em conteúdo, perfil e mensagens
- [ ] Fila de moderação com painel admin
- [ ] Moderação por IA (classificação de texto/imagem)
- [ ] Dashboard de moderação com métricas

### 20. API Pública para Integrações
- [ ] API REST documentada com rate limiting
- [ ] OAuth2 para apps de terceiros
- [ ] Webhooks para eventos (novo assinante, nova compra)
- [ ] SDK JavaScript para integração em sites externos

---

## Métricas de Sucesso Sugeridas

| Métrica | Meta MVP | Meta 6 meses |
|---------|----------|--------------|
| Criadores ativos | 50 | 500 |
| Assinantes pagantes | 500 | 10.000 |
| GMV mensal | R$ 25.000 | R$ 500.000 |
| Taxa de churn | < 15% | < 10% |
| Uptime | 99% | 99.9% |
| Cobertura de testes | 60% | 80% |
