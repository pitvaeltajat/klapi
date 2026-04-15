-- CreateEnum
CREATE TYPE "LoanHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'APPROVED', 'REJECTED', 'STARTED', 'RETURNED_TO_BOX', 'PROCESSED_FROM_BOX');

-- CreateTable
CREATE TABLE "LoanHistory" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "action" "LoanHistoryAction" NOT NULL,
    "details" JSONB,
    "actedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoanHistory_loanId_createdAt_idx" ON "LoanHistory"("loanId", "createdAt");

-- AddForeignKey
ALTER TABLE "LoanHistory" ADD CONSTRAINT "LoanHistory_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanHistory" ADD CONSTRAINT "LoanHistory_actedById_fkey" FOREIGN KEY ("actedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
