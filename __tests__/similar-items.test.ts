import { describe, it, expect } from 'vitest';
import { findSimilarItem, normalizeItemName } from '@/utils/similarItems';

const catalogue = [
  { id: 'makuupussi', name: 'Makuupussi -10°C' },
  { id: 'pussi', name: 'Makuupussin säilytyspussi' },
  { id: 'teltta', name: 'Teltta (Hilleberg Nallo 3)' },
  { id: 'kirves', name: 'Kirves' },
  { id: 'puukko', name: 'Puukko' },
];

describe('normalizeItemName', () => {
  it('drops case and punctuation', () => {
    expect(normalizeItemName('  Teltta (Hilleberg Nallo 3) ')).toBe('teltta hilleberg nallo 3');
  });
});

describe('findSimilarItem', () => {
  it('matches a hand-typed name against a longer kalusto name', () => {
    expect(findSimilarItem('makuupussi', catalogue)?.id).toBe('makuupussi');
  });

  it('matches an appended plural and a compound', () => {
    expect(findSimilarItem('Makuupussit', catalogue)?.id).toBe('makuupussi');
    expect(findSimilarItem('Teltta', catalogue)?.id).toBe('teltta');
  });

  it('picks the closest of several matching kalusto names', () => {
    expect(findSimilarItem('Makuupussi', catalogue)?.id).toBe('makuupussi');
  });

  // The known ceiling of substring matching, asserted so it is a decision and
  // not a surprise: an inflection that rewrites the stem is missed.
  it('misses a stem-changing inflection', () => {
    expect(findSimilarItem('Kirveet', catalogue)).toBeNull();
  });

  it('prefers the exact name over a substring one', () => {
    expect(findSimilarItem('Kirves', catalogue)?.id).toBe('kirves');
  });

  it('answers null for a kama the kalusto does not have', () => {
    expect(findSimilarItem('Kanootin peräsin', catalogue)).toBeNull();
    expect(findSimilarItem('   ', catalogue)).toBeNull();
  });

  it('does not let a short name match everything', () => {
    expect(findSimilarItem('Puu', catalogue)).toBeNull();
  });
});
