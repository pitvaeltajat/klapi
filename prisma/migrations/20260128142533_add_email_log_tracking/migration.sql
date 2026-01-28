-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('EXPIRING_LOAN_REMINDER', 'PICKUP_REMINDER', 'OVERDUE_USER_REMINDER', 'OVERDUE_ADMIN_NOTIFICATION', 'OLD_BOX_ADMIN_NOTIFICATION');

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "emailType" "EmailType" NOT NULL,
    "loanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_loanId_emailType_sentAt_idx" ON "EmailLog"("loanId", "emailType", "sentAt");

-- CreateIndex
CREATE INDEX "EmailLog_userId_emailType_sentAt_idx" ON "EmailLog"("userId", "emailType", "sentAt");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
