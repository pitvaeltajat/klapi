/**
 * Applies the September 2026 kalusto stocktake: renames, new amounts and a
 * sijainti under Kalusto for every counted kama, and creates the ones Klapi
 * did not have yet.
 *
 *   DATABASE_URL=… pnpm tsx scripts/apply-inventory.ts          # dry run
 *   DATABASE_URL=… pnpm tsx scripts/apply-inventory.ts --apply  # write
 *
 * The rows live in `scripts/data/inventory-2026-09.json`. A row with an `id`
 * updates that kama — keyed by id, never by name (see the note in
 * `scripts/merge-users.ts`); `was` is its name at the time, for review only,
 * and `guess` marks a match made by judgment rather than by name. A row
 * without an `id` creates a kama. `box` is the sub-sijainti under Kalusto, or
 * "" for Kalusto itself (build the tree first: `seed-kalusto-locations.ts`).
 *
 * Every id must still be a live, normal kama and every sijainti must resolve,
 * or nothing is written. Re-running is safe: an update that is already in
 * place is a no-op, and a create whose name already exists as a live kama is
 * skipped. History is written in the same transaction, marked as the stocktake.
 */

import { PrismaClient, type Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import rows from './data/inventory-2026-09.json';

interface Row {
  name: string;
  amount: number;
  box: string;
  guess: boolean;
  id?: string;
  was?: string;
}

const ROOT = 'Kalusto';
const NOTE = 'Inventaario 9/2026';

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const problems: string[] = [];

  const plain = await prisma.location.findMany({
    where: { itemId: null },
    select: { id: true, name: true, parentId: true },
  });
  const roots = plain.filter((l) => l.name.trim() === ROOT && !l.parentId);
  if (roots.length !== 1) problems.push(`${roots.length} ylintä sijaintia nimellä "${ROOT}"`);
  const root = roots[0];

  /** "" → Kalusto, otherwise its child of that name. */
  const locationFor = (box: string) => {
    if (!root) return null;
    if (!box) return { id: root.id, path: ROOT };
    const matches = plain.filter((l) => l.parentId === root.id && l.name.trim() === box);
    if (matches.length !== 1) {
      problems.push(`${matches.length} sijaintia "${ROOT} / ${box}"`);
      return null;
    }
    return { id: matches[0].id, path: `${ROOT} / ${box}` };
  };

  const data = rows as Row[];
  const ids = data.flatMap((r) => (r.id ? [r.id] : []));
  const existing = new Map(
    (
      await prisma.item.findMany({
        where: { id: { in: ids } },
        include: { location: { select: { name: true } }, asLocation: { select: { id: true } } },
      })
    ).map((i) => [i.id, i]),
  );
  const liveNames = new Set(
    // Normal kamat only: prod has "Jakoavain" and friends as temporary omat
    // kamat typed in at the kiosk, which is exactly why they need a real row.
    (
      await prisma.item.findMany({ where: { deletedAt: null, type: 'normal' }, select: { name: true } })
    ).map((i) =>
      i.name.trim(),
    ),
  );

  type Plan =
    | { kind: 'update'; row: Row; locationId: string; changed: Record<string, { from: unknown; to: unknown }> }
    | { kind: 'create'; row: Row; locationId: string; path: string }
    | { kind: 'skip'; row: Row; reason: string };
  const plans: Plan[] = [];

  for (const row of data) {
    const target = locationFor(row.box);
    if (!Number.isInteger(row.amount) || row.amount < 0) problems.push(`"${row.name}": määrä ${row.amount}`);
    if (!target) continue;

    if (!row.id) {
      plans.push(
        liveNames.has(row.name)
          ? { kind: 'skip', row, reason: 'on jo olemassa' }
          : { kind: 'create', row, locationId: target.id, path: target.path },
      );
      continue;
    }

    const item = existing.get(row.id);
    if (!item || item.deletedAt || item.type !== 'normal') {
      problems.push(`"${row.was}" (${row.id}) ei ole enää elävä normaali kama`);
      continue;
    }
    // A säilytyspaikka's sijainti row carries its name; renaming it here would
    // leave the two out of step. None were counted, so refuse rather than sync.
    if (item.asLocation) {
      problems.push(`"${item.name}" on säilytyspaikka — muokkaa sitä käsin`);
      continue;
    }
    const changed: Record<string, { from: unknown; to: unknown }> = {};
    if (item.name !== row.name) changed.name = { from: item.name, to: row.name };
    if (item.amount !== row.amount) changed.amount = { from: item.amount, to: row.amount };
    if (item.locationId !== target.id) {
      changed.location = { from: item.location?.name ?? null, to: target.path };
    }
    plans.push({ kind: 'update', row, locationId: target.id, changed });
  }

  for (const p of plans) {
    const flag = p.row.guess ? '  [ARVAUS]' : '';
    if (p.kind === 'create') {
      console.log(`+ ${p.row.name} · ${p.row.amount} kpl · ${p.path}`);
    } else if (p.kind === 'skip') {
      console.log(`= ${p.row.name} (${p.reason})`);
    } else if (Object.keys(p.changed).length === 0) {
      console.log(`= ${p.row.name}${flag}`);
    } else {
      const parts = Object.entries(p.changed).map(([k, v]) => `${k}: ${v.from} → ${v.to}`);
      console.log(`~ ${p.row.was} → ${parts.join(' · ')}${flag}`);
    }
  }
  const count = (k: Plan['kind']) => plans.filter((p) => p.kind === k).length;
  console.log(
    `\n${count('update')} päivitystä (${plans.filter((p) => p.kind === 'update' && Object.keys(p.changed).length > 0).length} muuttuu), ${count('create')} uutta, ${count('skip')} ohitettu`,
  );

  if (problems.length > 0) {
    console.error('\nKeskeytetty, mitään ei kirjoitettu:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }
  if (!apply) {
    console.log('Kuivaharjoitus — aja uudelleen --apply kirjoittaaksesi.');
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      for (const p of plans) {
        if (p.kind === 'update' && Object.keys(p.changed).length > 0) {
          await tx.item.update({
            where: { id: p.row.id },
            data: { name: p.row.name, amount: p.row.amount, locationId: p.locationId },
          });
          await tx.itemHistory.create({
            data: {
              itemId: p.row.id!,
              action: 'UPDATED',
              details: { changed: p.changed, note: NOTE } as Prisma.InputJsonValue,
            },
          });
        }
        if (p.kind === 'create') {
          const item = await tx.item.create({
            data: { name: p.row.name, amount: p.row.amount, locationId: p.locationId },
          });
          await tx.itemHistory.create({
            data: {
              itemId: item.id,
              action: 'CREATED',
              details: {
                name: p.row.name,
                amount: p.row.amount,
                location: p.path,
                categories: [],
                note: NOTE,
              },
            },
          });
        }
      }
    },
    { timeout: 60_000 },
  );
  console.log('Valmis.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
