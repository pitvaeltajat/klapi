/*
  Warnings:

  - The primary key for the `Location` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `locationId` on the `Location` table. All the data in the column will be lost.
  - Added the required column `amount` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locationId` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Loan` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `Location` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `itemId` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `loanId` to the `Reservation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_id_fkey";

-- DropForeignKey
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_id_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "itemId";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "loanId";

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "amount" INTEGER NOT NULL,
ADD COLUMN     "locationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Location" DROP CONSTRAINT "Location_pkey",
DROP COLUMN "locationId",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "Location_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "itemId" TEXT NOT NULL,
ADD COLUMN     "loanId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
