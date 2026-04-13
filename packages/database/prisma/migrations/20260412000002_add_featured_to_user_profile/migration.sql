-- AlterTable: add featured flag to UserProfile
ALTER TABLE "UserProfile" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "UserProfile_featured_idx" ON "UserProfile"("featured");
