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

export function boxContents(
  items: ContentRow[] | undefined | null,
  /** The loan being handed over or taken back — its own lines are not "elsewhere". */
  loanId: string,
  at: Date = new Date(),
): BoxContent[] {
  const now = at.getTime();
  return (items ?? []).map((item) => ({
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
