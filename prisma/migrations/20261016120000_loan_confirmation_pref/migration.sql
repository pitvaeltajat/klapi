-- The borrower's own loan-confirmation mail is now its own preference, separate
-- from the admin fleet-wide "Uudet lainat" notification it used to ride on.
ALTER TABLE "User" ADD COLUMN "emailLoanConfirmation" BOOLEAN NOT NULL DEFAULT true;

-- The per-user calendar invite is gone: loans still land on the troop's shared
-- calendar, but members are no longer added as guests, so the opt-out is moot.
ALTER TABLE "User" DROP COLUMN "calendarLoanEvents";
