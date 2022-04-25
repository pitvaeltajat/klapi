/*
  Warnings:

  - You are about to drop the `_ItemToLoan` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ItemToLoan" DROP CONSTRAINT "_ItemToLoan_A_fkey";

-- DropForeignKey
ALTER TABLE "_ItemToLoan" DROP CONSTRAINT "_ItemToLoan_B_fkey";

-- DropTable
DROP TABLE "_ItemToLoan";

-- CreateTable
CREATE TABLE "Location" (
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("locationId")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_id_fkey" FOREIGN KEY ("id") REFERENCES "Location"("locationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "itemId" FOREIGN KEY ("id") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "loanId" FOREIGN KEY ("id") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
