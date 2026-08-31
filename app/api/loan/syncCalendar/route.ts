import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/apiAuth';
import { syncLoanCalendar } from '@/utils/loanCalendar';

/**
 * Force one loan's calendar event back into agreement with the loan.
 *
 * Every other route syncs as a side effect of changing something, which leaves
 * no way to repair a loan whose sync failed — or never ran at all, as for every
 * loan that predates the mirror. Editing the loan to trigger one is not an
 * option: `updateLoan` recreates the reservations with a single blanket status,
 * so a no-op save on an ongoing loan quietly un-returns whatever was already
 * back in the box.
 *
 * Awaited rather than fired into `after()`, unlike the syncs on the loan
 * routes: no user is waiting on a loan to save here, and the point of a repair
 * tool is that it tells you what it did.
 */
export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { id } = await request.json();
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ message: 'Lainan id puuttuu' }, { status: 400 });
  }

  try {
    const outcome = await syncLoanCalendar(id);
    return NextResponse.json({ outcome });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Kalenterisynkronointi epäonnistui' },
      { status: 502 },
    );
  }
}
