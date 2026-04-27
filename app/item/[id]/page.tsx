export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { notFound } from 'next/navigation';
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
      reservations: {
        include: {
          loan: true,
          item: { select: { name: true } },
        },
      },
    },
  });

  if (!item || item.deletedAt) notFound();

  return <ItemView item={serialize(item)} />;
}
