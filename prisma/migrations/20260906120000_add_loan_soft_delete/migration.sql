-- AlterEnum
ALTER TYPE "LoanHistoryAction" ADD VALUE 'DELETED';
ALTER TYPE "LoanHistoryAction" ADD VALUE 'RESTORED';

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Loan_deletedAt_idx" ON "Loan"("deletedAt");
