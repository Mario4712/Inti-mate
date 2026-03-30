# Inti.mate

Plataforma full-stack de criadores de conteúdo adulto com monetização avançada, IA e conformidade legal.

---

## Índice

- [Visão geral](#visão-geral)
- [Stack tecnológica](#stack-tecnológica)
- [Estrutura do monorepo](#estrutura-do-monorepo)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e configuração](#instalação-e-configuração)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [Executando em desenvolvimento](#executando-em-desenvolvimento)
- [Módulos da API](#módulos-da-api)
- [Arquitetura](#arquitetura)
- [Conformidade e segurança](#conformidade-e-segurança)
- [Decisões técnicas relevantes](#decisões-técnicas-relevantes)

---

## Visão geral

Inti.mate é um monorepo com três aplicações:

| App | Tecnologia | Descrição |
|-----|-----------|-----------|
| `apps/api` | NestJS 10 + TypeScript | API REST com Swagger |
| `apps/web` | Next.js 14 App Router | Frontend com ISR e SSR |
| `apps/mobile` | Expo 51 + React Native | App iOS e Android |

**48 funcionalidades** implementadas em 10 blocos incrementais, incluindo:
- Autenticação JWT + 2FA TOTP
- Assinaturas recorrentes (Pagar.me + Stripe)
- Upload de mídia com HLS multi-bitrate (FFmpeg)
- Detecção de CSAM (PhotoDNA em produção, SHA-256 em dev)
- AI Persona via Claude Haiku, AI Avatar (LoRA), geração de conteúdo por IA
- Pagamentos em cripto (BTC/USDC/USDT)
- Conteúdo VR 180°/360° com WebXR
- Conformidade LGPD completa

---

## Stack tecnológica

### Backend (`apps/api`)
- **Framework**: NestJS 10 com TypeScript strict
- **ORM**: Prisma 5 + PostgreSQL 16
- **Cache / Sessions**: Redis 7
- **Busca**: Elasticsearch 8 (fallback automático para PostgreSQL)
- **Armazenamento**: MinIO / Cloudflare R2 via AWS S3 SDK v3
- **Vídeo**: FFmpeg — HLS multi-bitrate (360p / 720p / 1080p)
- **Streaming ao vivo**: LiveKit (WebRTC)
- **IA**: Anthropic Claude Haiku (AI Persona), Replicate/RunPod LoRA (AI Avatar, stub)
- **Pagamentos**: Pagar.me (PIX/boleto/cartão BR) + Stripe (internacional)
- **Push notifications**: Web Push (VAPID)
- **Jobs agendados**: `@nestjs/schedule` com `@Cron`
- **Validação**: `class-validator` + `class-transformer`
- **Documentação**: Swagger/OpenAPI via `@nestjs/swagger`

### Frontend (`apps/web`)
- **Framework**: Next.js 14 — App Router, Server Components, ISR
- **Estilo**: TailwindCSS 3
- **VR/AR**: A-Frame 1.5 (WebXR) carregado dinamicamente
- **SEO**: `generateMetadata`, JSON-LD schema.org, sitemap dinâmico, robots.ts

### Mobile (`apps/mobile`)
- **Framework**: Expo 51 + Expo Router (file-based routing)
- **Biometria**: `expo-local-authentication` (Face ID / impressão digital)
- **Push nativas**: `expo-notifications` → APNs (iOS) + FCM (Android)
- **Armazenamento seguro**: `expo-secure-store` (tokens JWT)
- **Offline**: `expo-file-system` — cache LRU de teasers (50 slots)

### Infraestrutura
- **Monorepo**: pnpm workspaces + Turborepo
- **Containerização**: Docker Compose (dev)

---

## Estrutura do monorepo

```
inti-mate/
├── apps/
│   ├── api/                        # NestJS API
│   │   └── src/
│   │       ├── affiliates/         # Programa de afiliados multinível (L1=20%, L2=5%)
│   │       ├── ai-avatar/          # AI Avatar (LoRA, treinamento, gerações)
│   │       ├── ai-persona/         # AI Persona (Claude Haiku, FAQ cache)
│   │       ├── analytics/          # Dashboard de métricas do criador
│   │       ├── auctions/           # Leilões de conteúdo exclusivo
│   │       ├── auth/               # JWT, refresh rotation, 2FA TOTP
│   │       ├── collab/             # Collab match + contratos digitais (OTP duplo)
│   │       ├── common/             # Database, Redis, guards, interceptors
│   │       ├── config/             # app.config.ts (registerAs)
│   │       ├── content/            # Upload de mídia, HLS, moderação
│   │       ├── content-gen/        # Geração de conteúdo por IA (SDXL stub)
│   │       ├── crypto-payments/    # Pagamentos BTC/USDC/USDT
│   │       ├── digital-items/      # Itens digitais e custom requests
│   │       ├── edit-suggestions/   # Edição colaborativa fã-criador
│   │       ├── lives/              # Lives WebRTC, super chats, toys
│   │       ├── location/           # Matches por região (opt-in LGPD)
│   │       ├── messages/           # Chat privado com cursor pagination
│   │       ├── moderation/         # Fila de moderação, CSAM check
│   │       ├── notifications/      # Web Push + email (SMTP)
│   │       ├── payments/           # Pagar.me + Stripe webhooks
│   │       ├── recommendations/    # Collaborative filtering + content-based
│   │       ├── referrals/          # Programa de referral + streak + badges
│   │       ├── scheduler/          # Agendamento de posts sociais
│   │       ├── search/             # Elasticsearch + fallback PostgreSQL
│   │       ├── stories/            # Stories efêmeros (24h, @Cron expiry)
│   │       ├── subscriptions/      # Planos recorrentes por criador
│   │       ├── support/            # Chatbot + escalação para ticket
│   │       ├── tips/               # Gorjetas com leaderboard público
│   │       ├── tournaments/        # Torneios com prize pool real
│   │       ├── toys/               # Integração toys interativos (consentimento/sessão)
│   │       ├── users/              # Perfis, KYC, LGPD data export
│   │       ├── verified-tier/      # Acesso verificado premium
│   │       ├── vr-content/         # Conteúdo VR 180°/360° multi-qualidade
│   │       └── withdrawals/        # Saques D+14 via PIX/TED
│   │
│   ├── web/                        # Next.js 14
│   │   └── src/
│   │       ├── app/                # App Router (layouts, pages, sitemap, robots)
│   │       ├── components/
│   │       │   ├── live/           # LivePlayer, SuperChat UI
│   │       │   ├── toys/           # ToyControlWidget
│   │       │   ├── upsell/         # UpsellModal (exit intent, post-purchase)
│   │       │   └── vr/             # VrPlayer (A-Frame / WebXR)
│   │       └── lib/
│   │           └── api-server.ts   # fetch SSR com ISR (revalidate)
│   │
│   └── mobile/                     # Expo / React Native
│       ├── app/
│       │   ├── (auth)/             # login.tsx, register.tsx
│       │   └── (tabs)/             # index, discover, messages, profile
│       └── src/lib/
│           ├── api.ts              # axios + refresh interceptor automático
│           ├── auth.ts             # biometria, SecureStore, tokens
│           ├── notifications.ts    # Expo Push (APNs + FCM)
│           └── offline.ts          # cache LRU de teasers (FileSystem)
│
└── packages/
    └── database/
        └── prisma/
            └── schema.prisma       # 54 models, 35 enums, ~1.400 linhas
```

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|-----------|--------------|
| Node.js | 20.x |
| pnpm | 9.x |
| Docker + Docker Compose | 24.x |
| FFmpeg | 6.x (no PATH) |

---

## Instalação e configuração

```bash
# 1. Clonar o repositório
git clone https://github.com/seu-usuario/inti-mate.git
cd inti-mate

# 2. Instalar dependências (todos os workspaces)
pnpm install

# 3. Copiar variáveis de ambiente
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local

# 4. Subir infraestrutura local
#    (PostgreSQL 16, Redis 7, MinIO, Elasticsearch 8, MailHog)
docker compose up -d

# 5. Aplicar migrations e rodar seed
pnpm db:migrate
pnpm db:seed
```

---

## Variáveis de ambiente

### `apps/api/.env.local`

```env
# Aplicação
NODE_ENV=development
PORT=3001

# Banco de dados
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/intimate

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# S3 / MinIO (dev)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET_MEDIA=media
S3_BUCKET_KYC=kyc-documents
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
CDN_BASE_URL=http://localhost:9000/media

# SMTP (MailHog em dev)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=Inti.mate <noreply@inti.mate>

# KYC
KYC_PROVIDER=mock          # mock | unico

# CSAM
CSAM_PROVIDER=local        # local | photodna
PHOTODNA_API_KEY=

# 2FA TOTP
TOTP_APP_NAME=Inti.mate

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=

# Web Push (VAPID) — gerar com web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Anthropic (AI Persona)
ANTHROPIC_API_KEY=sk-ant-...

# LiveKit
LIVEKIT_HOST=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret

# Pagamentos
PAGARME_API_KEY=sk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URL do frontend (para links em emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
API_INTERNAL_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### `apps/mobile/.env`

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
```

---

## Banco de dados

O schema Prisma (`packages/database/prisma/schema.prisma`) contém **54 models** e **35 enums**.

### Comandos

```bash
# Aplicar migrations em desenvolvimento
pnpm db:migrate

# Gerar Prisma Client após mudanças no schema
pnpm --filter @inti-mate/database generate

# Abrir Prisma Studio (UI de inspeção)
pnpm --filter @inti-mate/database studio

# Resetar banco (apaga todos os dados)
pnpm --filter @inti-mate/database reset
```

### Principais grupos de models

| Grupo | Models |
|-------|--------|
| **Usuários** | User, UserProfile, Session, AgeVerification, ConsentRecord, DataDeletionRequest |
| **Monetização** | CreatorPlan, Subscription, PpvContent, PpvPurchase, Transaction, CreatorBalance, Withdrawal |
| **Conteúdo** | Media, Story, StoryView, VrContent |
| **Comunicação** | Conversation, Message, Notification, NotificationPreference, PushSubscription |
| **Gamificação** | UserStreak, StreakBadge, ReferralCode, Referral |
| **Lives** | LiveSession, SuperChat, Auction, AuctionBid, ToySession, ToyControl |
| **Afiliados** | Affiliate, AffiliateCommission |
| **Social** | ScheduledPost |
| **IA** | AiPersona, AiPersonaMessage, AiAvatar, AiAvatarGeneration, ContentGenJob |
| **Collab** | CollabMatch, CollabContract |
| **Torneios** | Tournament, TournamentEntry |
| **Edição colaborativa** | EditSuggestion |
| **Expansão** | CryptoTransaction, UserLocation |
| **Outros** | ModerationLog, Tip, DigitalItem, DigitalOrder, SubscriptionSlotConfig, VerifiedTierAccess |

---

## Executando em desenvolvimento

```bash
# Rodar todas as apps simultaneamente (Turborepo)
pnpm dev

# Ou individualmente:
pnpm --filter @inti-mate/api dev        # API em :3001
pnpm --filter @inti-mate/web dev        # Web em :3000
pnpm --filter @inti-mate/mobile dev     # Expo (QR code no terminal)
```

### Swagger / OpenAPI

Com a API rodando: `http://localhost:3001/api/docs`

---

## Módulos da API

### Autenticação (`/auth`)
- `POST /auth/register` — cadastro com email + username
- `POST /auth/login` — retorna `accessToken` (15min) + `refreshToken` (7d)
- `POST /auth/refresh` — rotação de refresh token (Redis blacklist)
- `POST /auth/logout` — invalida refresh token
- `POST /auth/2fa/setup` / `/auth/2fa/verify` — TOTP com QR code
- `POST /auth/2fa/disable` — desativa 2FA com confirmação OTP

### Usuários (`/users`)
- Perfil público por username com ISR no Next.js (revalidate: 300s)
- KYC: declaração (consumidor) e documento + selfie (criador)
- LGPD: `GET /users/me/data-export`, `POST /users/me/deletion-request` (30 dias)

### Conteúdo (`/content`)
- Upload multipart → CSAM check → moderação → FFmpeg HLS async
- Três bitrates: 360p / 720p / 1080p
- URLs pre-assinadas S3 privadas (expiração configurável)
- Visibilidade: `PUBLIC` | `SUBSCRIBERS` | `PPV`

### Pagamentos (`/payments`)
- Pagar.me: PIX, boleto, cartão de crédito
- Stripe: cartão internacional
- Webhooks idempotentes para ambos os gateways
- Split automático 80/20 (criador/plataforma)

### Assinaturas (`/subscriptions`)
- Múltiplos planos por criador (mensal/anual)
- Slot config com desconto para primeiros N assinantes
- Win-back automático: `@Cron` detecta churn e envia campanha

### Lives (`/lives`)
- Token LiveKit gerado por assinante verificado
- Super Chats com 5 tiers de cor e `pinnedUntil`
- Leilões com lance mínimo e fechamento automático `@Cron(EVERY_MINUTE)`
- Toys interativos: intensidade/duração com consentimento explícito por sessão

### IA (`/ai-persona`, `/ai-avatar`, `/content-gen`)
- **AI Persona**: Claude Haiku, FAQ sem chamada à API, `AI_DISCLAIMER` em 100% das respostas, 50 mensagens/fã/dia
- **AI Avatar**: upload 50–200 fotos + áudio, consentimento documentado, treinamento LoRA (Replicate stub), CSAM obrigatório no output, limite diário configurável
- **Content Gen**: fundos/efeitos/cenas via SDXL (stub), 20 jobs/dia, moderação obrigatória no output

### Torneios (`/tournaments`)
- Métricas: `NEW_SUBSCRIBERS` | `REVENUE` | `CONTENT_VIEWS`
- Prize pool com distribuição percentual configurável (padrão 50/30/20%)
- Leaderboard em tempo real; encerramento e pagamento automáticos `@Cron`

### Recomendações (`/recommendations`)
- Collaborative filtering (60%) + content-based por tags/categoria (40%)
- Diversificação: máx. 65% de um `reasonCode`
- `GET /recommendations/explain/:creatorId` — transparência de recomendação

### VR (`/vr-content`)
- Formatos: `VR180` | `VR360`; stereo: `top-bottom` | `side-by-side`
- Qualidades: 2K (assinantes) / 4K (PPV ou premium) / 8K (Verified Tier)
- URLs pre-assinadas 2h; player WebXR A-Frame no browser

### Cripto (`/crypto-payments`)
- Aceita: **BTC, USDC, USDT** — Monero bloqueado por compliance AML
- KYC escalonado: < R\$2k/mês = email+wallet; ≥ R\$2k/mês = KYC DOCUMENT obrigatório
- Expiração automática (BTC 30min, USDC/USDT 15min) via `@Cron`
- Webhook idempotente (Coinbase Commerce / BTCPay Server)

### Localização (`/location`)
- Opt-in explícito com `ConsentRecord` (`DATA_PROCESSING`, LGPD Art. 7 I)
- Armazena **apenas cidade + estado** (nunca coordenadas GPS)
- Retenção 30 dias; purge automático `@Cron(EVERY_DAY_AT_MIDNIGHT)`
- `GET /location/creators-nearby` filtra por **estado** (não cidade) para preservar privacidade

### Collab (`/collab`)
- Sugestões baseadas em sobreposição de audiência (assinantes em comum)
- Mutual accept obrigatório (`INVITED` → `ACCEPTED`)
- Contratos com dupla assinatura OTP; `DRAFT` → `PENDING_SIGNATURES` → `SIGNED`

### Edição colaborativa (`/edit-suggestions`)
- Tipos: `cut` | `caption` | `soundtrack`
- Fã precisa ser assinante ativo; máx. 10 sugestões pendentes por criador
- Criador aceita + define `revenueSharePct` (0–50%) ou rejeita

---

## Arquitetura

### Fluxo de upload de vídeo

```
Cliente → POST /content/upload (multipart)
  → CSAM check (PhotoDNA / SHA-256 local)
  → Salva Media com status PENDING_REVIEW
  → Upload original para S3 (bucket privado)
  → FFmpeg async: 360p/720p/1080p → HLS manifests
  → ModerationLog criado para revisão
  → Media.status = APPROVED (após moderação)
  → URLs pre-assinadas geradas por request (expiração configurável)
```

### Sistema de recomendações

```
GET /recommendations
  ├── collaborativeScore()
  │     → assinantes do viewer → usuários similares → creators não assinados
  │     → score = frequência / maxFreq (normalizado 0–1)
  │
  ├── contentBasedScore()
  │     → categoria preferida do viewer → creators na mesma categoria
  │     → score = 0.3 + (overlap_tags / total_tags) * 0.4
  │
  ├── mergeScores()  — collaborative 60%, content-based 40%
  ├── diversify()    — máx. 65% de um reasonCode
  └── profileMap()   — busca perfis em batch
```

### Autenticação e sessão

```
Login
  → accessToken  (JWT HS256, 15min, stateless)
  → refreshToken (JWT HS256, 7d, armazenado no Redis com TTL)

Refresh
  → valida no Redis → verifica blacklist → rotação → novo par

Logout
  → adiciona refresh ao blacklist Redis (TTL = tempo restante)

2FA TOTP
  → speakeasy gera secret → QR code base64 → usuário escaneia
  → verify: janela de 30s ± 1 token de tolerância
```

### Split de pagamentos

```
Assinatura de R$ 100,00
  ├── Pagar.me / Stripe webhook: PAYMENT_AUTHORIZED
  ├── Transaction: grossAmount=10000, platformFee=2000, netAmount=8000
  ├── CreatorBalance.availableAmount += 8000 centavos
  └── Saque D+14 via PIX/TED → CreatorBalance.availableAmount -= valor
```

---

## Conformidade e segurança

| Requisito | Implementação |
|-----------|--------------|
| **CSAM** | PhotoDNA (prod) / SHA-256 local (dev) — obrigatório antes de qualquer upload |
| **LGPD Art. 7** | `ConsentRecord` com `type`, `version`, `accepted: true` |
| **LGPD Art. 18** | `GET /users/me/data-export` + `POST /users/me/deletion-request` (30 dias) |
| **Verificação de idade** | `AgeVerification` — declaração (consumidor) + documento + selfie (criador) |
| **IA identificada** | `AI_DISCLAIMER` obrigatório em 100% das respostas de AI Persona |
| **Avatar IA** | Consentimento documentado com timestamp + texto exato antes do treinamento |
| **Cripto AML** | KYC escalonado por volume mensal; Monero bloqueado explicitamente |
| **Localização** | Só cidade/estado; retenção 30 dias; purge automático; filtro por estado no discovery |
| **Contratos collab** | Dupla assinatura OTP; status `SIGNED` é imutável |
| **Saídas de IA (content-gen)** | CSAM check + moderação antes de disponibilizar qualquer output |
| **Rate limiting** | `ThrottlerGuard` global (100 req/60s por IP) + restrito para auth (10 req/60s) |
| **JWT Blacklist** | Refresh tokens invalidados no Redis após logout ou rotação |
| **Dados sensíveis** | CPF: `cpfHash` (SHA-256 para deduplicação) + `cpfEncrypted` (AES para consulta interna) |

---

## Decisões técnicas relevantes

### Relações nomeadas no Prisma
O model `Subscription` tem duas relações com `User`. O Prisma exige nomes explícitos:
```prisma
subscriptions   Subscription[] @relation("CreatorSubscriptions")
mySubscriptions Subscription[] @relation("SubscriberSubscriptions")
```
Todas as queries usam `mySubscriptions` para acessar as assinaturas do usuário como assinante.

### Representação de valores monetários
- **Centavos (Int)**: `CreatorBalance.availableAmount/pendingAmount`, `Transaction.grossAmount/platformFee/netAmount`, `Tip.amountCents` (gorjetas)
- **Decimal BRL**: `Tournament.prizePoolBRL`, `TournamentEntry.prizeBRL`, `Tip.amount/netAmount`
- Nunca misturar as duas representações na mesma operação.

### Elasticsearch com fallback automático
Todas as queries ao Elasticsearch estão em `try/catch`. Em caso de indisponibilidade, o `SearchService` usa automaticamente PostgreSQL `ILIKE` como fallback, sem erro para o cliente.

### AI Persona — otimização de custo
O FAQ é verificado antes de qualquer chamada à API Anthropic. Respostas de FAQ têm latência < 5ms e custo zero. Apenas perguntas sem match no FAQ chegam ao Claude Haiku.

### Modo offline no mobile
Apenas teasers são cacheados offline (nunca conteúdo pago completo). O cache usa LRU com limite de 50 itens no `FileSystem.cacheDirectory` do Expo — o SO pode limpar automaticamente quando precisar de espaço.

### CollabMatch — status canônico
O par `(creatorAId, creatorBId)` é sempre ordenado lexicograficamente antes de qualquer query ou insert, garantindo unicidade sem duplicatas simétricas. Status válidos: `PENDING → INVITED → ACCEPTED` (ou `REJECTED`/`CANCELLED`).

### VR — acesso por tier
| Tier | Qualidade máxima |
|------|----------------|
| Assinante regular | 2K |
| PPV / plano premium | 4K |
| Verified Tier | 8K |

URLs pre-assinadas expiram em 2h para evitar compartilhamento.
