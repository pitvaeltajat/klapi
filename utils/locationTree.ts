/**
 * Sijainnit form a tree: "Kalusto / Hylly 3 / Sininen työkalupakki".
 *
 * Two kinds of edge make it up. A plain sijainti names its parent in
 * `parentId`. A säilytyspaikka (a sijainti that *is* a kama, see
 * `utils/containers.ts`) has no parent of its own — it sits wherever its kama
 * is stored, so its parent is that kama's `locationId`. Reading both through
 * `parentOf` is what lets a box on a shelf show up under the shelf without the
 * two ever being kept in step.
 *
 * Client-safe (no Prisma): the pickers build their labels from the same rows
 * the server validates a move against.
 */

export interface LocationNode {
  id: string;
  name: string;
  parentId: string | null;
  /** Set on a säilytyspaikka: where its kama is kept. */
  item?: { locationId: string | null } | null;
}

/** Separator between the levels of a path, as shown in every picker. */
export const PATH_SEPARATOR = ' / ';

/** Deeper than any real storage room; stops a corrupted chain from spinning. */
const MAX_DEPTH = 20;

const parentOf = (node: LocationNode): string | null =>
  node.item ? node.item.locationId : node.parentId;

/** The chain from the root down to `id`, inclusive. Cycle- and depth-guarded. */
export function ancestry<T extends LocationNode>(byId: Map<string, T>, id: string): T[] {
  const chain: T[] = [];
  const seen = new Set<string>();
  let current = byId.get(id);
  while (current && !seen.has(current.id) && chain.length < MAX_DEPTH) {
    seen.add(current.id);
    chain.unshift(current);
    const parent = parentOf(current);
    current = parent ? byId.get(parent) : undefined;
  }
  return chain;
}

/** Every sijainti with its full path, sorted the way a Finnish reader expects. */
export function withPaths<T extends LocationNode>(
  locations: T[],
): (T & { path: string; depth: number })[] {
  const byId = new Map(locations.map((l) => [l.id, l]));
  const collator = new Intl.Collator('fi');
  const rows = locations.map((l) => {
    const names = ancestry(byId, l.id).map((c) => c.name);
    return { names, row: { ...l, path: names.join(PATH_SEPARATOR), depth: names.length - 1 } };
  });
  // Sort level by level, so "Kalusto / Hylly" never lands between "Kalusto"
  // and "Kalusto 2" on the strength of the separator's code point.
  rows.sort((a, b) => {
    for (let i = 0; i < Math.min(a.names.length, b.names.length); i++) {
      const cmp = collator.compare(a.names[i], b.names[i]);
      if (cmp !== 0) return cmp;
    }
    return a.names.length - b.names.length;
  });
  return rows.map((r) => r.row);
}

/**
 * Whether `parentId` may become the parent of `id`: not itself, and not
 * anything already underneath it — either would close a loop.
 */
export function canBeParent(locations: LocationNode[], id: string, parentId: string): boolean {
  if (id === parentId) return false;
  const byId = new Map(locations.map((l) => [l.id, l]));
  return !ancestry(byId, parentId).some((l) => l.id === id);
}
