# Inti.mate — Production Runbook

## Pre-requisites

- Docker + Docker Compose v2
- SSH access to staging/production servers
- GitHub Secrets configured: `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`
- `.env` file with all production values (see `.env.example`)

---

## Deployment

### Automated (via CI/CD)
Push to `main` triggers: lint -> test -> build -> docker push -> deploy to staging.

### Manual
```bash
cd /opt/intimare
export IMAGE_TAG=<commit-sha>
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy
curl -f http://localhost:3001/api/health
```

### Rollback
```bash
export IMAGE_TAG=<previous-commit-sha>
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

---

## Health Checks

| Endpoint | Purpose | Expected |
|----------|---------|----------|
| `GET /api/health` | Liveness probe | `{"status":"ok"}` |
| `GET /api/health/ready` | Readiness probe (DB + Redis) | `{"status":"ok","services":{...}}` |

---

## Database Backup

### Automated daily backup (cron on production server)
```bash
# /etc/cron.d/intimare-backup
0 3 * * * root docker compose -f /opt/intimare/docker-compose.prod.yml exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > /opt/backups/intimare-$(date +\%Y\%m\%d).sql.gz
# Retain last 30 days
0 4 * * * root find /opt/backups -name "intimare-*.sql.gz" -mtime +30 -delete
```

### Manual backup
```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U intimare intimare_prod | gzip > backup-$(date +%Y%m%d-%H%M).sql.gz
```

### Restore
```bash
gunzip < backup-YYYYMMDD.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U intimare intimare_prod
```

### Redis backup
Redis runs with `appendonly yes`. Data is persisted in the `redis_data` volume. To backup:
```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $REDIS_PASSWORD BGSAVE
docker cp intimare_redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

---

## Common Incidents

### API not responding
1. Check health: `curl http://localhost:3001/api/health`
2. Check logs: `docker compose -f docker-compose.prod.yml logs --tail=100 api`
3. Check resources: `docker stats`
4. Restart: `docker compose -f docker-compose.prod.yml restart api`

### Database connection issues
1. Check PostgreSQL: `docker compose -f docker-compose.prod.yml exec postgres pg_isready`
2. Check connection count: `docker compose -f docker-compose.prod.yml exec postgres psql -U intimare -c "SELECT count(*) FROM pg_stat_activity;"`
3. Kill idle connections: `docker compose -f docker-compose.prod.yml exec postgres psql -U intimare -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '10 minutes';"`

### Redis memory pressure
1. Check memory: `docker compose -f docker-compose.prod.yml exec redis redis-cli -a $REDIS_PASSWORD INFO memory`
2. Redis is configured with `maxmemory 256mb` and `allkeys-lru` eviction policy
3. Flush stale keys if needed: `docker compose -f docker-compose.prod.yml exec redis redis-cli -a $REDIS_PASSWORD FLUSHDB`

### High error rate (5xx)
1. Check Sentry dashboard for error details
2. Check structured logs: `docker compose -f docker-compose.prod.yml logs api | grep '"status":5'`
3. Look for request IDs in logs using `x-request-id` header

### Payment webhook failures
1. Check DLQ entries in moderationLog: `SELECT * FROM "ModerationLog" WHERE "contentType" = 'WEBHOOK_DLQ' ORDER BY "createdAt" DESC LIMIT 20;`
2. DLQ retries run every 10 minutes automatically
3. Failed webhooks with 5+ retries are marked as dead (reportedToAuthority = true)

### Disk space
1. Prune Docker: `docker system prune -af --volumes` (careful!)
2. Check Elasticsearch: disk usage grows with search index size
3. Check PostgreSQL: `docker compose -f docker-compose.prod.yml exec postgres psql -U intimare -c "SELECT pg_size_pretty(pg_database_size('intimare_prod'));"`

---

## Monitoring

| Tool | Purpose | URL |
|------|---------|-----|
| Sentry | Error tracking | Configure `SENTRY_DSN` env var |
| Health endpoint | Uptime monitoring | `/api/health` (use Uptime Robot, Pingdom, etc.) |
| Docker stats | Resource usage | `docker stats` on host |

---

## Security Checklist

- [ ] All env vars set (no empty secrets)
- [ ] `NODE_ENV=production`
- [ ] HTTPS configured at reverse proxy (nginx/Cloudflare)
- [ ] Database not exposed to internet (no ports in prod compose)
- [ ] Redis password set
- [ ] Elasticsearch password set
- [ ] VAPID keys generated
- [ ] Webhook secrets configured (Pagarme, Stripe, Crypto)
- [ ] KYC provider configured (not mock)
- [ ] Sentry DSN configured
- [ ] Backup cron configured
- [ ] SSL certificates valid and auto-renewing
