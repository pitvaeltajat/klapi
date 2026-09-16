/**
 * Builds the Kalusto sijainti tree: "Kalusto / Työkaluseinä", "Kalusto /
 * Lukkokaappi", … (list reviewed by hand, 2026-09-16). Only the sijainnit —
 * no kama is moved; that is done afterwards in the Kamat table.
 *
 *   DATABASE_URL=… pnpm tsx scripts/seed-kalusto-locations.ts          # dry run
 *   DATABASE_URL=… pnpm tsx scripts/seed-kalusto-locations.ts --apply  # write
 *
 * Needs the `20260916120000_location_parent` migration on that database.
 *
 * Idempotent, and adopts rather than duplicates: a top-level sijainti that
 * already carries one of these names (trimmed — prod names have carried
 * whitespace dirt) is moved under Kalusto, so the kamat already in it come
 * along. Anything ambiguous — two sijainnit with the same name, or one already
 * filed under some other parent — aborts the whole run before a single write.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const ROOT = 'Kalusto';

const CHILDREN = [
  'Työkaluseinä',
  'Erikoissahat',
  'Mitat',
  'Avaimet, pihdit, meisselit',
  'Taltat, viilat, höylät',
  'Muut työkalut',
  'Puukot, leikkurit',
  'Kirveet',
  'Lukkokaappi',
  'Valaisimet',
  'Kiipeilyvaljaat',
  'Tolppakengät',
  'Kiipeilyköydet',
  'Kalustonhoitajan pöytä',
  'Jatkojohdot',
  'Trangiat',
  'Trangian varaosat',
  'Myrskylyhdyt',
  'Omnifuel + polttoaine',
  'Sinolit',
  'Vajaat kaasut/Täydet kaasut',
  'Rastiliput',
  'Nuotioastiat',
  'Seinähylly vasen',
  'Laulukirjat',
  'Vaellusteltat',
  'Pelastusliivit',
];

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // Säilytyspaikat are kamat and are named on the kama — never adopt one.
  const plain = await prisma.location.findMany({
    where: { itemId: null },
    select: { id: true, name: true, parentId: true, _count: { select: { items: true } } },
  });
  const named = (name: string) => plain.filter((l) => l.name.trim() === name);
  const problems: string[] = [];

  const roots = named(ROOT);
  if (roots.length > 1) problems.push(`${roots.length} sijaintia nimellä "${ROOT}": ${roots.map((r) => r.id).join(', ')}`);
  if (roots[0]?.parentId) problems.push(`"${ROOT}" (${roots[0].id}) on jo toisen sijainnin alla`);
  const root = roots[0];

  type Step = { name: string; action: 'create' | 'adopt' | 'ok'; id?: string; items?: number };
  const steps: Step[] = CHILDREN.map((name) => {
    const matches = named(name);
    if (matches.length > 1) {
      problems.push(`${matches.length} sijaintia nimellä "${name}": ${matches.map((m) => m.id).join(', ')}`);
      return { name, action: 'ok' };
    }
    const [match] = matches;
    if (!match) return { name, action: 'create' };
    if (root && match.parentId === root.id) return { name, action: 'ok', id: match.id, items: match._count.items };
    if (match.parentId) problems.push(`"${name}" (${match.id}) on jo toisen sijainnin alla`);
    if (match.id === root?.id) problems.push(`"${name}" on sama kuin juuri`);
    return { name, action: 'adopt', id: match.id, items: match._count.items };
  });

  console.log(`${ROOT}: ${root ? `käytetään olemassa olevaa (${root.id}, ${root._count.items} kamaa)` : 'luodaan'}`);
  for (const s of steps) {
    const label = { create: 'luodaan', adopt: 'siirretään Kaluston alle', ok: 'valmiina' }[s.action];
    console.log(`  ${ROOT} / ${s.name}: ${label}${s.id ? ` (${s.id}, ${s.items} kamaa)` : ''}`);
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

  await prisma.$transaction(async (tx) => {
    const rootId = root?.id ?? (await tx.location.create({ data: { name: ROOT } })).id;
    for (const s of steps) {
      if (s.action === 'create') await tx.location.create({ data: { name: s.name, parentId: rootId } });
      if (s.action === 'adopt') await tx.location.update({ where: { id: s.id }, data: { parentId: rootId } });
    }
  });
  console.log('\nValmis.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
