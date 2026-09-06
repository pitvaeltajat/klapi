/**
 * "Is this session sitting at the kaluston kone?"
 *
 * A kiosk login answers yes, and so does an admin who has PIN-elevated on top
 * of one: elevation flips `group` to ADMIN (`lib/auth.ts`), so a bare
 * `group === 'KIOSK'` test quietly turns the shared terminal into somebody's
 * personal admin browser for the next half hour — the loan flow loses the
 * Lainaaja picker, loans stop starting as INUSE, and the basket follows the
 * admin around instead of being handed to the next person in the queue.
 *
 * `elevatedById` is what separates "an admin standing at the kiosk" from "a
 * real admin login": it is set only by the PIN flow, which refuses any base
 * session that isn't a KIOSK user, and it is cleared together with
 * `adminExpiry` the moment the elevation lapses or looks forged.
 *
 * Deliberately client-safe (no Prisma): the same predicate decides what the
 * cart renders and what `loan/submitLoan` does with the result.
 */

export interface KioskSessionUser {
  group?: string | null;
  elevatedById?: string | null;
}

export function isKioskMachine(user: KioskSessionUser | null | undefined): boolean {
  if (!user) return false;
  return user.group === 'KIOSK' || (user.group === 'ADMIN' && Boolean(user.elevatedById));
}

/**
 * Whether a loan being created is one the borrower is walking away with right
 * now — the kiosk case — rather than a booking for later. Only that first kind
 * may be created already INUSE.
 *
 * The start time comes from the browser, so a minute of clock skew is allowed;
 * anything further ahead is a reservation whatever machine it was made on.
 */
const START_SKEW_MS = 60 * 1000;

export function loanStartsNow(startTime: Date | string | number, now = new Date()): boolean {
  const start = new Date(startTime).getTime();
  return Number.isFinite(start) && start <= now.getTime() + START_SKEW_MS;
}
