-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'INUSE', 'IN_BOX', 'RETURNED');

-- AlterTable: Add status column to Reservation with default ACCEPTED
ALTER TABLE "Reservation" ADD COLUMN "status" "ReservationStatus" NOT NULL DEFAULT 'ACCEPTED';

-- Migrate existing data: Copy status from parent Loan to each Reservation
-- We need to use text casting since we can't directly cast between enum types
UPDATE "Reservation" r
SET "status" = (l."status"::text)::"ReservationStatus"
FROM "Loan" l
WHERE r."loanId" = l."id";
