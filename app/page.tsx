export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { visibleItemsWhere, itemsWithRelationsInclude } from '@/utils/itemQueries';
import HomeClient from './HomeClient';

export const metadata = { title: 'Etusivu | Klapi' };

export default async function HomePage() {
  const [items, categories] = await Promise.all([
    prisma.item.findMany({
      where: visibleItemsWhere,
      include: itemsWithRelationsInclude,
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({ include: { items: true } }),
  ]);
  return <HomeClient items={serialize(items)} categories={serialize(categories)} />;
}
