import { describe, it, expect } from 'vitest';
import { serialize } from '../utils/serialize';

describe('serialize', () => {
  it('should pass through primitive values', () => {
    expect(serialize('hello')).toBe('hello');
    expect(serialize(42)).toBe(42);
    expect(serialize(true)).toBe(true);
    expect(serialize(null)).toBe(null);
  });

  it('should serialize plain objects', () => {
    const obj = { name: 'Test', amount: 5 };
    expect(serialize(obj)).toEqual({ name: 'Test', amount: 5 });
  });

  it('should convert Date objects to ISO strings', () => {
    const date = new Date('2026-03-15T12:00:00.000Z');
    const result = serialize({ createdAt: date });
    expect(result.createdAt).toBe('2026-03-15T12:00:00.000Z');
    expect(typeof result.createdAt).toBe('string');
  });

  it('should handle nested objects with dates', () => {
    const data = {
      loan: {
        id: 'loan-1',
        startTime: new Date('2026-03-01T18:00:00.000Z'),
        endTime: new Date('2026-03-05T18:00:00.000Z'),
        reservations: [
          {
            id: 'res-1',
            createdAt: new Date('2026-02-28T10:00:00.000Z'),
          },
        ],
      },
    };

    const result = serialize(data);
    expect(result.loan.startTime).toBe('2026-03-01T18:00:00.000Z');
    expect(result.loan.endTime).toBe('2026-03-05T18:00:00.000Z');
    expect(result.loan.reservations[0].createdAt).toBe('2026-02-28T10:00:00.000Z');
  });

  it('should handle arrays', () => {
    const arr = [1, 'two', { three: 3 }];
    expect(serialize(arr)).toEqual([1, 'two', { three: 3 }]);
  });

  it('should strip undefined values (JSON.stringify behavior)', () => {
    const obj = { a: 1, b: undefined, c: 'hello' };
    const result = serialize(obj);
    expect(result).toEqual({ a: 1, c: 'hello' });
    expect('b' in result).toBe(false);
  });

  it('should return a new object (not the same reference)', () => {
    const obj = { name: 'Test' };
    const result = serialize(obj);
    expect(result).toEqual(obj);
    expect(result).not.toBe(obj);
  });

  it('should handle empty objects and arrays', () => {
    expect(serialize({})).toEqual({});
    expect(serialize([])).toEqual([]);
  });

  it('should handle objects resembling Prisma model output', () => {
    const loanData = {
      id: 'clx123',
      status: 'ACCEPTED',
      startTime: new Date('2026-06-01T18:00:00.000Z'),
      endTime: new Date('2026-06-07T18:00:00.000Z'),
      description: 'Kesäretki',
      createdAt: new Date('2026-05-15T10:30:00.000Z'),
      updatedAt: new Date('2026-05-15T10:30:00.000Z'),
      user: {
        id: 'user-1',
        name: 'Matti Virtanen',
        email: 'matti@example.com',
      },
      reservations: [
        {
          id: 'res-1',
          amount: 2,
          itemId: 'item-1',
          item: { id: 'item-1', name: 'Teltta', amount: 5 },
        },
      ],
    };

    const result = serialize(loanData);

    expect(result.id).toBe('clx123');
    expect(typeof result.startTime).toBe('string');
    expect(typeof result.createdAt).toBe('string');
    expect(result.user.name).toBe('Matti Virtanen');
    expect(result.reservations[0].item.name).toBe('Teltta');
  });
});
