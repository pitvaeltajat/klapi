import { NextResponse } from 'next/server';
import { ReportStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

/**
 * Triage a loaner's huomio: set its state and re-tag which kamat it concerns.
 *
 * `affectedItems` is `{ [itemId]: amount }` and is treated as the complete set
 * — sending `{}` clears the tags. (It used to skip the clear when the object
 * was empty, so untagging was impossible and tags outlived their huomio.)
 * Omitting the field entirely leaves existing tags alone.
 */
export async function POST(request: Request) {
  try {
    const { denied } = await requireAdmin();
    if (denied) return denied;

    const body = (await request.json()) as {
      id?: unknown;
      status?: unknown;
      affectedItems?: unknown;
    };
    const { id, status, affectedItems } = body;

    if (typeof id !== 'string' || id === '') {
      return NextResponse.json({ message: 'Huomion ID puuttuu' }, { status: 400 });
    }

    const isReportStatus = (value: unknown): value is ReportStatus =>
      typeof value === 'string' && (Object.values(ReportStatus) as string[]).includes(value);

    if (!isReportStatus(status)) {
      return NextResponse.json({ message: 'Virheellinen tila' }, { status: 400 });
    }

    const tags =
      affectedItems && typeof affectedItems === 'object' && !Array.isArray(affectedItems)
        ? Object.entries(affectedItems as Record<string, unknown>)
            .map(([itemId, amount]) => ({ itemId, amount: Number(amount) }))
            .filter(({ amount }) => Number.isFinite(amount) && amount > 0)
        : null;

    const report = await prisma.$transaction(async (tx) => {
      const updated = await tx.report.update({ where: { id }, data: { status } });

      if (tags !== null) {
        await tx.reportAffectedItem.deleteMany({ where: { reportId: updated.id } });
        if (tags.length > 0) {
          await tx.reportAffectedItem.createMany({
            data: tags.map(({ itemId, amount }) => ({ reportId: updated.id, itemId, amount })),
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Virhe käsiteltäessä huomiota:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
