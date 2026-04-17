-- CreateTable
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" VARCHAR(1000),
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "fanId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Review_fanId_creatorId_key" ON "Review"("fanId", "creatorId");
CREATE INDEX IF NOT EXISTS "Review_creatorId_hidden_idx" ON "Review"("creatorId", "hidden");
CREATE INDEX IF NOT EXISTS "Review_fanId_idx" ON "Review"("fanId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
