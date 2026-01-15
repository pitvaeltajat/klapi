import { describe, it, expect } from 'vitest';
import { visibleItemsWhere } from '../utils/itemQueries';

describe('Item filtering query', () => {
  it('should filter for normal items only', () => {
    expect(visibleItemsWhere).toEqual({
      type: 'normal',
    });
  });

  it('should exclude temporary items from the where clause', () => {
    expect(visibleItemsWhere.type).toBe('normal');
    expect(visibleItemsWhere.type).not.toBe('temporary');
  });
});
