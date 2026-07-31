import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

/** How many handled huomiot the archive returns at once. */
const LIMIT = 100;

/**
 * The huomiot archive: loaner-written huomiot that have already been marked
 * hoidetuksi. `/notices` only renders the triage queue (OPEN + IN_PROGRESS),
 * so without this a huomio vanished from the page the moment it was handled —
 * the only way back to it was the loan it was written on.
 *
 * It is fetched on demand rather than in the page payload because the queue is
 * short and the archive only grows: every /notices render for every admin would
 * otherwise drag along every huomio ever written, with its loan and items.
 */
export async function GET() {
  try {
    const { denied } = await requireAdmin();
    if (denied) return denied;

    const reports = await prisma.report.findMany({
      where: { status: 'RESOLVED' },
      orderBy: { createdAt: 'desc' },
      take: LIMIT + 1,
      include: {
        loan: {
          include: {
            reservations: { include: { item: true } },
            user: { select: { name: true } },
          },
        },
        affectedItems: { include: { item: true } },
        announcements: { select: { id: true } },
      },
    });

    const hasMore = reports.length > LIMIT;

    return NextResponse.json({ reports: reports.slice(0, LIMIT), hasMore, limit: LIMIT });
  } catch (error) {
    console.error('Virhe haettaessa käsiteltyjä huomioita:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
