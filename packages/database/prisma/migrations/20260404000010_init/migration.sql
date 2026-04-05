-- CreateEnum
CREATE TYPE "CustodyDecision" AS ENUM ('APPROVE', 'REJECT', 'ESCALATE');

-- CreateTable
CREATE TABLE "MediaAccessLog" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "country" VARCHAR(2),
    "accessType" TEXT NOT NULL DEFAULT 'VIEW',
    "durationSec" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCustodyReview" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "reviewer1Id" TEXT,
    "decision1" "CustodyDecision",
    "reason1" TEXT,
    "reviewedAt1" TIMESTAMP(3),
    "reviewer2Id" TEXT,
    "decision2" "CustodyDecision",
    "reason2" TEXT,
    "reviewedAt2" TIMESTAMP(3),
    "finalDecision" "CustodyDecision",
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "conflictNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCustodyReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaAccessLog_mediaId_createdAt_idx" ON "MediaAccessLog"("mediaId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAccessLog_userId_createdAt_idx" ON "MediaAccessLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAccessLog_sessionId_idx" ON "MediaAccessLog"("sessionId");

-- CreateIndex
CREATE INDEX "MediaAccessLog_ipAddress_idx" ON "MediaAccessLog"("ipAddress");

-- CreateIndex
CREATE INDEX "ContentCustodyReview_reviewer1Id_idx" ON "ContentCustodyReview"("reviewer1Id");

-- CreateIndex
CREATE INDEX "ContentCustodyReview_reviewer2Id_idx" ON "ContentCustodyReview"("reviewer2Id");

-- CreateIndex
CREATE INDEX "ContentCustodyReview_finalDecision_idx" ON "ContentCustodyReview"("finalDecision");

-- CreateIndex
CREATE UNIQUE INDEX "ContentCustodyReview_mediaId_key" ON "ContentCustodyReview"("mediaId");

-- AddForeignKey
ALTER TABLE "MediaAccessLog" ADD CONSTRAINT "MediaAccessLog_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCustodyReview" ADD CONSTRAINT "ContentCustodyReview_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
