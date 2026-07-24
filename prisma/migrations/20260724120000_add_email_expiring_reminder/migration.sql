-- AlterTable
-- Opt-in (default false), unlike the other notification toggles: the
-- "lainasi päättyy pian" reminder is only sent to users who ask for it.
ALTER TABLE "User" ADD COLUMN     "emailExpiringReminder" BOOLEAN NOT NULL DEFAULT false;
