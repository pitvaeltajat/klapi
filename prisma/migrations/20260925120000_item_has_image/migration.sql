-- Whether the kama has a photo in the bucket. NULL means "not known yet": the
-- browser keeps probing S3 for those, and the resolveItemImages cron fills the
-- answer in (its first run is the backfill for every existing kama).
ALTER TABLE "Item" ADD COLUMN "hasImage" BOOLEAN;
