import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireUser } from '@/utils/apiAuth';

export async function POST(request: Request) {
  try {
    const { denied } = await requireUser();
    if (denied) return denied;

    const { id, status, affectedItems } = await request.json();

    const report = await prisma.report.update({
      where: {
        id: id,
      },
      data: {
        status: status,
      },
    });

    let affected = null;
    // affectedItems is an object: { [itemId]: amount }
    if (
      affectedItems &&
      typeof affectedItems === 'object' &&
      Object.keys(affectedItems).length > 0
    ) {
      // Remove previous affected items for this report
      await prisma.reportAffectedItem.deleteMany({ where: { reportId: report.id } });
      // Convert to array for DB insert
      const affectedArray = Object.entries(affectedItems)
        .filter(([, amount]) => Number(amount) > 0)
        .map(([itemId, amount]) => ({ reportId: report.id, itemId, amount: Number(amount) }));
      if (affectedArray.length > 0) {
        affected = await prisma.reportAffectedItem.createMany({ data: affectedArray });
      }
    }

    return NextResponse.json({ report, affected });
  } catch (error) {
    console.error('Virhe muokattaessa raporttia:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
