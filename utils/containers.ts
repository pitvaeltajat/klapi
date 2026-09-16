import prisma from '@/utils/prisma';
import { canBeParent } from '@/utils/locationTree';

/**
 * A lainattava sijainti — "Sininen työkalupakki" — is a sijainti in the tree
 * like any other, which can also be lent out. Loans reserve kamat, so it has a
 * kama of its own behind it (`Location.itemId`): that kama is what goes in the
 * cart, and lending it takes everything in the sijainti's subtree with it (see
 * `utils/availability.ts`).
 *
 * The sijainti is the source of truth; the kama mirrors it. Its name is the
 * sijainti's name and its own sijainti is the sijainti's parent. This file is
 * the only place that pair is made, broken or kept in step.
 */

/** Thrown when a kama edit would move a lainattava sijainti inside itself. */
export class ContainerCycleError extends Error {
  constructor() {
    super('Sijaintia ei voi siirtää itsensä tai oman alasijaintinsa sisään');
    this.name = 'ContainerCycleError';
  }
}

/**
 * Switch "lainattava" on or off. On creates the kama (one of it, named after
 * the sijainti, stored in its parent). Off archives that kama and unlinks it —
 * its loan history stays with the archived row, and the sijainti with its
 * contents is untouched.
 */
export async function setLocationLoanable(locationId: string, loanable: boolean) {
  const location = await prisma.location.findUniqueOrThrow({
    where: { id: locationId },
    select: { name: true, parentId: true, itemId: true },
  });

  if (loanable) {
    if (location.itemId) return;
    await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: { name: location.name, amount: 1, locationId: location.parentId },
      });
      await tx.location.update({ where: { id: locationId }, data: { itemId: item.id } });
    });
    return;
  }

  if (!location.itemId) return;
  await prisma.$transaction([
    prisma.location.update({ where: { id: locationId }, data: { itemId: null } }),
    prisma.item.update({ where: { id: location.itemId }, data: { deletedAt: new Date() } }),
  ]);
}

/**
 * After a lainattava sijainti is renamed or moved on the Sijainnit page, bring
 * its kama along. A no-op for an ordinary sijainti.
 */
export async function syncLoanableItem(locationId: string) {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { name: true, parentId: true, itemId: true },
  });
  if (!location?.itemId) return;
  await prisma.item.update({
    where: { id: location.itemId },
    data: { name: location.name, locationId: location.parentId },
  });
}

/**
 * The other direction: the kama behind a lainattava sijainti was renamed in the
 * Kamat table. `updateMany` so an ordinary kama costs one no-op write.
 */
export async function syncContainerName(itemId: string, name: string) {
  await prisma.location.updateMany({ where: { itemId }, data: { name } });
}

/**
 * Call *before* writing a kama's new sijainti: refuses putting the kama behind
 * a lainattava sijainti into that sijainti's own subtree. A no-op for an
 * ordinary kama, and for an id that isn't a sijainti yet (a typed-in new one
 * can't be underneath anything).
 */
export async function assertContainerPlace(itemId: string, locationId: string | null) {
  if (!locationId) return;
  const own = await prisma.location.findUnique({ where: { itemId }, select: { id: true } });
  if (!own) return;
  const all = await prisma.location.findMany({ select: { id: true, name: true, parentId: true } });
  if (!all.some((l) => l.id === locationId)) return;
  if (!canBeParent(all, own.id, locationId)) throw new ContainerCycleError();
}

/** Then, after the write: the sijainti follows its kama to the new place. */
export async function syncContainerPlace(itemIds: string[], locationId: string | null) {
  await prisma.location.updateMany({
    where: { itemId: { in: itemIds } },
    data: { parentId: locationId },
  });
}

/**
 * A kama archived from the Kamat table stops standing behind its sijainti: the
 * sijainti simply is no longer lainattava. Restoring the kama does not relink
 * it — switch lainattava back on from Sijainnit for a fresh one.
 */
export async function unlinkArchivedContainers(itemIds: string[]) {
  await prisma.location.updateMany({ where: { itemId: { in: itemIds } }, data: { itemId: null } });
}
