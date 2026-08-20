-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mergedIntoId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
