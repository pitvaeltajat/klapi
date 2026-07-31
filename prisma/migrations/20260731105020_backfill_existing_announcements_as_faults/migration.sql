-- Every announcement written before the kind split was rendered to loaners in
-- destructive red, and the composer asked for "puute, rikkoutuminen tai
-- käyttörajoitus" — i.e. they are all faults. The new column defaults to
-- TIEDOKSI (correct for new notices), so backfill the existing rows rather than
-- silently downgrading live warnings to neutral heads-ups.
UPDATE "Announcement" SET "kind" = 'KORJATTAVAA';
