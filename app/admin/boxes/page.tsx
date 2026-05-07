export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { ReservationStatus } from '@prisma/client';
import BoxesView from './BoxesView';

export const metadata = { title: 'Laatikot | Klapi' };

export default async function BoxesPage() {
  const [boxes, reports] = await Promise.all([
    prisma.box.findMany({
      include: {
        loans: {
          include: { reservations: { include: { item: true } } },
          where: { reservations: { some: { status: ReservationStatus.IN_BOX } } },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.report.findMany(),
  ]);

  return <BoxesView boxes={serialize(boxes)} reports={serialize(reports)} />;
}
