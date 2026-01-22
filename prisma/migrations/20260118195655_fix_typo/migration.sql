/*
  Warnings:

  - The `created` column on the `Report` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ReportCreated" AS ENUM ('BEFORE_LOAN', 'AFTER_LOAN');

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "created",
ADD COLUMN     "created" "ReportCreated" NOT NULL DEFAULT 'AFTER_LOAN';

-- DropEnum
DROP TYPE "reportCreated";
