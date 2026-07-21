import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { CartState, CartItem } from '../types';
import { CART_STORAGE_KEY, loadPersisted, savePersisted } from '@/utils/sessionState';

export const initialCartState: CartState = {
  items: [],
  description: '',
  loaner: undefined,
  userId: undefined,
};

export type CartAction =
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'INCREMENT_AMOUNT'; payload: string }
  | { type: 'DECREMENT_AMOUNT'; payload: string }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_LOANER'; payload: string }
  | { type: 'SET_USER_ID'; payload: string | undefined }
  | { type: 'RESET_CART' }
  | { type: 'RESTORE_CART'; payload: CartState };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existingItem = state.items.find((item) => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id ? { ...item, amount: action.payload.amount } : item,
          ),
        };
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case 'INCREMENT_AMOUNT':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload ? { ...item, amount: item.amount + 1 } : item,
        ),
      };
    case 'DECREMENT_AMOUNT':
      return {
        ...state,
        items: state.items
          .map((item) => (item.id === action.payload ? { ...item, amount: item.amount - 1 } : item))
          .filter((item) => item.amount > 0),
      };
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };
    case 'SET_DESCRIPTION':
      return {
        ...state,
        description: action.payload,
      };
    case 'SET_LOANER':
      return {
        ...state,
        loaner: action.payload,
      };
    case 'SET_USER_ID':
      return {
        ...state,
        userId: action.payload,
      };
    case 'CLEAR_CART':
      return {
        ...initialCartState,
        loaner: state.loaner, // Preserve loaner when clearing cart
        userId: state.userId, // Preserve userId when clearing cart
      };
    case 'RESET_CART':
      return { ...initialCartState };
    case 'RESTORE_CART':
      return { ...initialCartState, ...action.payload };
    default:
      return state;
  }
}

type CartContextType = {
  state: CartState;
  addToCart: (item: CartItem) => void;
  incrementAmount: (id: string) => void;
  decrementAmount: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  resetCart: () => void;
  setDescription: (description: string) => void;
  setLoaner: (loaner: string) => void;
  setUserId: (userId: string | undefined) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  // Restore after mount rather than via lazy init: sessionStorage doesn't exist
  // during SSR, so seeding the reducer from it would desync the first client
  // render from the server's HTML.
  const restored = useRef(false);
  useEffect(() => {
    const saved = loadPersisted<CartState>(CART_STORAGE_KEY);
    if (saved) dispatch({ type: 'RESTORE_CART', payload: saved });
    restored.current = true;
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    savePersisted(CART_STORAGE_KEY, state);
  }, [state]);

  const value = {
    state,
    addToCart: (item: CartItem) => dispatch({ type: 'ADD_TO_CART', payload: item }),
    incrementAmount: (id: string) => dispatch({ type: 'INCREMENT_AMOUNT', payload: id }),
    decrementAmount: (id: string) => dispatch({ type: 'DECREMENT_AMOUNT', payload: id }),
    removeFromCart: (id: string) => dispatch({ type: 'REMOVE_FROM_CART', payload: id }),
    clearCart: () => dispatch({ type: 'CLEAR_CART' }),
    resetCart: () => dispatch({ type: 'RESET_CART' }),
    setDescription: (description: string) =>
      dispatch({ type: 'SET_DESCRIPTION', payload: description }),
    setLoaner: (loaner: string) => dispatch({ type: 'SET_LOANER', payload: loaner }),
    setUserId: (userId: string | undefined) => dispatch({ type: 'SET_USER_ID', payload: userId }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
