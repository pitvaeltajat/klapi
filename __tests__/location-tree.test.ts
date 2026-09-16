import { describe, it, expect } from 'vitest';
import { canBeParent, withPaths, type LocationNode } from '@/utils/locationTree';

const loc = (id: string, name: string, parentId: string | null = null, item?: LocationNode['item']) => ({
  id,
  name,
  parentId,
  item,
});

describe('location tree', () => {
  const kalusto = loc('k', 'Kalusto');
  const hylly = loc('h', 'Hylly 3', 'k');
  // A säilytyspaikka's parent is where its kama is stored, not its own parentId.
  const pakki = loc('p', 'Sininen pakki', 'ignored', { locationId: 'h' });
  const kalusto2 = loc('k2', 'Kalusto 2');
  const all = [pakki, kalusto2, hylly, kalusto];

  it('builds paths through both parents and stored kamat, sorted level by level', () => {
    expect(withPaths(all).map((l) => [l.path, l.depth])).toEqual([
      ['Kalusto', 0],
      ['Kalusto / Hylly 3', 1],
      ['Kalusto / Hylly 3 / Sininen pakki', 2],
      ['Kalusto 2', 0],
    ]);
  });

  it('refuses a parent that would close a loop', () => {
    expect(canBeParent(all, 'k', 'k')).toBe(false);
    expect(canBeParent(all, 'k', 'h')).toBe(false);
    expect(canBeParent(all, 'k', 'p')).toBe(false);
    expect(canBeParent(all, 'h', 'k2')).toBe(true);
  });

  it('survives a loop already in the data', () => {
    const a = loc('a', 'A', 'b');
    const b = loc('b', 'B', 'a');
    expect(withPaths([a, b]).map((l) => l.path).sort()).toEqual(['A / B', 'B / A']);
  });
});
