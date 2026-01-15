import { describe, it, expect } from 'vitest';
import { cartReducer, initialCartState } from '../contexts/CartContext';
import { datesReducer, initialDatesState } from '../contexts/DatesContext';
import { CartState } from '../types';

describe('Cart operations', () => {
  it('should add item to empty cart', () => {
    const state = cartReducer(initialCartState, {
      type: 'ADD_TO_CART',
      payload: { id: '1', name: 'Teltta', amount: 1 },
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual({ id: '1', name: 'Teltta', amount: 1 });
  });

  it('should update amount when adding existing item', () => {
    let state = cartReducer(initialCartState, {
      type: 'ADD_TO_CART',
      payload: { id: '1', name: 'Teltta', amount: 1 },
    });

    state = cartReducer(state, {
      type: 'ADD_TO_CART',
      payload: { id: '1', name: 'Teltta', amount: 3 },
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0].amount).toBe(3);
  });

  it('should increment item amount', () => {
    let state = cartReducer(initialCartState, {
      type: 'ADD_TO_CART',
      payload: { id: '1', name: 'Teltta', amount: 1 },
    });

    state = cartReducer(state, { type: 'INCREMENT_AMOUNT', payload: '1' });

    expect(state.items[0].amount).toBe(2);
  });

  it('should decrement item amount', () => {
    let state = cartReducer(initialCartState, {
      type: 'ADD_TO_CART',
      payload: { id: '1', name: 'Teltta', amount: 3 },
    });

    state = cartReducer(state, { type: 'DECREMENT_AMOUNT', payload: '1' });

    expect(state.items[0].amount).toBe(2);
  });

  it('should remove item when decrementing to zero', () => {
    let state = cartReducer(initialCartState, {
      type: 'ADD_TO_CART',
      payload: { id: '1', name: 'Teltta', amount: 1 },
    });

    state = cartReducer(state, { type: 'DECREMENT_AMOUNT', payload: '1' });

    expect(state.items).toHaveLength(0);
  });

  it('should remove specific item from cart', () => {
    let state = cartReducer(initialCartState, {
      type: 'ADD_TO_CART',
      payload: { id: '1', name: 'Teltta', amount: 1 },
    });
    state = cartReducer(state, {
      type: 'ADD_TO_CART',
      payload: { id: '2', name: 'Makuupussi', amount: 2 },
    });

    state = cartReducer(state, { type: 'REMOVE_FROM_CART', payload: '1' });

    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('2');
  });

  it('should clear cart but preserve loaner and userId', () => {
    let state = cartReducer(initialCartState, {
      type: 'ADD_TO_CART',
      payload: { id: '1', name: 'Teltta', amount: 1 },
    });
    state = cartReducer(state, { type: 'SET_LOANER', payload: 'Test User' });
    state = cartReducer(state, { type: 'SET_USER_ID', payload: 'user-123' });

    state = cartReducer(state, { type: 'CLEAR_CART' });

    expect(state.items).toHaveLength(0);
    expect(state.loaner).toBe('Test User');
    expect(state.userId).toBe('user-123');
  });

  it('should set description', () => {
    const state = cartReducer(initialCartState, {
      type: 'SET_DESCRIPTION',
      payload: 'Retkelle',
    });

    expect(state.description).toBe('Retkelle');
  });
});

describe('Dates operations', () => {
  it('should set start date', () => {
    const newDate = new Date('2024-02-15');
    const state = datesReducer(initialDatesState, {
      type: 'SET_START_DATE',
      payload: newDate,
    });

    expect(state.startDate).toEqual(newDate);
  });

  it('should set end date', () => {
    const newDate = new Date('2024-02-20');
    const state = datesReducer(initialDatesState, {
      type: 'SET_END_DATE',
      payload: newDate,
    });

    expect(state.endDate).toEqual(newDate);
  });

  it('should mark dates as set', () => {
    const state = datesReducer(initialDatesState, {
      type: 'SET_DATES_SET',
      payload: true,
    });

    expect(state.datesSet).toBe(true);
  });

  it('should set selected user id', () => {
    const state = datesReducer(initialDatesState, {
      type: 'SET_SELECTED_USER_ID',
      payload: 'user-456',
    });

    expect(state.selectedUserId).toBe('user-456');
  });
});

// Helper to build loan submission payload (same logic used in the app)
function buildLoanPayload(
  cart: CartState,
  dates: { startDate: Date; endDate: Date },
) {
  return {
    reservations: cart.items.map((item) => ({
      itemId: item.id,
      name: item.name,
      amount: item.amount,
    })),
    startTime: dates.startDate,
    endTime: dates.endDate,
    userId: cart.userId || '',
    description: cart.description || undefined,
    loaner: cart.loaner,
  };
}

describe('Loan submission payload', () => {
  it('should build correct payload from cart and dates', () => {
    const cart: CartState = {
      items: [
        { id: 'item-1', name: 'Teltta', amount: 2 },
        { id: 'item-2', name: 'Makuupussi', amount: 4 },
      ],
      description: 'Kesäretki',
      loaner: 'Matti Meikäläinen',
      userId: 'user-123',
    };

    const dates = {
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-07'),
    };

    const payload = buildLoanPayload(cart, dates);

    expect(payload.reservations).toHaveLength(2);
    expect(payload.reservations[0]).toEqual({
      itemId: 'item-1',
      name: 'Teltta',
      amount: 2,
    });
    expect(payload.userId).toBe('user-123');
    expect(payload.description).toBe('Kesäretki');
    expect(payload.loaner).toBe('Matti Meikäläinen');
  });
});

describe('Complete loan flow simulation', () => {
  it('should simulate a complete loan flow: add items, set dates, prepare submission', () => {
    // Step 1: Start with empty cart
    let cartState = initialCartState;

    // Step 2: Add items to cart
    cartState = cartReducer(cartState, {
      type: 'ADD_TO_CART',
      payload: { id: 'item-1', name: 'Teltta 3-hengen', amount: 1 },
    });
    cartState = cartReducer(cartState, {
      type: 'ADD_TO_CART',
      payload: { id: 'item-2', name: 'Makuupussi', amount: 3 },
    });

    expect(cartState.items).toHaveLength(2);

    // Step 3: Adjust quantities
    cartState = cartReducer(cartState, { type: 'INCREMENT_AMOUNT', payload: 'item-1' });
    expect(cartState.items.find((i) => i.id === 'item-1')?.amount).toBe(2);

    // Step 4: Set loan details
    cartState = cartReducer(cartState, {
      type: 'SET_DESCRIPTION',
      payload: 'Partioretki Nuuksioon',
    });
    cartState = cartReducer(cartState, { type: 'SET_LOANER', payload: 'Akela' });
    cartState = cartReducer(cartState, { type: 'SET_USER_ID', payload: 'user-akela-123' });

    // Step 5: Set dates
    let datesState = datesReducer(initialDatesState, {
      type: 'SET_START_DATE',
      payload: new Date('2024-07-15'),
    });
    datesState = datesReducer(datesState, {
      type: 'SET_END_DATE',
      payload: new Date('2024-07-17'),
    });
    datesState = datesReducer(datesState, { type: 'SET_DATES_SET', payload: true });

    expect(datesState.datesSet).toBe(true);

    // Step 6: Build submission payload
    const payload = buildLoanPayload(cartState, {
      startDate: datesState.startDate,
      endDate: datesState.endDate,
    });

    // Verify complete payload
    expect(payload.reservations).toHaveLength(2);
    expect(payload.reservations.find((r) => r.itemId === 'item-1')?.amount).toBe(2);
    expect(payload.reservations.find((r) => r.itemId === 'item-2')?.amount).toBe(3);
    expect(payload.userId).toBe('user-akela-123');
    expect(payload.loaner).toBe('Akela');
    expect(payload.description).toBe('Partioretki Nuuksioon');
  });
});
