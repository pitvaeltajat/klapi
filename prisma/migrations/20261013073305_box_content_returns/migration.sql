-- CreateTable
CREATE TABLE "BoxContentReturn" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "returnedAmount" INTEGER NOT NULL DEFAULT 0,
    "missingAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoxContentReturn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoxContentReturn_reservationId_idx" ON "BoxContentReturn"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "BoxContentReturn_reservationId_itemId_key" ON "BoxContentReturn"("reservationId", "itemId");

-- AddForeignKey
ALTER TABLE "BoxContentReturn" ADD CONSTRAINT "BoxContentReturn_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoxContentReturn" ADD CONSTRAINT "BoxContentReturn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
