# Inti.mate

Plataforma full-stack de criadores de conteudo adulto com monetizacao avancada, IA e conformidade legal brasileira (LGPD).

---

## Indice

- [Visao geral](#visao-geral)
- [Stack tecnologica](#stack-tecnologica)
- [Estrutura do monorepo](#estrutura-do-monorepo)
- [Pre-requisitos](#pre-requisitos)
- [Guia de instalacao passo a passo](#guia-de-instalacao-passo-a-passo)
  - [1. Clonar o repositorio](#1-clonar-o-repositorio)
  - [2. Instalar ferramentas necessarias](#2-instalar-ferramentas-necessarias)
  - [3. Instalar dependencias do projeto](#3-instalar-dependencias-do-projeto)
  - [4. Configurar variaveis de ambiente](#4-configurar-variaveis-de-ambiente)
  - [5. Subir a infraestrutura com Docker](#5-subir-a-infraestrutura-com-docker)
  - [6. Configurar o banco de dados](#6-configurar-o-banco-de-dados)
  - [7. Configurar o MinIO (storage)](#7-configurar-o-minio-storage)
  - [8. Iniciar as aplicacoes](#8-iniciar-as-aplicacoes)
  - [9. Verificar que tudo funciona](#9-verificar-que-tudo-funciona)
- [Variaveis de ambiente (referencia completa)](#variaveis-de-ambiente-referencia-completa)
- [Comandos uteis](#comandos-uteis)
- [Rodando os testes](#rodando-os-testes)
- [Modulos da API](#modulos-da-api)
- [Arquitetura](#arquitetura)
  - [Fluxo de upload de conteudo](#fluxo-de-upload-de-conteudo)
  - [Dupla custodia de conteudo](#dupla-custodia-de-conteudo)
  - [Rastreabilidade de acessos](#rastreabilidade-de-acessos)
  - [Sistema de recomendacoes](#sistema-de-recomendacoes)
  - [Autenticacao e sessao](#autenticacao-e-sessao)
  - [Split de pagamentos](#split-de-pagamentos)
- [Conformidade e seguranca](#conformidade-e-seguranca)
- [Deploy em producao](#deploy-em-producao)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)
- [Decisoes tecnicas relevantes](#decisoes-tecnicas-relevantes)

---

## Visao geral

Inti.mate e um monorepo com tres aplicacoes:

| App | Tecnologia | Descricao | Porta |
|-----|-----------|-----------|-------|
| `apps/api` | NestJS 10 + TypeScript | API REST com Swagger | `:3001` |
| `apps/web` | Next.js 14 App Router | Frontend com ISR e SSR | `:3000` |
| `apps/mobile` | Expo 51 + React Native | App iOS e Android | Expo Dev Client |

**48 funcionalidades** implementadas em 10 blocos incrementais, incluindo:
- Autenticacao JWT + 2FA TOTP
- Assinaturas recorrentes (Pagar.me + Stripe)
- Upload de midia com HLS multi-bitrate (FFmpeg)
- Deteccao de CSAM (PhotoDNA em producao, SHA-256 em dev)
- Dupla custodia de conteudo (2 moderadores independentes)
- Rastreabilidade completa de acessos (IP, sessao, usuario, duracao)
- AI Persona via Claude Haiku, AI Avatar (LoRA), geracao de conteudo por IA
- Pagamentos em cripto (BTC/USDC/USDT)
- Conteudo VR 180/360 com WebXR
- Conformidade LGPD completa

---

## Stack tecnologica

### Backend (`apps/api`)
- **Framework**: NestJS 10 com TypeScript strict
- **ORM**: Prisma 5 + PostgreSQL 16
- **Cache / Sessions**: Redis 7
- **Busca**: Elasticsearch 8 (fallback automatico para PostgreSQL)
- **Armazenamento**: MinIO / Cloudflare R2 via AWS S3 SDK v3
- **Video**: FFmpeg — HLS multi-bitrate (360p / 720p / 1080p)
- **Streaming ao vivo**: LiveKit (WebRTC)
- **IA**: Anthropic Claude Haiku (AI Persona), Replicate/RunPod LoRA (AI Avatar)
- **Pagamentos**: Pagar.me (PIX/boleto/cartao BR) + Stripe (internacional)
- **Push notifications**: Web Push (VAPID)
- **Jobs agendados**: `@nestjs/schedule` com `@Cron`
- **Validacao**: `class-validator` + `class-transformer`
- **Documentacao**: Swagger/OpenAPI via `@nestjs/swagger`
- **Seguranca**: Helmet, rate limiting per-user, HMAC webhook validation

### Frontend (`apps/web`)
- **Framework**: Next.js 14 — App Router, Server Components, ISR
- **Estilo**: TailwindCSS 3
- **VR/AR**: A-Frame 1.5 (WebXR) carregado dinamicamente
- **SEO**: `generateMetadata`, JSON-LD schema.org, sitemap dinamico, robots.ts

### Mobile (`apps/mobile`)
- **Framework**: Expo 51 + Expo Router (file-based routing)
- **Biometria**: `expo-local-authentication` (Face ID / impressao digital)
- **Push nativas**: `expo-notifications` — APNs (iOS) + FCM (Android)
- **Armazenamento seguro**: `expo-secure-store` (tokens JWT)
- **Offline**: `expo-file-system` — cache LRU de teasers (50 slots)

### Infraestrutura
- **Monorepo**: pnpm workspaces + Turborepo
- **Containerizacao**: Docker Compose (dev e prod)
- **CI/CD**: GitHub Actions (lint, test, build, Docker push, deploy staging)
- **Monitoramento**: Sentry (opcional), health checks em `/health` e `/health/ready`

---

## Estrutura do monorepo

```
inti-mate/
├── .github/
│   └── workflows/
│       └── ci.yml                     # Pipeline CI/CD completo
├── apps/
│   ├── api/                           # NestJS API
│   │   └── src/
│   │       ├── auth/                  # JWT, refresh rotation, 2FA TOTP, OAuth2
│   │       ├── users/                 # Perfis, KYC, LGPD data export
│   │       ├── content/               # Upload de midia, HLS, moderacao
│   │       ├── moderation/            # CSAM check, dupla custodia, fila de revisao
│   │       ├── payments/              # Pagar.me + Stripe webhooks
│   │       ├── subscriptions/         # Planos recorrentes por criador
│   │       ├── withdrawals/           # Saques D+14 via PIX
│   │       ├── lives/                 # Lives WebRTC, super chats
│   │       ├── auctions/              # Leiloes de conteudo exclusivo
│   │       ├── messages/              # Chat privado
│   │       ├── notifications/         # Web Push + email
│   │       ├── search/                # Elasticsearch + fallback PostgreSQL
│   │       ├── analytics/             # Dashboard de metricas do criador
│   │       ├── ai-persona/            # Claude Haiku, FAQ cache
│   │       ├── ai-avatar/             # LoRA, treinamento, geracoes
│   │       ├── crypto-payments/       # BTC/USDC/USDT
│   │       ├── vr-content/            # Conteudo VR 180/360
│   │       ├── common/
│   │       │   ├── access-log/        # Rastreabilidade de acessos a conteudo
│   │       │   ├── audit/             # Auditoria financeira
│   │       │   ├── database/          # PrismaService
│   │       │   ├── dlq/               # Dead-letter queue para webhooks
│   │       │   ├── filters/           # Exception filter global
│   │       │   ├── guards/            # Rate limiting per-user
│   │       │   ├── health/            # Health checks (liveness + readiness)
│   │       │   ├── middleware/        # Request ID, structured logging
│   │       │   ├── redis/             # RedisService
│   │       │   └── sentry/            # Integracao Sentry
│   │       └── config/                # app.config.ts (registerAs)
│   │
│   ├── web/                           # Next.js 14
│   │   └── src/
│   │       ├── app/                   # App Router (layouts, pages, sitemap, robots)
│   │       ├── components/            # LivePlayer, VrPlayer, UpsellModal, etc.
│   │       └── lib/
│   │           └── api-server.ts      # fetch SSR com ISR (revalidate)
│   │
│   └── mobile/                        # Expo / React Native
│       ├── app/
│       │   ├── (auth)/                # login.tsx, register.tsx
│       │   ├── (tabs)/                # index, discover, messages, profile
│       │   ├── creator/[id].tsx       # Perfil do criador
│       │   ├── live/[id].tsx          # Viewer de live
│       │   ├── media/[id].tsx         # Viewer de midia
│       │   └── notifications.tsx      # Lista de notificacoes
│       └── src/lib/
│           ├── api.ts                 # axios + refresh interceptor automatico
│           ├── auth.ts                # biometria, SecureStore, tokens
│           ├── notifications.ts       # Expo Push (APNs + FCM)
│           └── offline.ts             # cache LRU de teasers (FileSystem)
│
├── packages/
│   └── database/
│       └── prisma/
│           └── schema.prisma          # 56 models, 37 enums
│
├── docker-compose.yml                 # Infraestrutura dev (Postgres, Redis, ES, MinIO)
├── docker-compose.prod.yml            # Config producao com resource limits
├── .env.example                       # Template de variaveis de ambiente
├── turbo.json                         # Configuracao Turborepo
└── package.json                       # Scripts root do monorepo
```

---

## Pre-requisitos

Antes de comecar, voce precisa ter instalado na sua maquina:

| Ferramenta | Versao minima | Para que serve | Como verificar |
|-----------|--------------|----------------|----------------|
| **Node.js** | 20.x | Runtime JavaScript | `node --version` |
| **pnpm** | 9.x | Gerenciador de pacotes (mais rapido que npm) | `pnpm --version` |
| **Docker Desktop** | 24.x | Roda PostgreSQL, Redis, Elasticsearch, MinIO | `docker --version` |
| **Docker Compose** | 2.x | Orquestra os containers | `docker compose version` |
| **Git** | 2.x | Controle de versao | `git --version` |
| **FFmpeg** | 6.x | Processamento de video (HLS) | `ffmpeg -version` |

### Instalacao dos pre-requisitos

**Node.js** — Baixe em https://nodejs.org/ (versao LTS 20.x ou superior). No Windows, use o instalador .msi. No Linux/Mac, use `nvm`:
```bash
# Linux/Mac com nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
```

**pnpm** — Apos instalar o Node.js:
```bash
npm install -g pnpm@9
```

**Docker Desktop** — Baixe em https://www.docker.com/products/docker-desktop/. No Windows, certifique-se de ativar o WSL2 durante a instalacao. Apos instalar, abra o Docker Desktop e espere o icone ficar verde (indicando que esta rodando).

**FFmpeg** — Necessario para processamento de video:
```bash
# Windows (com winget)
winget install FFmpeg

# Mac
brew install ffmpeg

# Linux (Ubuntu/Debian)
sudo apt update && sudo apt install ffmpeg
```

---

## Guia de instalacao passo a passo

### 1. Clonar o repositorio

```bash
git clone https://github.com/Mario4712/Inti-mate.git
cd Inti-mate
```

### 2. Instalar ferramentas necessarias

Verifique se tudo esta instalado:

```bash
node --version     # deve mostrar v20.x.x ou superior
pnpm --version     # deve mostrar 9.x.x
docker --version   # deve mostrar Docker version 24.x ou superior
ffmpeg -version    # deve mostrar ffmpeg version 6.x ou superior
```

Se algum comando falhar, volte a secao [Pre-requisitos](#pre-requisitos) e instale a ferramenta faltante.

### 3. Instalar dependencias do projeto

Na raiz do projeto (`Inti-mate/`), rode:

```bash
pnpm install
```

Isso instala as dependencias de todas as 3 aplicacoes (API, Web, Mobile) e do pacote de banco de dados. Pode levar alguns minutos na primeira vez.

### 4. Configurar variaveis de ambiente

Copie o arquivo de exemplo para criar seu arquivo local:

```bash
# Copia o template de variaveis de ambiente
cp .env.example .env
```

Agora abra o arquivo `.env` no seu editor e configure os valores. Para desenvolvimento local, a maioria dos valores padrao ja funciona. Os unicos que voce **precisa alterar** sao os segredos:

```env
# ---- OBRIGATORIO ALTERAR ----

# Segredos JWT (gere valores aleatorios com: openssl rand -hex 32)
JWT_ACCESS_SECRET=COLE_AQUI_UM_VALOR_ALEATORIO_DE_64_CARACTERES
JWT_REFRESH_SECRET=COLE_AQUI_OUTRO_VALOR_ALEATORIO_DE_64_CARACTERES

# Chave de criptografia do CPF (gere com: openssl rand -hex 16)
CPF_ENCRYPTION_KEY=COLE_AQUI_UM_VALOR_DE_32_CARACTERES

# ---- OPCIONAL (funciona sem configurar em dev) ----

# Deixe vazio para usar mocks em desenvolvimento:
# PAGARME_API_KEY=
# STRIPE_SECRET_KEY=
# ANTHROPIC_API_KEY=
# VAPID_PUBLIC_KEY=
# VAPID_PRIVATE_KEY=
```

**Gerando os segredos no terminal:**

```bash
# Linux/Mac
openssl rand -hex 32    # gera string de 64 caracteres

# Windows (PowerShell)
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })

# Ou use qualquer gerador online de strings aleatorias
```

### 5. Subir a infraestrutura com Docker

Certifique-se de que o Docker Desktop esta rodando (icone verde na barra de tarefas). Depois:

```bash
docker compose up -d
```

Isso vai baixar e iniciar 4 containers:

| Container | Porta | Descricao |
|-----------|-------|-----------|
| `intimare_postgres` | `5432` | Banco de dados PostgreSQL 16 |
| `intimare_redis` | `6379` | Cache e sessoes Redis 7 |
| `intimare_elasticsearch` | `9200` | Motor de busca Elasticsearch 8 |
| `intimare_minio` | `9000` (API) / `9001` (Console) | Storage compativel com S3 |

**Primeira vez?** As imagens Docker serao baixadas (pode levar 5-10 minutos dependendo da internet).

Verifique se todos os containers estao saudaveis:

```bash
docker compose ps
```

Todos devem mostrar `healthy` na coluna STATUS. Se algum mostrar `starting` ou `unhealthy`, espere mais 30 segundos e tente novamente.

**Problemas comuns:**
- **Porta ja em uso**: Se voce ja tem PostgreSQL/Redis rodando na maquina, pare-os primeiro ou altere as portas no `docker-compose.yml`
- **Docker nao inicia**: No Windows, verifique se o WSL2 esta habilitado. No Linux, certifique-se de que seu usuario esta no grupo `docker` (`sudo usermod -aG docker $USER`)

### 6. Configurar o banco de dados

Com os containers rodando, aplique as migrations do Prisma para criar todas as tabelas:

```bash
# Gera o Prisma Client (tipos TypeScript a partir do schema)
pnpm --filter @intimare/database db:generate

# Aplica as migrations (cria as tabelas no PostgreSQL)
pnpm --filter @intimare/database db:migrate
```

Se pedir um nome para a migration, digite algo como `init` e pressione Enter.

**(Opcional) Popular com dados de teste:**

```bash
pnpm --filter @intimare/database db:seed
```

Isso cria usuarios de teste, criadores, planos e conteudos de exemplo para facilitar o desenvolvimento.

**(Opcional) Visualizar o banco de dados:**

```bash
pnpm --filter @intimare/database db:studio
```

Abre o Prisma Studio no navegador (geralmente em `http://localhost:5555`), onde voce pode inspecionar e editar dados visualmente.

### 7. Configurar o MinIO (storage)

O MinIO simula o S3 da AWS localmente. Voce precisa criar os buckets (pastas) na primeira vez:

1. Abra o console do MinIO no navegador: **http://localhost:9001**
2. Faca login com:
   - **Username**: `minioadmin`
   - **Password**: `minioadmin`
3. Clique em **"Create Bucket"** e crie dois buckets:
   - `media` — para fotos e videos dos criadores
   - `kyc-documents` — para documentos de verificacao de identidade

**Alternativa via terminal (sem abrir o navegador):**

```bash
# Instale o cliente MinIO (mc)
# Mac: brew install minio/stable/mc
# Linux: wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc && sudo mv mc /usr/local/bin/
# Windows: winget install minio.mc

# Configure o alias
mc alias set local http://localhost:9000 minioadmin minioadmin

# Crie os buckets
mc mb local/media
mc mb local/kyc-documents
```

### 8. Iniciar as aplicacoes

Voce tem duas opcoes:

**Opcao A — Todas as aplicacoes ao mesmo tempo (recomendado):**

```bash
pnpm dev
```

Isso usa o Turborepo para iniciar API, Web e Mobile simultaneamente.

**Opcao B — Cada aplicacao separadamente (util para debug):**

Abra 3 terminais diferentes:

```bash
# Terminal 1 — API (NestJS)
pnpm --filter @intimare/api start:dev

# Terminal 2 — Web (Next.js)
pnpm --filter @intimare/web dev

# Terminal 3 — Mobile (Expo)
pnpm --filter @inti-mate/mobile dev
```

### 9. Verificar que tudo funciona

Apos iniciar, verifique cada servico:

| O que testar | URL | Resultado esperado |
|--------------|-----|--------------------|
| **API rodando** | http://localhost:3001/api/health | `{"status":"ok","timestamp":"...","uptime":...}` |
| **Swagger (documentacao)** | http://localhost:3001/api/docs | Interface Swagger com todos os endpoints |
| **Web rodando** | http://localhost:3000 | Pagina inicial do Inti.mate |
| **MinIO Console** | http://localhost:9001 | Painel do MinIO (login: minioadmin/minioadmin) |
| **Prisma Studio** | Rodar `pnpm --filter @intimare/database db:studio` | Interface visual do banco |
| **Elasticsearch** | http://localhost:9200 | JSON com informacoes do cluster |

**Para o mobile:**
Ao rodar `pnpm --filter @inti-mate/mobile dev`, o Expo mostra um QR code no terminal. Escaneie com o app **Expo Go** (disponivel na App Store / Play Store) para abrir no celular. Ou pressione `w` para abrir no navegador.

**Pronto!** Se todos os checks acima passaram, o ambiente de desenvolvimento esta configurado.

---

## Variaveis de ambiente (referencia completa)

O arquivo `.env.example` na raiz contem todas as variaveis. Aqui esta o que cada uma faz:

### Aplicacao

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| `NODE_ENV` | `development` | Ambiente: `development`, `test` ou `production` |
| `PORT` | `3001` | Porta da API |

### Banco de dados

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| `POSTGRES_USER` | `intimare` | Usuario do PostgreSQL |
| `POSTGRES_PASSWORD` | `secret` | Senha do PostgreSQL |
| `POSTGRES_DB` | `intimare_dev` | Nome do banco |
| `DATABASE_URL` | `postgresql://intimare:secret@localhost:5432/intimare_dev?schema=public&connection_limit=20&pool_timeout=10` | Connection string completa do Prisma |

### Redis

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| `REDIS_PASSWORD` | `secret` | Senha do Redis |
| `REDIS_URL` | `redis://:secret@localhost:6379` | URL de conexao |

### JWT (autenticacao)

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| `JWT_ACCESS_SECRET` | — | **OBRIGATORIO**. Segredo para tokens de acesso (min. 32 chars) |
| `JWT_REFRESH_SECRET` | — | **OBRIGATORIO**. Segredo para refresh tokens (min. 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Tempo de vida do access token |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Tempo de vida do refresh token |

### Storage (MinIO / S3)

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| `S3_ENDPOINT` | `http://localhost:9000` | URL do MinIO ou S3 |
| `S3_REGION` | `us-east-1` | Regiao S3 |
| `S3_BUCKET_MEDIA` | `media` | Bucket para fotos/videos |
| `S3_BUCKET_KYC` | `kyc-documents` | Bucket para documentos KYC |
| `S3_ACCESS_KEY` | `minioadmin` | Chave de acesso S3 |
| `S3_SECRET_KEY` | `minioadmin` | Chave secreta S3 |
| `CDN_BASE_URL` | `http://localhost:9000/media` | URL base para servir arquivos publicos |

### Email (SMTP)

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| `SMTP_HOST` | `localhost` | Servidor SMTP (MailHog em dev) |
| `SMTP_PORT` | `1025` | Porta SMTP |
| `SMTP_USER` | — | Usuario SMTP (vazio em dev) |
| `SMTP_PASS` | — | Senha SMTP (vazio em dev) |
| `SMTP_FROM` | `Inti.mate <noreply@inti.mate>` | Remetente padrao |

### Moderacao e seguranca

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| `CSAM_PROVIDER` | `local` | `local` (SHA-256 dev) ou `photodna` (producao) |
| `PHOTODNA_API_KEY` | — | Chave da API PhotoDNA (apenas producao) |
| `KYC_PROVIDER` | `mock` | `mock` (dev), `unico` ou `serpro` (producao) |
| `CPF_ENCRYPTION_KEY` | — | **OBRIGATORIO**. Chave AES-256 para criptografia de CPF |

### Elasticsearch

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| `ELASTICSEARCH_NODE` | `http://localhost:9200` | URL do Elasticsearch |
| `ELASTICSEARCH_USERNAME` | `elastic` | Usuario (apenas com xpack.security ativado) |
| `ELASTICSEARCH_PASSWORD` | — | Senha (apenas producao) |

### LiveKit (lives em tempo real)

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| `LIVEKIT_HOST` | `ws://localhost:7880` | URL do servidor LiveKit |
| `LIVEKIT_API_KEY` | — | Chave da API LiveKit (vazio = modo mock) |
| `LIVEKIT_API_SECRET` | — | Segredo da API LiveKit (vazio = modo mock) |

### Pagamentos

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| `PAGARME_API_KEY` | — | Chave da API Pagar.me (vazio = modo mock) |
| `PAGARME_WEBHOOK_SECRET` | — | Segredo para validar webhooks Pagar.me |
| `STRIPE_SECRET_KEY` | — | Chave secreta Stripe (vazio = modo mock) |
| `STRIPE_WEBHOOK_SECRET` | — | Segredo para validar webhooks Stripe |
| `CRYPTO_WEBHOOK_SECRET` | — | Segredo HMAC para webhooks crypto |

### Integracao IA

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| `ANTHROPIC_API_KEY` | — | Chave da API Anthropic para AI Persona |

### Frontend e Mobile

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | URL da API para o frontend |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | URL do frontend (para links em emails) |
| `EXPO_PUBLIC_API_URL` | `http://localhost:3001` | URL da API para o app mobile |

### Outros

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| `TOTP_APP_NAME` | `Inti.mate` | Nome exibido no app autenticador (2FA) |
| `VAPID_PUBLIC_KEY` | — | Chave publica VAPID (Web Push) |
| `VAPID_PRIVATE_KEY` | — | Chave privada VAPID (Web Push) |
| `SENTRY_DSN` | — | DSN do Sentry para monitoramento (opcional) |
| `SUPPORT_EMAIL` | `suporte@inti.mate` | Email de suporte |
| `GOOGLE_CLIENT_ID` | — | OAuth2 Google (login social) |
| `GOOGLE_CLIENT_SECRET` | — | OAuth2 Google |

---

## Comandos uteis

Todos os comandos devem ser executados na raiz do projeto.

### Desenvolvimento

```bash
# Iniciar tudo (API + Web + Mobile)
pnpm dev

# Iniciar apenas a API
pnpm --filter @intimare/api start:dev

# Iniciar apenas o Web
pnpm --filter @intimare/web dev

# Iniciar apenas o Mobile
pnpm --filter @inti-mate/mobile dev
```

### Banco de dados

```bash
# Gerar Prisma Client (necessario apos alterar schema.prisma)
pnpm --filter @intimare/database db:generate

# Criar e aplicar migrations (desenvolvimento)
pnpm --filter @intimare/database db:migrate

# Aplicar migrations existentes (producao)
pnpm --filter @intimare/database db:migrate:deploy

# Verificar status das migrations
pnpm --filter @intimare/database db:migrate:status

# Popular banco com dados de teste
pnpm --filter @intimare/database db:seed

# Abrir Prisma Studio (UI visual)
pnpm --filter @intimare/database db:studio

# Push direto no banco (sem migration, util para prototipacao rapida)
pnpm --filter @intimare/database db:push
```

### Build

```bash
# Build de todas as apps
pnpm build

# Build apenas da API
pnpm --filter @intimare/api build

# Build apenas do Web
pnpm --filter @intimare/web build
```

### Lint

```bash
# Lint de todo o monorepo
pnpm lint

# Lint apenas da API
pnpm --filter @intimare/api lint
```

### Docker

```bash
# Subir infraestrutura (Postgres, Redis, ES, MinIO)
docker compose up -d

# Ver status dos containers
docker compose ps

# Ver logs de um container especifico
docker compose logs postgres -f
docker compose logs redis -f
docker compose logs elasticsearch -f

# Parar tudo
docker compose down

# Parar e apagar volumes (CUIDADO: apaga todos os dados!)
docker compose down -v
```

---

## Rodando os testes

### Testes unitarios

```bash
# Rodar todos os testes da API
pnpm --filter @intimare/api test

# Rodar em modo watch (re-roda quando arquivos mudam)
pnpm --filter @intimare/api test:watch

# Rodar com cobertura
pnpm --filter @intimare/api test:cov

# Rodar um arquivo de teste especifico
pnpm --filter @intimare/api test -- --testPathPattern=dual-custody
```

### Testes e2e

```bash
pnpm --filter @intimare/api test:e2e
```

### O que os testes cobrem (155 testes)

| Suite | Testes | Descricao |
|-------|--------|-----------|
| `auth.service.spec.ts` | Login, registro, refresh, 2FA, logout |
| `content.service.spec.ts` | Upload, galeria, acesso, moderacao |
| `payments.service.spec.ts` | PIX, cartao, webhooks, split |
| `subscriptions.service.spec.ts` | Criacao, renovacao, cancelamento |
| `lives.service.spec.ts` | Criar live, token viewer, super chat |
| `auctions.service.spec.ts` | Lances, optimistic locking, entrega |
| `notifications.service.spec.ts` | Email, push, preferencias |
| `referrals.service.spec.ts` | Codigo, indicacao, credito |
| `csam.service.spec.ts` | Scan, report, hash |
| `dual-custody.service.spec.ts` | Revisao dupla, conflito, admin resolve |
| `media-access-log.service.spec.ts` | Log de acessos, historico, busca por IP |

---

## Modulos da API

### Autenticacao (`/auth`)
- `POST /auth/register` — cadastro com email + username
- `POST /auth/login` — retorna `accessToken` (15min) + `refreshToken` (7d)
- `POST /auth/refresh` — rotacao de refresh token (Redis blacklist)
- `POST /auth/logout` — invalida refresh token
- `POST /auth/2fa/setup` / `/auth/2fa/verify` — TOTP com QR code
- `POST /auth/2fa/disable` — desativa 2FA com confirmacao OTP

### Usuarios (`/users`)
- Perfil publico por username com ISR no Next.js (revalidate: 300s)
- KYC: declaracao (consumidor) e documento + selfie (criador)
- LGPD: `GET /users/me/data-export`, `POST /users/me/deletion-request` (30 dias)

### Conteudo (`/content`)
- Upload multipart com moderacao automatica (CSAM check + dupla custodia)
- Tres bitrates: 360p / 720p / 1080p (HLS via FFmpeg)
- URLs pre-assinadas S3 privadas (expiracao configuravel)
- Visibilidade: `PUBLIC` | `SUBSCRIBERS` | `PPV`
- `POST /content/:logId/watch-progress` — player reporta tempo assistido
- Rastreabilidade completa de acesso (IP, sessao, userAgent)

### Moderacao (`/moderation/custody`)
- `GET /moderation/custody/queue` — fila de revisao para moderadores
- `POST /moderation/custody/:reviewId/decide` — moderador submete decisao
- `POST /moderation/custody/:reviewId/admin-resolve` — admin resolve conflitos
- `GET /moderation/custody/stats` — estatisticas da fila
- `GET /moderation/custody/access-log/media/:mediaId` — historico de acessos
- `GET /moderation/custody/access-log/user/:userId` — acessos de um usuario
- `GET /moderation/custody/access-log/ip/:ipAddress` — acessos por IP

### Pagamentos (`/payments`)
- Pagar.me: PIX, boleto, cartao de credito
- Stripe: cartao internacional
- Webhooks idempotentes para ambos os gateways
- Split automatico 80/20 (criador/plataforma)

### Assinaturas (`/subscriptions`)
- Multiplos planos por criador (mensal/trimestral/anual)
- Slot config com desconto para primeiros N assinantes
- Win-back automatico via `@Cron`

### Lives (`/lives`)
- Token LiveKit gerado por assinante verificado
- Super Chats com 5 tiers de cor e destaque temporario
- Leiloes com lance minimo e fechamento automatico `@Cron(EVERY_MINUTE)`
- Toys interativos: intensidade/duracao com consentimento por sessao

### IA (`/ai-persona`, `/ai-avatar`, `/content-gen`)
- **AI Persona**: Claude Haiku, FAQ sem chamada a API, `AI_DISCLAIMER` em 100% das respostas
- **AI Avatar**: upload 50-200 fotos + audio, consentimento documentado, LoRA (Replicate)
- **Content Gen**: fundos/efeitos via SDXL, 20 jobs/dia, moderacao obrigatoria no output

### Torneios (`/tournaments`)
- Metricas: `NEW_SUBSCRIBERS` | `REVENUE` | `CONTENT_VIEWS`
- Prize pool com distribuicao percentual configuravel
- Leaderboard em tempo real; encerramento e pagamento automaticos

### VR (`/vr-content`)
- Formatos: `VR180` | `VR360`; stereo: `top-bottom` | `side-by-side`
- Qualidades: 2K / 4K / 8K (por tier de acesso)
- Player WebXR A-Frame no browser

### Cripto (`/crypto-payments`)
- Aceita: **BTC, USDC, USDT** — Monero bloqueado por compliance AML
- KYC escalonado por volume mensal
- Expiracao automatica; webhook idempotente HMAC-SHA256

---

## Arquitetura

### Fluxo de upload de conteudo

```
Cliente
  |
  v
POST /content/upload (multipart, max 150MB)
  |
  v
1. Validacao de tipo MIME (image/jpeg, image/png, image/webp, video/mp4, video/webm)
  |
  v
2. Scan CSAM obrigatorio (PhotoDNA em prod / SHA-256 em dev)
  |
  ├── CSAM detectado → REJEITADO + reporte NCMEC/SaferNet + ban
  |
  └── Scan limpo
      |
      v
3. Cria registro Media com status PENDING_REVIEW
  |
  v
4. Cria ContentCustodyReview (dupla custodia)
  |
  v
5. Processamento em background:
   ├── Imagem: otimiza + gera thumbnail
   └── Video: FFmpeg → HLS (360p/720p/1080p) + thumbnail
  |
  v
6. Dois moderadores independentes revisam
   ├── Ambos APPROVE → status = APPROVED (conteudo disponivel)
   ├── Ambos REJECT → status = REJECTED
   └── Divergencia → ESCALATE para admin
```

### Dupla custodia de conteudo

O sistema de dupla custodia garante que nenhum conteudo e disponibilizado sem revisao de **2 moderadores independentes**:

```
Upload → CSAM Scan → ContentCustodyReview criado
                          |
                    Moderador 1 revisa
                    (APPROVE / REJECT / ESCALATE)
                          |
                    Moderador 2 revisa (NAO ve a decisao do primeiro)
                    (APPROVE / REJECT / ESCALATE)
                          |
                    +-----+-----+
                    |           |
               Unanimidade   Divergencia
                    |           |
            Aplica decisao   ESCALATE
            no conteudo      → Admin resolve
                             com justificativa
```

**Regras:**
- Mesmo moderador NAO pode revisar o mesmo conteudo duas vezes
- Decisoes sao registradas com moderadorId, motivo, e timestamp
- Divergencias geram registro detalhado no ModerationLog
- Admin pode forcar APPROVE ou REJECT com justificativa obrigatoria

### Rastreabilidade de acessos

Cada visualizacao de conteudo registra:

```
GET /content/:mediaId
  |
  v
MediaAccessLog {
  mediaId      → qual conteudo
  userId       → quem acessou
  sessionId    → sessao do usuario (dispositivo/IP original do login)
  ipAddress    → IP no momento do acesso
  userAgent    → navegador/dispositivo
  accessType   → VIEW | STREAM | DOWNLOAD
  durationSec  → tempo assistido (videos, atualizado via watch-progress)
  completedAt  → se terminou de assistir
  createdAt    → timestamp do acesso
}
```

**Endpoints de auditoria** (apenas moderadores/admin):
- Historico por conteudo: `GET /moderation/custody/access-log/media/:mediaId`
- Historico por usuario: `GET /moderation/custody/access-log/user/:userId`
- Investigacao por IP: `GET /moderation/custody/access-log/ip/:ipAddress`

### Sistema de recomendacoes

```
GET /recommendations
  ├── collaborativeScore()
  │     → assinantes do viewer → usuarios similares → creators nao assinados
  │     → score = frequencia / maxFreq (normalizado 0-1)
  │
  ├── contentBasedScore()
  │     → categoria preferida do viewer → creators na mesma categoria
  │     → score = 0.3 + (overlap_tags / total_tags) * 0.4
  │
  ├── mergeScores()  — collaborative 60%, content-based 40%
  ├── diversify()    — max. 65% de um reasonCode
  └── profileMap()   — busca perfis em batch
```

### Autenticacao e sessao

```
Login
  → accessToken  (JWT HS256, 15min, stateless)
  → refreshToken (JWT HS256, 7d, armazenado no Redis com TTL)
  → Session criada com ipAddress + userAgent

Refresh
  → valida no Redis → verifica blacklist → rotacao → novo par

Logout
  → adiciona refresh ao blacklist Redis (TTL = tempo restante)

2FA TOTP
  → speakeasy gera secret → QR code base64 → usuario escaneia
  → verify: janela de 30s +/- 1 token de tolerancia
```

### Split de pagamentos

```
Assinatura de R$ 100,00
  ├── Pagar.me / Stripe webhook: PAYMENT_AUTHORIZED
  ├── Transaction: grossAmount=10000, platformFee=2000, netAmount=8000
  ├── CreatorBalance.availableAmount += 8000 centavos
  └── Saque D+14 via PIX → CreatorBalance.availableAmount -= valor
```

---

## Conformidade e seguranca

| Requisito | Implementacao |
|-----------|--------------|
| **CSAM** | PhotoDNA (prod) / SHA-256 local (dev) — scan obrigatorio em todo upload |
| **Dupla custodia** | 2 moderadores independentes revisam todo conteudo antes de publicar |
| **Rastreabilidade** | MediaAccessLog registra userId, IP, sessao, duracao em cada acesso |
| **LGPD Art. 7** | `ConsentRecord` com `type`, `version`, `accepted: true` |
| **LGPD Art. 18** | `GET /users/me/data-export` + `POST /users/me/deletion-request` (30 dias) |
| **Verificacao de idade** | Declaracao (consumidor) + documento + selfie (criador) |
| **IA identificada** | `AI_DISCLAIMER` obrigatorio em 100% das respostas de AI Persona |
| **Avatar IA** | Consentimento documentado com timestamp + texto exato antes do treinamento |
| **Cripto AML** | KYC escalonado por volume mensal; Monero bloqueado |
| **Contratos collab** | Dupla assinatura OTP; status `SIGNED` imutavel |
| **Rate limiting** | Per-user (100 req/60s) + restrito para auth (10 req/60s) |
| **JWT Blacklist** | Refresh tokens invalidados no Redis apos logout ou rotacao |
| **CPF criptografado** | `cpfHash` (SHA-256 dedup) + `cpfEncrypted` (AES-256 consulta) |
| **Health checks** | `/health` (liveness) + `/health/ready` (readiness: DB + Redis) |
| **Exception filter** | Stack traces suprimidos em producao |
| **Request ID** | `X-Request-Id` propagado em todas as requests |
| **Structured logging** | JSON logs com requestId, method, url, status, duration |
| **Webhook DLQ** | Dead-letter queue com retry automatico (max 5 tentativas) |
| **Auditoria financeira** | AuditService registra pagamentos, saques, reembolsos |
| **Race conditions** | Optimistic locking (leiloes) + SELECT FOR UPDATE (saques) |

---

## Deploy em producao

### Usando Docker Compose

```bash
# 1. Configure o .env com valores de producao
#    (JWT secrets fortes, senhas de banco, chaves de API reais)

# 2. Suba com a config de producao
docker compose -f docker-compose.prod.yml up -d

# 3. Aplique migrations
docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy

# 4. Verifique o health check
curl http://seu-servidor:3001/api/health
```

### Checklist de producao

- [ ] `NODE_ENV=production` no `.env`
- [ ] Segredos JWT com pelo menos 64 caracteres aleatorios
- [ ] `CSAM_PROVIDER=photodna` com chave valida
- [ ] `KYC_PROVIDER=unico` com credenciais
- [ ] `REDIS_PASSWORD` forte
- [ ] `POSTGRES_PASSWORD` forte
- [ ] `ELASTICSEARCH_PASSWORD` definido
- [ ] `PAGARME_API_KEY` e `STRIPE_SECRET_KEY` em modo live (nao test)
- [ ] `PAGARME_WEBHOOK_SECRET` e `STRIPE_WEBHOOK_SECRET` configurados
- [ ] `CRYPTO_WEBHOOK_SECRET` configurado
- [ ] Certificado SSL/TLS (HTTPS) no proxy reverso (nginx/Cloudflare)
- [ ] Porta do PostgreSQL **NAO** exposta publicamente
- [ ] Porta do Redis **NAO** exposta publicamente
- [ ] Backups automaticos do PostgreSQL configurados
- [ ] VAPID keys geradas (`npx web-push generate-vapid-keys`)
- [ ] Sentry DSN configurado para monitoramento de erros
- [ ] Dominio configurado com DNS apontando para o servidor

---

## CI/CD

O pipeline do GitHub Actions (`.github/workflows/ci.yml`) executa automaticamente:

```
Push/PR para main
  |
  v
[1] Lint & Test
    ├── Install deps
    ├── Generate Prisma
    ├── Lint (ESLint)
    ├── Unit tests (155 testes + coverage threshold)
    ├── Security audit (pnpm audit)
    └── Trivy vulnerability scan
  |
  v
[2] Build
    ├── Build API (NestJS)
    └── Build Web (Next.js)
  |
  v (apenas main)
[3] Docker Build & Push
    ├── Build imagem API → ghcr.io
    └── Build imagem Web → ghcr.io
  |
  v (apenas main)
[4] Deploy Staging
    ├── SSH → servidor staging
    ├── Pull imagens novas
    ├── docker compose up -d
    ├── prisma migrate deploy
    └── Health check verification
```

---

## Troubleshooting

### "docker compose up" falha com erro de porta

Algum servico ja esta usando a porta. Verifique:
```bash
# Ver o que esta usando a porta 5432 (PostgreSQL)
# Windows:
netstat -ano | findstr :5432
# Linux/Mac:
lsof -i :5432
```

Solucao: pare o servico conflitante ou altere a porta no `docker-compose.yml`.

### "Cannot find module '@prisma/client'"

O Prisma Client nao foi gerado. Rode:
```bash
pnpm --filter @intimare/database db:generate
```

### "Migration failed" ou "database does not exist"

O PostgreSQL pode nao estar pronto. Verifique:
```bash
docker compose ps    # postgres deve estar "healthy"
docker compose logs postgres
```

### Elasticsearch nao inicia (vm.max_map_count)

No Linux, o Elasticsearch precisa de mais memoria virtual:
```bash
sudo sysctl -w vm.max_map_count=262144
# Para persistir:
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

### MinIO: "bucket does not exist"

Crie os buckets manualmente (veja secao [7. Configurar o MinIO](#7-configurar-o-minio-storage)).

### Testes falham com erro de conexao

Os testes unitarios usam mocks e NAO precisam de banco rodando. Se estiver vendo erros de conexao, verifique se esta rodando os testes e2e sem ter o Docker ativo:
```bash
# Testes unitarios (nao precisam de Docker)
pnpm --filter @intimare/api test

# Testes e2e (precisam de Docker)
docker compose up -d
pnpm --filter @intimare/api test:e2e
```

### "CSAM scan falhou" em desenvolvimento

Em modo `local`, o scan usa SHA-256 e nunca deve falhar. Verifique se `CSAM_PROVIDER=local` esta no `.env`.

### Mobile nao conecta na API

Se o mobile esta rodando no celular fisico, `localhost` nao funciona. Use o IP da sua maquina:
```env
# .env do mobile
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3001
```

Para descobrir seu IP:
```bash
# Windows
ipconfig
# Linux/Mac
ifconfig | grep "inet "
```

---

## Decisoes tecnicas relevantes

### Representacao de valores monetarios
- **Centavos (Int)**: `Transaction.grossAmount`, `CreatorBalance.availableAmount`, `SuperChat.amount`
- **Decimal BRL**: `Tournament.prizePoolBRL`, `Tip.amount`
- Nunca misturar as duas representacoes na mesma operacao.

### Elasticsearch com fallback automatico
Todas as queries ao Elasticsearch estao em `try/catch`. Em caso de indisponibilidade, o `SearchService` usa PostgreSQL `ILIKE` como fallback sem erro para o cliente.

### AI Persona — otimizacao de custo
O FAQ e verificado antes de qualquer chamada a API Anthropic. Respostas de FAQ tem latencia < 5ms e custo zero. Apenas perguntas sem match no FAQ chegam ao Claude Haiku.

### Race conditions em operacoes financeiras
- **Leiloes**: Optimistic locking via `updateMany` com `WHERE currentBid = valor_lido` — se outra thread alterou, retorna count=0 e o lance e rejeitado.
- **Saques**: Pessimistic locking via `SELECT ... FOR UPDATE` dentro de transaction serializada — impede double-spend.

### Dupla custodia — independencia dos revisores
O segundo moderador NAO ve a decisao do primeiro. A fila de revisao exclui conteudos que o moderador ja revisou. Isso garante independencia real, nao apenas rubber-stamping.

### Modo offline no mobile
Apenas teasers sao cacheados offline (nunca conteudo pago completo). O cache usa LRU com limite de 50 itens no `FileSystem.cacheDirectory` do Expo.

### VR — acesso por tier
| Tier | Qualidade maxima |
|------|-----------------|
| Assinante regular | 2K |
| PPV / plano premium | 4K |
| Verified Tier | 8K |

URLs pre-assinadas expiram em 2h para evitar compartilhamento.
