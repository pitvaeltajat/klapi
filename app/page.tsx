export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import {
  visibleItemsWhere,
  itemsWithRelationsInclude,
  getPopularityMap,
} from '@/utils/itemQueries';
import HomeClient from './HomeClient';

export const metadata = { title: 'Etusivu | Klapi' };

export default async function HomePage() {
  const [items, categories, popularity] = await Promise.all([
    prisma.item.findMany({
      where: visibleItemsWhere,
      include: itemsWithRelationsInclude,
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({ include: { items: true } }),
    getPopularityMap(),
  ]);
  // Attach the rolling-window booking count so the client can offer a
  // "Suosituimmat" sort. Alphabetical order from the query is kept as the
  // stable tiebreaker.
  const itemsWithScore = items.map((item) => ({
    ...item,
    popularity: popularity[item.id] ?? 0,
  }));
  return <HomeClient items={serialize(itemsWithScore)} categories={serialize(categories)} />;
}
