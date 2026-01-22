-- CreateEnum
CREATE TYPE "reportCreated" AS ENUM ('BEFORE_LOAN', 'AFTER_LOAN');

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "created" "reportCreated" NOT NULL DEFAULT 'AFTER_LOAN';
