import { describe, it, expect } from 'vitest';
import { cartReducer, initialCartState } from '@/contexts/CartContext';
import type { CartState } from '@/types';

const restorable = (over: Partial<CartState> = {}): CartState => ({
  items: [],
  description: '',
  ...over,
});

describe('cartReducer RESTORE_CART', () => {
  // The regression: CartDrawer sits below CartProvider, so React runs its
  // "seed the loaner from the session" effect BEFORE the provider's restore
  // effect. A blind spread threw that identity away and the drawer's one-shot
  // ref never re-seeded it, leaving Lainaaja empty — which disables the submit
  // button, so the member could not file a loan at all.
  it('keeps a loaner the session already seeded', () => {
    const seeded = cartReducer(initialCartState, { type: 'SET_LOANER', payload: 'Justus Jutila' });
    const withId = cartReducer(seeded, { type: 'SET_USER_ID', payload: 'user-1' });

    // What the signed-out /login page leaves in sessionStorage: no identity.
    const restored = cartReducer(withId, { type: 'RESTORE_CART', payload: restorable() });

    expect(restored.loaner).toBe('Justus Jutila');
    expect(restored.userId).toBe('user-1');
  });

  it('still restores a stored loaner when none has been seeded yet', () => {
    const restored = cartReducer(initialCartState, {
      type: 'RESTORE_CART',
      payload: restorable({ loaner: 'Matti Virtanen', userId: 'user-2' }),
    });

    expect(restored.loaner).toBe('Matti Virtanen');
    expect(restored.userId).toBe('user-2');
  });

  it('restores the basket itself', () => {
    const restored = cartReducer(initialCartState, {
      type: 'RESTORE_CART',
      payload: restorable({
        items: [{ id: 'item-1', name: 'Kattila iso', amount: 2 }],
        description: 'Pikachujen maastoretki',
      }),
    });

    expect(restored.items).toEqual([{ id: 'item-1', name: 'Kattila iso', amount: 2 }]);
    expect(restored.description).toBe('Pikachujen maastoretki');
  });
});

describe('cartReducer scalar setters', () => {
  // useReducer bails out on an identical reference, which is what stops
  // CartDrawer's 300ms description debounce from re-rendering the whole tree
  // (and rewriting sessionStorage) forever while nobody is typing.
  it('returns the same state when nothing changes', () => {
    let state = cartReducer(initialCartState, { type: 'SET_DESCRIPTION', payload: 'retki' });
    state = cartReducer(state, { type: 'SET_LOANER', payload: 'Justus Jutila' });
    state = cartReducer(state, { type: 'SET_USER_ID', payload: 'user-1' });

    expect(cartReducer(state, { type: 'SET_DESCRIPTION', payload: 'retki' })).toBe(state);
    expect(cartReducer(state, { type: 'SET_LOANER', payload: 'Justus Jutila' })).toBe(state);
    expect(cartReducer(state, { type: 'SET_USER_ID', payload: 'user-1' })).toBe(state);
  });

  it('still produces a new state when the value changes', () => {
    const state = cartReducer(initialCartState, { type: 'SET_DESCRIPTION', payload: 'retki' });
    const next = cartReducer(state, { type: 'SET_DESCRIPTION', payload: 'leiri' });

    expect(next).not.toBe(state);
    expect(next.description).toBe('leiri');
  });
});
