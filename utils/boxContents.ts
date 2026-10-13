import type { BoxContent } from '@/components/BoxContents';

/**
 * What a box should actually contain right now, for the screens that hand it
 * over and take it back.
 *
 * The list of kamat stored in a box is not the same as the list that went out
 * in it. Lending a box deliberately does not take back what somebody had
 * already borrowed out of it (see `utils/availability.ts`) — the box left one
 * vasara short. Expecting that vasara at return would have the palauttaja
 * report a kama missing that was never theirs to bring back, and the huomio
 * they file carries real consequences.
 *
 * So a content held by *another* live loan is marked rather than dropped: the
 * kiosk should still see it in the list, greyed, and know not to go looking.
 */

export interface ContentRow {
  id: string;
  name: string;
  amount: number;
  reservations: {
    loan: { id: string; startTime: Date | string; endTime: Date | string };
  }[];
}

/** A lainattava sijainti's kamat, and its sub-sijainnit' in turn. */
export interface ContentLocation {
  items: ContentRow[];
  children?: ContentLocation[];
}

/** Every kama anywhere under the sijainti, in one list. */
export function flattenContents(location: ContentLocation | null | undefined): ContentRow[] {
  if (!location) return [];
  return [...location.items, ...(location.children ?? []).flatMap(flattenContents)];
}

export function boxContents(
  location: ContentLocation | undefined | null,
  /** The loan being handed over or taken back — its own lines are not "elsewhere". */
  loanId: string,
  at: Date = new Date(),
): BoxContent[] {
  const now = at.getTime();
  return flattenContents(location).map((item) => ({
    id: item.id,
    name: item.name,
    amount: item.amount,
    outOnLoan: item.reservations.some(
      ({ loan }) =>
        loan.id !== loanId &&
        new Date(loan.startTime).getTime() <= now &&
        new Date(loan.endTime).getTime() >= now,
    ),
  }));
}

/** One content's return progress so far under a box reservation. */
export interface BoxContentReturnRow {
  itemId: string;
  returnedAmount: number;
  missingAmount: number;
}

/** A content still owed on the box, with how much of it is left to account for. */
export interface OutstandingBoxContent extends BoxContent {
  /** Units neither returned nor reported missing yet — what the screen still asks about. */
  remaining: number;
  returnedAmount: number;
  missingAmount: number;
}

/**
 * The box contents the return screen still needs an answer about: everything in
 * the box minus what has already been handed back or reported missing in an
 * earlier partial return (`BoxContentReturn`). A content whose whole amount is
 * accounted for drops off the list; one out on another loan stays, greyed, as it
 * does in `boxContents` — it was never this borrower's to bring back.
 *
 * `remaining = amount − returned − missing`, floored at 0 so a stale over-count
 * can't make a row negative.
 */
export function outstandingBoxContents(
  location: ContentLocation | undefined | null,
  loanId: string,
  returns: BoxContentReturnRow[],
  at: Date = new Date(),
): OutstandingBoxContent[] {
  const progress = new Map(returns.map((r) => [r.itemId, r]));
  return boxContents(location, loanId, at)
    .map((content) => {
      const p = progress.get(content.id);
      const returnedAmount = p?.returnedAmount ?? 0;
      const missingAmount = p?.missingAmount ?? 0;
      const remaining = Math.max(0, content.amount - returnedAmount - missingAmount);
      return { ...content, remaining, returnedAmount, missingAmount };
    })
    // A fully accounted-for content is done; one out elsewhere is shown regardless
    // (it carries no remaining of its own — the greyed row is informational).
    .filter((content) => content.outOnLoan || content.remaining > 0);
}
