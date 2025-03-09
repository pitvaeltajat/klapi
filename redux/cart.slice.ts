import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CartState, CartItem } from "../types";

const initialState: CartState = {
  items: [],
  description: "",
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id,
      );
      if (existingItem) {
        existingItem.amount = action.payload.amount;
      } else {
        state.items.push(action.payload);
      }
    },
    incrementAmount: (state, action: PayloadAction<string>) => {
      const item = state.items.find((item) => item.id === action.payload);
      if (item) {
        item.amount++;
      }
    },
    decrementAmount: (state, action: PayloadAction<string>) => {
      const item = state.items.find((item) => item.id === action.payload);
      if (item) {
        if (item.amount === 1) {
          state.items = state.items.filter(
            (item) => item.id !== action.payload,
          );
        } else {
          item.amount--;
        }
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
      state.description = "";
    },
    setDescription: (state, action: PayloadAction<string>) => {
      state.description = action.payload;
    },
  },
});

export const cartReducer = cartSlice.reducer;
export const {
  addToCart,
  incrementAmount,
  decrementAmount,
  removeFromCart,
  clearCart,
  setDescription,
} = cartSlice.actions;
