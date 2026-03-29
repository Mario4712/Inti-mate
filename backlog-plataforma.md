# Backlog – Plataforma de Conteúdo para Criadores
> Conformidade com LGPD, ECA e regulamentações de pagamento.
> Marque cada item com `[x]` conforme for concluído.
> Legenda de status: `[ ]` pendente · `[~]` em andamento · `[x]` concluído

---

## ARQUITETURA TÉCNICA

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│   Next.js 14 (App Router) + TypeScript + TailwindCSS        │
│   PWA (mobile-first) · SSR para SEO · WebSocket client      │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / WSS
┌───────────────────────────▼─────────────────────────────────┐
│                      API GATEWAY                            │
│            Nginx · Rate limiting · JWT validation           │
└──────┬────────────────────┬────────────────────┬────────────┘
       │                    │                    │
┌──────▼──────┐   ┌─────────▼──────┐   ┌────────▼───────────┐
│  API Core   │   │  Media Service  │   │  Realtime Service  │
│  NestJS +   │   │  FFmpeg + HLS   │   │  Socket.io +       │
│  TypeScript │   │  Upload/Stream  │   │  WebRTC (lives)    │
└──────┬──────┘   └─────────┬──────┘   └────────┬───────────┘
       │                    │                    │
┌──────▼────────────────────▼────────────────────▼───────────┐
│                      DATA LAYER                             │
│  PostgreSQL (dados relacionais: users, tx, assinaturas)     │
│  Redis (sessões, cache, filas, pub/sub em tempo real)       │
│  Elasticsearch (busca full-text, tags, descoberta)          │
│  S3/R2 (Cloudflare) (fotos, vídeos, documentos KYC)        │
└─────────────────────────────────────────────────────────────┘
       │                    │
┌──────▼──────┐   ┌─────────▼──────────────────────────────┐
│  AI Service │   │         SERVIÇOS EXTERNOS               │
│  Python +   │   │  Pagar.me / Stripe (pagamentos)         │
│  FastAPI    │   │  PhotoDNA (CSAM detection)              │
│  (modelos,  │   │  Serpro / Unico (validação CPF/doc)     │
│  recomend., │   │  Twilio / AWS SNS (SMS/push)            │
│  avatares)  │   │  Cloudflare CDN (vídeos globais)        │
└─────────────┘   └────────────────────────────────────────┘
```

**Stack resumida:**
| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14, TypeScript, TailwindCSS, PWA |
| Backend | NestJS (Node.js), TypeScript, REST + WebSocket |
| Banco primário | PostgreSQL 16 |
| Cache / filas | Redis 7 |
| Busca | Elasticsearch 8 |
| Storage | Cloudflare R2 (ou AWS S3) + CDN Cloudflare |
| Vídeo | FFmpeg + HLS adaptativo |
| Lives | LiveKit (WebRTC open-source) ou mediasoup |
| AI/ML | Python + FastAPI (microserviço separado) |
| Pagamentos | Pagar.me (PIX/boleto/cartão) + Stripe (internacional) |
| Moderação | PhotoDNA + revisão humana |
| Infra | Docker + Kubernetes + GitHub Actions (CI/CD) |
| Monitoramento | Prometheus + Grafana + Sentry |

---

## ORDEM DE EXECUÇÃO — DO MAIS CRUCIAL AO MAIS DISPENSÁVEL

---

### BLOCO 1 — SEM ISSO O PRODUTO NÃO EXISTE (Semanas 1–4)
> Bloqueadores legais e técnicos. Nenhuma feature de negócio pode ser construída antes.

- [x] **1. Infraestrutura base**: repositório Git, Docker Compose local, PostgreSQL + Redis + S3 local (MinIO), pipeline CI/CD básico (GitHub Actions), ambientes dev/staging/prod separados
- [x] **2. Autenticação segura**: registro com e-mail verificado, login com JWT + refresh token, 2FA via TOTP (Google Authenticator), reset de senha, blacklist de tokens revogados no Redis
- [x] **3. Moderação de conteúdo + CSAM**: integração com PhotoDNA (ou hash-matching equivalente) em todo upload antes de qualquer exibição; fila de revisão humana; reporte automático ao Ministério Público/NCMEC; sistema de denúncias
- [x] **4. Verificação de idade + KYC criador**: consumidor — checkbox + validação de formato CPF; criador — CPF + selfie + documento via integração Unico/Serpro; bloqueio de acesso a conteúdo adulto enquanto pendente
- [x] **5. Conformidade LGPD**: política de privacidade, termos de uso, banner de consentimento de cookies, endpoint de exclusão de dados (direito ao esquecimento), encarregado (DPO) designado
- [x] **6. Sistema de pseudônimos**: separação entre nome real (interno, criptografado) e nome artístico público; username único por usuário; dados reais acessíveis apenas via ordem judicial
- [x] **7. Perfis base**: criador (bio, foto, galeria, destaques, planos de assinatura visíveis) e consumidor (avatar, username, histórico de assinaturas); limites de armazenamento por plano

---

### BLOCO 2 — MONETIZAÇÃO CORE (Semanas 5–8)
> Sem receita, a plataforma não sustenta operação. Este bloco ativa o fluxo de dinheiro.

- [x] **8. Integração de pagamentos**: Pagar.me para PIX, boleto, cartão de crédito; Stripe para pagamentos internacionais; split automático criador/plataforma; antifraude básico
- [x] **9. Taxas transparentes + extrato**: fee da plataforma visível em toda tela de compra (ex: "Plataforma retém 20%"); extrato detalhado para criadores com filtros por período e tipo de receita
- [x] **10. Assinaturas por criador**: criador define preço mensal/trimestral/anual; renovação automática; cancelamento self-service; grace period de 3 dias após falha de cobrança
- [x] **11. Pay-Per-View (PPV)**: upload de conteúdo com paywall; preço visível antes da compra; acesso permanente após compra; preview desbloqueável pelo criador
- [x] **12. Saque para criadores**: PIX com prazo D+14 do ciclo; dashboard de saldo disponível/bloqueado; histórico de saques; validação de conta bancária no KYC
- [x] **13. Onboarding em 2 camadas**: fluxo de cadastro consumidor em < 2 min (checkbox + CPF formato + email); fluxo criador completo com KYC e tutoriais de como monetizar; emails transacionais automáticos

---

### BLOCO 3 — ENGAJAMENTO BÁSICO (Semanas 9–12)
> Com monetização ativa, agora é necessário reter usuários e criar hábito de uso.

- [x] **14. Upload e galeria de conteúdo**: fotos e vídeos; processamento assíncrono (FFmpeg + HLS); barra de progresso; metadados (tags, descrição, visibilidade); limite de tamanho por plano
- [x] **15. Mensagens privadas**: chat entre criador e fã; mensagens pagas (criador define preço/conversa); histórico de mensagens; indicador de leitura; bloqueio de usuário
- [x] **16. Stories efêmeros**: conteúdo de 24h exclusivo para assinantes; upload de foto ou vídeo curto (até 60s); visualizações contadas; sem algoritmo forçando exibição
- [x] **17. Notificações push**: web push + email para novos conteúdos, mensagens, cobrança; configurável pelo usuário (tipos e frequência); opt-out fácil em um clique; máximo de 5/dia
- [x] **18. Chatbot de suporte**: IA da plataforma claramente identificada para dúvidas operacionais (pagamento, saque, moderação); escalonamento para humano em casos complexos

---

### BLOCO 4 — DESCOBERTA E CRESCIMENTO (Semanas 13–16)
> Sem descoberta, criadores não crescem e consumidores abandonam por falta de variedade.

- [x] **19. Busca com tags e categorias**: indexação no Elasticsearch; filtros por categoria, preço, tipo de conteúdo, localização; tags moderadas (lista aprovada + sugestão de novas com revisão)
- [x] **20. Página de descoberta**: criadores em destaque (curadoria manual + algoritmo); novos criadores; categorias populares; baseado em preferências do usuário; sem perfis inflados artificialmente
- [x] **21. Algoritmo de recomendação v1**: baseado em histórico de assinaturas e conteúdos comprados; collaborative filtering básico (PostgreSQL); opção de desligar personalização; sem escalonamento para extremos
- [x] **22. SEO programático**: página pública por criador com schema markup (Person + CreativeWork); meta tags dinâmicas; sitemap.xml automático; robots.txt; Core Web Vitals otimizados (LCP < 2.5s)

---

### BLOCO 5 — RETENÇÃO E RECEITA AVANÇADA (Semanas 17–22)
> Com base de usuários estabelecida, aumentar ARPU e reduzir churn.

- [x] **23. Sistema de gorjetas (tips)**: botão de doação em posts, lives e perfis; leaderboard de apoiadores do mês (exibição com consentimento do fã); sem manipulação de ranking
- [x] **24. Venda de itens digitais**: packs de fotos/vídeos, conteúdo personalizado encomendado, mensagem de voz; criador define preço e entrega; sistema de pedidos com prazo
- [x] **25. Creator Intelligence Dashboard**: horários de pico de atividade dos assinantes; taxa de retenção por tipo de conteúdo; funil de conversão (visitante → assinante); análise de churn; receita por período
- [x] **26. Pricing inteligente**: surge pricing em lives (preço do ingresso sobe com demanda); vagas limitadas de assinatura por criador (cria escassez real); timers de promoção com prazo verdadeiro; desconto automático win-back para inativos há 30+ dias
- [x] **27. Sistema de upsell**: exit-intent modal ao tentar sair de perfil de criador; upsell pós-compra de PPV ("esse criador tem mais 3 conteúdos exclusivos"); modal de boas-vindas com oferta de 7 dias grátis — todos com botão X visível, sem loop de reabertura
- [x] **28. Streak de recompensa positiva**: badge semanal/mensal por frequência de acesso; desconto progressivo na assinatura (ex: 30 dias seguidos = 10% off); leaderboard de apoiadores com premiação real; zero punição por inatividade
- [x] **29. Viral loop de indicação**: link de referência único por usuário; consumidor que indica ganha crédito (ex: R$ 15 em assinatura); "compartilhe para desbloquear 7 dias grátis"; teaser público de conteúdo compartilhável pelo criador

---

### BLOCO 6 — LIVES E INTERATIVIDADE (Semanas 23–28)
> Alto impacto em engajamento e monetização, mas complexidade técnica alta — vem depois da base sólida.

- [x] **30. Lives interativas**: streaming WebRTC via LiveKit; chat em tempo real; limite de espectadores por plano; gravação automática com consentimento do criador
- [x] **31. Pay-to-interact em lives**: fãs pagam para destacar mensagem no chat (como Super Chat do YouTube); criador define valor mínimo; receita split automático
- [x] **32. Leilões de conteúdo exclusivo**: live auction para conteúdo único; lance mínimo definido pelo criador; timer de encerramento; pagamento automático ao vencedor; transferência de arquivo após confirmação
- [x] **33. Integração com toys IoT**: Lovense/Kiiroo via Bluetooth API; criador ativa o modo em cada sessão (consentimento por sessão, não global); fãs pagam por tempo de controle; valores mínimos/máximos definidos pelo criador

---

### BLOCO 7 — AFILIADOS E DISTRIBUIÇÃO (Semanas 29–32)
> Cresce a base de criadores e consumidores via canais externos.

- [x] **34. Programa de afiliados 2 níveis**: 20% de comissão no nível 1 (indicação direta de criador pagante); 5% no nível 2 (indicação do indicado); cap mensal por afiliado; dashboard de comissões; pagamento junto ao ciclo de saque
- [x] **35. Social Scheduler**: criador agenda posts de teaser para Instagram, X/Twitter e TikTok via APIs oficiais; sugestão de horário baseada em quando os seguidores estão ativos; relatório de cliques e conversões por post
- [x] **36. Tier "Acesso Verificado"**: seção premium para usuários com verificação de identidade completa; conteúdo mais explícito dentro da lei; moderação reforçada (not reduzida); acesso via upgrade de plano

---

### BLOCO 8 — IA E DIFERENCIAÇÃO (Semanas 33–40)
> Features que diferenciam da concorrência — dispensáveis no curto prazo, decisivas no longo prazo.

- [ ] **37. AI Persona configurável**: criador escreve respostas base e tom de voz; IA aprende e responde fãs fora do horário; identificado como "IA de [nome]" no perfil; auto-respostas enlatadas para perguntas frequentes
- [ ] **38. Recomendações preditivas v2**: modelo ML com embeddings de consumo; sugere criadores e conteúdos com alta probabilidade de conversão; opção de transparência ("por que estou vendo isso?"); sem escalonamento para extremos
- [ ] **39. Matches entre criadores**: sugestão de collabs baseada em audiências complementares (sobreposição de fãs, categorias similares, faixas de preço compatíveis); aceite mútuo obrigatório
- [ ] **40. Contratos IA com assinatura digital**: IA gera contrato de collab (divisão de receita, exclusividade, prazo) com resumo em linguagem simples; assinatura via token SMS; armazenamento imutável no S3; cópia para ambas as partes
- [ ] **41. Torneios com prize pool real**: top criadores por novos assinantes ou receita ganham % do pool mensal; regulamento público e auditável; ranking em tempo real no Redis

---

### BLOCO 9 — EXPANSÃO MOBILE E CRYPTO (Semanas 41–48)
> Expansão de plataforma e meios de pagamento alternativos.

- [ ] **42. App mobile nativo (iOS + Android)**: React Native ou capacitor a partir da PWA; notificações push nativas; biometria para login; modo offline para teasers; submissão nas lojas (com categoria adulta restrita)
- [ ] **43. Cripto com KYC escalonado**: aceitar BTC, USDC, USDT via Coinbase Commerce ou BTCPay Server; transações < R$ 2k/mês com email + wallet; acima disso KYC completo automático; não Monero
- [ ] **44. Matches por região**: opt-in explícito com prompt claro; armazena apenas cidade/estado (nunca coordenadas); retenção de 30 dias; usado para "criadores perto de você" e collabs locais

---

### BLOCO 10 — INOVAÇÃO (Semanas 49–60)
> Alto esforço, alto diferencial. Dispensável no médio prazo, mas define o teto do produto.

- [ ] **45. AI Avatar do criador**: criador faz upload de 50+ fotos e grava áudio de referência; plataforma treina modelo personalizado (LoRA ou similar); gera variações de conteúdo com consentimento documentado; também disponível avatares de fantasia 100% fictícios
- [ ] **46. IA para geração de conteúdo**: criador usa prompts para gerar variações do próprio conteúdo (fundos, efeitos, cenários alternativos); proibido usar rosto/voz de terceiros; moderação aplicada ao output da IA também
- [ ] **47. Ferramentas de edição colaborativa**: fãs enviam sugestões de edição em vídeos (cortes, legendas, trilha); criador aprova ou rejeita; monetização compartilhada configurada pelo criador no aceite
- [ ] **48. Realidade Aumentada / VR**: conteúdo VR 180°/360° upado pelo criador; viewer via app mobile (cardboard) ou WebXR; compras in-app para upgrades de resolução; sem integração de hardware proprietário no MVP

---

## ANÁLISE DOS ITENS REMOVIDOS — JUSTIFICATIVAS E ADAPTAÇÕES

> 16 de 19 itens foram reaproveitados com versão legal. 3 são bloqueios absolutos.

---

### 🚫 BLOQUEIOS ABSOLUTOS

| Item | Por que é intransponível |
|---|---|
| **Remoção da detecção de CSAM** | Crime federal (ECA Art. 241-A). Obrigação legal sem exceção. |
| **Perfis falsos para simular popularidade** | Fraude contra consumidor (CDC Art. 37). Sem framing que torne legal. |
| **Programa de pirâmide** | Tipificado como crime (Lei 1.521/51). Estrutura multinível exponencial é inviável. |

---

### ✅ ITENS REAPROVEITADOS COM ADAPTAÇÃO

| Item original | Problema | Versão implementada | Bloco |
|---|---|---|---|
| Cadastro sem verificação | Viola ECA | Onboarding 2 camadas: consumidor leve, criador KYC completo | 2 |
| Modo anônimo com VPN | Facilita abuso | Pseudônimos públicos, identidade real apenas internamente | 1 |
| Preços baseados em vício | Cláusula abusiva | Surge pricing em lives + timers reais + win-back | 5 |
| Popups inescapáveis | Prática abusiva CDC | Modais com X visível, sem loop de reabertura | 5 |
| Links virais falsos / spam | Fraude + crime de spam | Viral loop legítimo com crédito por indicação | 5 |
| Monero sem KYC | Facilita lavagem | BTC/USDC/USDT com KYC escalonado por volume | 9 |
| Bot fingindo ser criador | Fraude ao consumidor | AI Persona configurada e controlada pelo próprio criador | 8 |
| Deepfakes de terceiros | Crime (LGPD + imagem) | Avatar IA treinado na própria imagem do criador, com consentimento | 10 |
| Streaks com punição | Manipulação abusiva | Streaks de recompensa positiva, zero punição | 5 |
| Prêmios falsos | Estelionato | Prize pool real de % da receita mensal | 8 |
| Dark Web Lite sem moderação | Responsabilidade criminal | Tier "Acesso Verificado" com moderação reforçada | 7 |
| Analytics de exploração | Manipulação intencional | Creator Intelligence Dashboard (mesmos dados, framing BI) | 5 |
| Auto-post com ban evasion | Fraude + viola ToS | Social Scheduler via APIs oficiais | 7 |
| Geolocalização sem consentimento | Viola LGPD | Matches por região com opt-in explícito | 9 |
| Blackhat SEO | Viola diretrizes | SEO programático white-hat agressivo | 4 |
| Contratos sem consentimento | Nulo (Código Civil) | Contratos IA + assinatura token SMS | 8 |
