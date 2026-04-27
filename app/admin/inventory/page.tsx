export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import InventoryView from './InventoryView';

export const metadata = { title: 'Varastonhallinta | Klapi' };

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') redirect('/');

  const [items, categories, locations] = await Promise.all([
    prisma.item.findMany({
      include: { categories: true, location: true },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <InventoryView
      initialItems={serialize(items)}
      categories={serialize(categories)}
      locations={serialize(locations)}
    />
  );
}
