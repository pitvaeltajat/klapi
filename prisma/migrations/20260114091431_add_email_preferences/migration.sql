-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNewLoanNotification" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailWeeklyReminder" BOOLEAN NOT NULL DEFAULT true;
