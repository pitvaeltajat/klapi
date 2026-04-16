export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { notFound } from 'next/navigation';
import EditItemView from './EditItemView';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: `Muokkaa kamaa: ${item?.name || 'Tuntematon'} | Klapi` };
}

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      categories: true,
      reservations: { include: { loan: true } },
    },
  });

  if (!item) notFound();

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  return <EditItemView item={serialize(item)} categories={serialize(categories)} />;
}
