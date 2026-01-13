-- AlterTable: Add boxId to Loan
ALTER TABLE "Loan" ADD COLUMN "boxId" TEXT;

-- Data Migration: Move box associations from items to loans
-- This finds all reservations where the item has a boxId, and updates the loan with that boxId
-- Note: If a loan has multiple items with different boxes, this takes the first one
UPDATE "Loan" l
SET "boxId" = (
  SELECT i."boxId"
  FROM "Reservation" r
  JOIN "Item" i ON r."itemId" = i.id
  WHERE r."loanId" = l.id
    AND i."boxId" IS NOT NULL
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM "Reservation" r
  JOIN "Item" i ON r."itemId" = i.id
  WHERE r."loanId" = l.id
    AND i."boxId" IS NOT NULL
);

-- AlterTable: Drop boxId from Item
ALTER TABLE "Item" DROP COLUMN "boxId";

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "Box"("id") ON DELETE SET NULL ON UPDATE CASCADE;
