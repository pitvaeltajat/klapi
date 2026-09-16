/**
 * Turns the troop's työkalupakit — catalogued as plain kamat — into lainattavat
 * sijainnit, keeping each kama (id, photo, loan history), and files what was
 * counted inside each as kamat of their own stored in it. Those are separate
 * rows from the same-named kamat elsewhere (a Vasara on Työkaluseinä is not the
 * one in the pakki); the sijainti path tells them apart, and lending the pakki
 * takes its own along.
 *
 *   DATABASE_URL=… pnpm tsx scripts/convert-toolboxes.ts          # dry run
 *   DATABASE_URL=… pnpm tsx scripts/convert-toolboxes.ts --apply  # write
 *
 * Keyed by Item.id (names are free text — see scripts/merge-users.ts); the
 * name is only a comment for review. Idempotent: a pakki already converted is
 * reused, and a content already filed in it under the same name is skipped.
 * Chosen by hand, 2026-09-16.
 */

import prisma from '@/utils/prisma';
import { makeItemLoanableLocation } from '@/utils/containers';
import { withPaths } from '@/utils/locationTree';

/** `contents`: what the troop's 9/2026 count found inside, as [name, amount]. */
const TOOLBOXES: { id: string; name: string; contents: [string, number][] }[] = [
  { id: 'cl4p94acx01060ip7b21x6oze', name: 'Työkalubox harmaa', contents: [] },
  {
    id: 'cl4p94acx01080ip7yq8940il',
    name: 'Työkalupakki sininen',
    contents: [
      ['Timpurinkynä', 2],
      ['Sakset', 1],
      ['Harppi', 1],
      ['Rullamitta', 1],
      ['Työntömitta', 1],
      ['Mattoveitsi', 2],
      ['Puukko', 1],
      ['Sähkökynä', 1],
      ['Suorakulma', 1],
      ['Vatupassi pieni', 1],
      ['Vasara', 1],
      ['Siirtoleukapihdit', 2],
      ['Yleispihdit', 2],
      ['Sivuleikkurit', 2],
      ['Sähkömiehen pihdit', 1],
      ['Lukkopihdit', 1],
      ['Tongit', 2],
      ['Peltisakset', 2],
      ['Ristipäämeisseli', 5],
      ['Talttapäämeisseli', 3],
      ['Kärkimeisseli', 1],
      ['Kärkisarja Bahco', 1],
      ['Tasataltta', 1],
      ['Kourutaltta', 1],
      ['Pyöreä viila/raspi', 1],
      ['Litteä viila/raspi', 1],
      ['Puristin pieni', 2],
      ['Jakoavain/yleistyökalu', 1],
      ['Jakoavain', 1],
      ['Kuusioavainsarja Magnum', 1],
      ['Kiintoavain 6 mm', 1],
      ['Kiintoavain 7 mm', 1],
      ['Kiintoavain 8 mm', 1],
      ['Kiintoavain 9 mm', 1],
      ['Kiintoavain 10 mm', 1],
      ['Kiintoavain 11 mm', 1],
      ['Kiintoavain 12 mm', 1],
      ['Kiintoavain 13 mm', 1],
      ['Kiintoavain 14 mm', 1],
      ['Kiintoavain 15 mm', 1],
      ['Kiintoavain 16 mm', 1],
      ['Kiintoavain 17 mm', 1],
      ['Kiintoavain 18 mm', 1],
      ['Kiintoavain 19 mm', 1],
      ['Kiintoavain 20 mm', 1],
      ['Kiintoavain 21 mm', 1],
      ['Kiintoavain 22 mm', 1],
      ['Kiintoavain 23 mm', 1],
      ['Kiintoavain 24 mm', 1],
    ],
  },
  {
    id: 'cl4p94acx01070ip70sdap5ou',
    name: 'Työkalupakki ruskea',
    contents: [
      ['Timpurinkynä', 2],
      ['Sakset', 1],
      ['Rullamitta', 1],
      ['Mattoveitsi', 2],
      ['Puukko', 1],
      ['Sähkökynä', 1],
      ['Vasara', 1],
      ['Siirtoleukapihdit', 1],
      ['Yleispihdit', 2],
      ['Sivuleikkurit', 1],
      ['Ristipäämeisseli', 3],
      ['Talttapäämeisseli', 2],
      ['Jakoavain', 1],
      ['Kiintoavain 8 mm', 1],
      ['Kiintoavain 9 mm', 1],
      ['Kiintoavain 10 mm', 1],
      ['Kiintoavain 11 mm', 1],
      ['Kiintoavain 12 mm', 1],
      ['Kiintoavain 13/12 mm', 1],
      ['Kiintoavain 14 mm', 1],
      ['Kiintoavain 15 mm', 1],
      ['Kiintoavain 16 mm', 1],
      ['Kiintoavain 17 mm', 1],
      ['Kiintoavain 19 mm', 1],
    ],
  },
];

const apply = process.argv.includes('--apply');

async function main() {
  const locations = withPaths(
    await prisma.location.findMany({ select: { id: true, name: true, parentId: true } }),
  );
  const pathOf = (id: string | null) => (id ? (locations.find((l) => l.id === id)?.path ?? '?') : '(ei sijaintia)');

  if (TOOLBOXES.length === 0) {
    const candidates = await prisma.item.findMany({
      where: { deletedAt: null, type: 'normal', name: { contains: 'työkalu', mode: 'insensitive' } },
      select: { id: true, name: true, locationId: true },
    });
    for (const c of candidates) console.log(`  { id: '${c.id}', name: '${c.name}' }, // ${pathOf(c.locationId)}`);
    return;
  }

  const items = await prisma.item.findMany({
    where: { id: { in: TOOLBOXES.map((t) => t.id) } },
    select: { id: true, name: true, locationId: true, deletedAt: true, type: true, asLocation: { select: { id: true } } },
  });
  const problems: string[] = [];
  for (const t of TOOLBOXES) {
    const item = items.find((i) => i.id === t.id);
    if (!item || item.deletedAt || item.type !== 'normal') {
      problems.push(`"${t.name}" (${t.id}) ei ole elävä normaali kama`);
      continue;
    }
    const where = pathOf(item.locationId);
    const path = where === '(ei sijaintia)' ? item.name : `${where} / ${item.name}`;
    console.log(
      item.asLocation
        ? `= ${item.name}: on jo lainattava sijainti`
        : `+ ${item.name}: lainattava sijainti "${path}"`,
    );
    const filed = item.asLocation
      ? await prisma.item.findMany({
          where: { locationId: item.asLocation.id, deletedAt: null, type: 'normal' },
          select: { name: true },
        })
      : [];
    const names = t.contents.map(([n]) => n);
    if (new Set(names).size !== names.length) problems.push(`"${t.name}": sama nimi kahdesti`);
    for (const [name, amount] of t.contents) {
      if (!Number.isInteger(amount) || amount < 1) problems.push(`"${t.name} / ${name}": määrä ${amount}`);
      const done = filed.some((f) => f.name === name);
      console.log(`    ${done ? '=' : '+'} ${path} / ${name} · ${amount} kpl`);
    }
  }

  if (problems.length > 0) {
    console.error('\nKeskeytetty, mitään ei kirjoitettu:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }
  if (!apply) {
    console.log('\nKuivaharjoitus — aja uudelleen --apply kirjoittaaksesi.');
    return;
  }
  for (const t of TOOLBOXES) {
    const locationId = await makeItemLoanableLocation(t.id);
    const filed = new Set(
      (
        await prisma.item.findMany({
          where: { locationId, deletedAt: null, type: 'normal' },
          select: { name: true },
        })
      ).map((i) => i.name),
    );
    const toCreate = t.contents.filter(([name]) => !filed.has(name));
    await prisma.$transaction(async (tx) => {
      for (const [name, amount] of toCreate) {
        const item = await tx.item.create({ data: { name, amount, locationId } });
        await tx.itemHistory.create({
          data: {
            itemId: item.id,
            action: 'CREATED',
            details: { name, amount, location: t.name, categories: [], note: 'Inventaario 9/2026' },
          },
        });
      }
    });
  }
  console.log('Valmis.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
