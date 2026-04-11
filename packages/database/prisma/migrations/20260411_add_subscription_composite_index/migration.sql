-- AddIndex: Subscription(subscriberId, creatorId, status) para checkSubscriptionAccess
-- Esta query é executada em cada request de conteúdo protegido por assinatura
CREATE INDEX IF NOT EXISTS "Subscription_subscriberId_creatorId_status_idx"
ON "Subscription"("subscriberId", "creatorId", "status");
