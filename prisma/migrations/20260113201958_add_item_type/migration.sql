-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('normal', 'temporary');

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "type" "ItemType" NOT NULL DEFAULT 'normal';
