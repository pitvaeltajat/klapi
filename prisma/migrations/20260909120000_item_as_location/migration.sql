-- A sijainti can now *be* a kama: "Sininen työkalupakki" is both something you
-- borrow and a place other kamat live in. Nullable, so every existing sijainti
-- stays an ordinary shelf.
ALTER TABLE "Location" ADD COLUMN "itemId" TEXT;

CREATE UNIQUE INDEX "Location_itemId_key" ON "Location"("itemId");

ALTER TABLE "Location" ADD CONSTRAINT "Location_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
