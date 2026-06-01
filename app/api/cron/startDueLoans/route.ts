import { NextResponse } from 'next/server';
import { startDueLoans } from '@/utils/autoStartLoans';
import prisma from '@/utils/prisma';

// Auto-starts loans whose booking window has begun: every ACCEPTED loan with
// startTime <= now is moved to INUSE (with its ACCEPTED reservations). Runs on
// a schedule (see vercel.json) so loans go "in use" on their own once the
// pickup time arrives, without an admin clicking start.
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron or has authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startedIds = await startDueLoans();
    console.log(`Auto-started ${startedIds.length} loan(s)`);
    return NextResponse.json({
      message: 'Due loan start check completed',
      startedLoansCount: startedIds.length,
      startedLoanIds: startedIds,
    });
  } catch (error) {
    console.error('Error auto-starting due loans:', error);
    return NextResponse.json({ message: 'Failed to auto-start loans' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
