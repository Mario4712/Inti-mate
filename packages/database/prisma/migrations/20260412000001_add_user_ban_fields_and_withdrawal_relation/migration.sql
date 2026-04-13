-- AlterTable: add ban and login tracking fields to User
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3),
                   ADD COLUMN "bannedAt"    TIMESTAMP(3),
                   ADD COLUMN "banReason"   TEXT;

-- AddForeignKey: Withdrawal -> User
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
