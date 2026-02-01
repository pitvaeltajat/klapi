-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailOldBoxNotification" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailOverdueNotification" BOOLEAN NOT NULL DEFAULT true;
