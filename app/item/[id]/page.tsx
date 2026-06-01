export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ItemView from './ItemView';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: `${item?.name || 'Kama'} | Klapi` };
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      categories: true,
      location: true,
      announcements: { orderBy: { createdAt: 'desc' } },
      reservations: {
        include: {
          loan: true,
          item: { select: { name: true } },
        },
      },
    },
  });

  if (!item || item.deletedAt) notFound();

  // Edit history and condition reports are admin-only info — only pay for those
  // queries when an admin is viewing (item pages are part of the public
  // catalog). Reports also carry free-text that may name people, so keeping
  // them out of the non-admin payload entirely is a privacy win, not just a
  // perf one.
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.group === 'ADMIN';

  const [history, reportAffectedItems] = isAdmin
    ? await Promise.all([
        prisma.itemHistory.findMany({
          where: { itemId: id },
          orderBy: { createdAt: 'desc' },
          include: { actedBy: { select: { id: true, name: true, email: true } } },
        }),
        prisma.reportAffectedItem.findMany({
          where: { itemId: id },
          include: {
            report: {
              include: {
                loan: { include: { user: { select: { name: true } } } },
              },
            },
          },
        }),
      ])
    : [[], []];

  return (
    <ItemView
      item={serialize(item)}
      history={serialize(history)}
      reportAffectedItems={serialize(reportAffectedItems)}
    />
  );
}
