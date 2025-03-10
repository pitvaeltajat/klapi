import React, { createContext, useContext, useReducer } from "react";
import { CartState, CartItem } from "../types";

const initialState: CartState = {
  items: [],
  description: "",
};

type CartAction =
  | { type: "ADD_TO_CART"; payload: CartItem }
  | { type: "INCREMENT_AMOUNT"; payload: string }
  | { type: "DECREMENT_AMOUNT"; payload: string }
  | { type: "REMOVE_FROM_CART"; payload: string }
  | { type: "CLEAR_CART" }
  | { type: "SET_DESCRIPTION"; payload: string };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_TO_CART": {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id
      );
      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, amount: action.payload.amount }
              : item
          ),
        };
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case "INCREMENT_AMOUNT":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload
            ? { ...item, amount: item.amount + 1 }
            : item
        ),
      };
    case "DECREMENT_AMOUNT":
      return {
        ...state,
        items: state.items
          .map((item) =>
            item.id === action.payload
              ? { ...item, amount: item.amount - 1 }
              : item
          )
          .filter((item) => item.amount > 0),
      };
    case "REMOVE_FROM_CART":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };
    case "CLEAR_CART":
      return {
        items: [],
        description: "",
      };
    case "SET_DESCRIPTION":
      return {
        ...state,
        description: action.payload,
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
  setDescription: (description: string) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const value = {
    state,
    addToCart: (item: CartItem) =>
      dispatch({ type: "ADD_TO_CART", payload: item }),
    incrementAmount: (id: string) =>
      dispatch({ type: "INCREMENT_AMOUNT", payload: id }),
    decrementAmount: (id: string) =>
      dispatch({ type: "DECREMENT_AMOUNT", payload: id }),
    removeFromCart: (id: string) =>
      dispatch({ type: "REMOVE_FROM_CART", payload: id }),
    clearCart: () => dispatch({ type: "CLEAR_CART" }),
    setDescription: (description: string) =>
      dispatch({ type: "SET_DESCRIPTION", payload: description }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
