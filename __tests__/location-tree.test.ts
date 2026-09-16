import { describe, it, expect } from 'vitest';
import { canBeParent, withPaths } from '@/utils/locationTree';

const loc = (id: string, name: string, parentId: string | null = null) => ({ id, name, parentId });

describe('location tree', () => {
  const kalusto = loc('k', 'Kalusto');
  const hylly = loc('h', 'Hylly 3', 'k');
  // A lainattava sijainti is an ordinary node in the tree.
  const pakki = loc('p', 'Sininen pakki', 'h');
  const kalusto2 = loc('k2', 'Kalusto 2');
  const all = [pakki, kalusto2, hylly, kalusto];

  it('builds full paths, sorted level by level', () => {
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
    expect(canBeParent(all, 'h', 'p')).toBe(false);
  });

  it('survives a loop already in the data', () => {
    const a = loc('a', 'A', 'b');
    const b = loc('b', 'B', 'a');
    expect(withPaths([a, b]).map((l) => l.path).sort()).toEqual(['A / B', 'B / A']);
  });
});
