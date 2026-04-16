export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import ReportsView from './ReportsView';

export const metadata = { title: 'Raportit | Klapi' };

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      loan: {
        include: {
          reservations: { include: { item: true } },
          box: true,
          user: true,
        },
      },
      affectedItems: { include: { item: true } },
    },
  });

  return <ReportsView reports={serialize(reports)} />;
}
