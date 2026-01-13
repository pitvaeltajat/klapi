-- Update existing PENDING loans to ACCEPTED
UPDATE "Loan" SET status = 'ACCEPTED' WHERE status = 'PENDING';

-- AlterEnum
ALTER TYPE "LoanStatus" RENAME TO "LoanStatus_old";
CREATE TYPE "LoanStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'INUSE', 'IN_BOX', 'RETURNED');
ALTER TABLE "Loan" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Loan" ALTER COLUMN "status" TYPE "LoanStatus" USING ("status"::text::"LoanStatus");
ALTER TABLE "Loan" ALTER COLUMN "status" SET DEFAULT 'ACCEPTED';
DROP TYPE "LoanStatus_old";
