-- A lainattava sijainti (Location.itemId set) used to take its place in the
-- tree from its kama's own sijainti. It is now an ordinary node: copy that
-- place into parentId, where every other sijainti keeps it.
UPDATE "Location" AS l
SET "parentId" = i."locationId"
FROM "Item" AS i
WHERE l."itemId" = i."id"
  AND l."parentId" IS NULL
  AND i."locationId" IS NOT NULL
  AND i."locationId" <> l."id";
