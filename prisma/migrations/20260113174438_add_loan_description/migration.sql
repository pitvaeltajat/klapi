-- AlterEnum
ALTER TYPE "Group" ADD VALUE 'KIOSK';

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "locationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "description" VARCHAR(100),
ADD COLUMN     "loaner" TEXT;

-- AlterTable
ALTER TABLE "_CategoryToItem" ADD CONSTRAINT "_CategoryToItem_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_CategoryToItem_AB_unique";
