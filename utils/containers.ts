import prisma from '@/utils/prisma';

/**
 * A kama that is also a säilytyspaikka — "Sininen työkalupakki" — is one `Item`
 * plus one `Location` row pointing back at it. This is the only place that pair
 * is made, broken or kept in step; what it means for availability lives in
 * `utils/availability.ts`.
 */

/** Thrown rather than returned so a route can answer 409 without inventing a
 *  second return shape for the ordinary case. */
export class ContainerNotEmptyError extends Error {
  constructor(public readonly count: number) {
    super(`Säilytyspaikassa on vielä ${count} kamaa`);
    this.name = 'ContainerNotEmptyError';
  }
}

/**
 * Turn a kama into a säilytyspaikka, or stop it being one.
 *
 * Emptying is refused while anything is still stored inside: `Item.locationId`
 * cascades on delete, so dropping a sijainti that still has kamat in it would
 * take those kamat with it.
 */
export async function setItemAsContainer(itemId: string, name: string, container: boolean) {
  const existing = await prisma.location.findUnique({
    where: { itemId },
    select: { id: true, name: true, _count: { select: { items: true } } },
  });

  if (container) {
    if (!existing) {
      await prisma.location.create({ data: { name, itemId } });
    } else if (existing.name !== name) {
      await prisma.location.update({ where: { id: existing.id }, data: { name } });
    }
    return;
  }

  if (!existing) return;
  if (existing._count.items > 0) throw new ContainerNotEmptyError(existing._count.items);
  await prisma.location.delete({ where: { id: existing.id } });
}

/**
 * A renamed kama leaves its sijainti row carrying the old name, which is the
 * name every *other* kama's Sijainti column then shows. `updateMany` so the
 * ordinary kama — which has no sijainti row of its own — costs one no-op write
 * rather than a lookup.
 */
export async function syncContainerName(itemId: string, name: string) {
  await prisma.location.updateMany({ where: { itemId }, data: { name } });
}
