import { describe, it, expect } from 'vitest';
import { visibleItemsWhere, activeItemsWhere } from '../utils/itemQueries';

describe('Item filtering query', () => {
  it('filters to active normal items only', () => {
    expect(visibleItemsWhere).toEqual({
      type: 'normal',
      deletedAt: null,
    });
  });

  it('excludes temporary items from the where clause', () => {
    expect(visibleItemsWhere.type).toBe('normal');
    expect(visibleItemsWhere.type).not.toBe('temporary');
  });

  it('excludes soft-archived items from the where clause', () => {
    expect(visibleItemsWhere.deletedAt).toBeNull();
  });

  it('exposes a deletedAt-only filter for paths that allow temporary items', () => {
    expect(activeItemsWhere).toEqual({ deletedAt: null });
  });
});
