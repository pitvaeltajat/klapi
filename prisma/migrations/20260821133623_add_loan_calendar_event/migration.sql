-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "calendarEventId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "calendarLoanEvents" BOOLEAN NOT NULL DEFAULT true;
