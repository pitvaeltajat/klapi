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

// The catalogue payload. Resolved lazily so a fresh visit — which only shows
// the DateSelector calendar (datesSet starts false and isn't persisted) — can
// stream and paint instantly without blocking on this query. The items are
// only consumed once the user picks dates or enters browse mode, by which time
// this background fetch has finished.
async function loadCatalogue() {
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
  // stable tiebreaker. Expired announcements are dropped here so the client
  // doesn't have to re-filter on every render.
  const now = Date.now();
  const itemsWithScore = items.map((item) => ({
    ...item,
    popularity: popularity[item.id] ?? 0,
    announcements: item.announcements.filter(
      (a) => a.expiresAt === null || new Date(a.expiresAt).getTime() > now,
    ),
  }));
  return { items: serialize(itemsWithScore), categories: serialize(categories) };
}

export default function HomePage() {
  // Note: not awaited — the promise is streamed to the client and unwrapped
  // with `use()` behind a Suspense boundary only where items are needed.
  return <HomeClient cataloguePromise={loadCatalogue()} />;
}
