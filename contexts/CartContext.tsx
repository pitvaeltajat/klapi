import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
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
    // The three scalar setters return the SAME object when nothing actually
    // changes. useReducer bails out on an identical reference, so a debounce
    // that re-fires with the value it already wrote costs no render and no
    // sessionStorage write — on the kiosk that idle churn ran all day.
    case 'SET_DESCRIPTION':
      if (state.description === action.payload) return state;
      return {
        ...state,
        description: action.payload,
      };
    case 'SET_LOANER':
      if (state.loaner === action.payload) return state;
      return {
        ...state,
        loaner: action.payload,
      };
    case 'SET_USER_ID':
      if (state.userId === action.payload) return state;
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
      return {
        ...initialCartState,
        ...action.payload,
        // Who the loan is for is decided by the session, not by the basket, and
        // it is decided EARLIER than this: CartDrawer sits below this provider,
        // so React runs its "seed the loaner from the session" effect before
        // the provider's own mount effect gets to restore. A blind spread then
        // threw that identity away, and the drawer's one-shot ref meant it was
        // never re-seeded — the Lainaaja field stayed empty for the rest of the
        // tab's life, with the submit button disabled behind it. Only take the
        // stored identity when the state doesn't already carry one.
        loaner: state.loaner ?? action.payload.loaner,
        userId: state.userId ?? action.payload.userId,
      };
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

  // Memoised with no dependencies, so the identities never change for the life
  // of the provider. `dispatch` is stable, so they can be — and they have to
  // be: a fresh object here handed every consumer new functions on each render,
  // which spun CartDrawer's debounced `setDescription` effect into a permanent
  // loop (dispatch → new state → re-render → new `setDescription` → the effect
  // re-arms → dispatch, every 300ms, on every page including /login). Deriving
  // them from `state` would keep that loop alive, since it is a state change
  // that closes it; they must not depend on the state at all.
  const actions = useMemo(
    () => ({
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
    }),
    [],
  );

  const value = useMemo(() => ({ state, ...actions }), [state, actions]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
