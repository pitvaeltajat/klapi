-- CreateEnum
CREATE TYPE "AnnouncementKind" AS ENUM ('KORJATTAVAA', 'TIEDOKSI');

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "kind" "AnnouncementKind" NOT NULL DEFAULT 'TIEDOKSI',
ADD COLUMN     "reportId" TEXT;

-- CreateIndex
CREATE INDEX "Announcement_reportId_idx" ON "Announcement"("reportId");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
