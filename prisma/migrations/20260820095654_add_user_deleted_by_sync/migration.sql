-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedBySync" BOOLEAN NOT NULL DEFAULT false;
