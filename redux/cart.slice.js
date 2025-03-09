import { createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    items: [],
    description: "",
  },
  reducers: {
    addToCart: (state, action) => {
      const itemExists = state.items.find(
        (item) => item.id === action.payload.id,
      );
      if (itemExists) {
        itemExists.amount++;
      } else {
        state.items.push({ ...action.payload, amount: 1 });
      }
    },

    incrementAmount: (state, action) => {
      const item = state.items.find((item) => item.id === action.payload);
      item.amount++;
    },

    decrementAmount: (state, action) => {
      const item = state.items.find((item) => item.id === action.payload);
      if (item.amount === 1) {
        const index = state.items.findIndex(
          (item) => item.id === action.payload,
        );
        state.items.splice(index, 1);
      } else {
        item.amount--;
      }
    },

    removeFromCart: (state, action) => {
      const index = state.findIndex((item) => item.id === action.payload);
      state.splice(index, 1);
    },

    setDescription: (state, action) => {
      state.description = action.payload;
    },

    clearCart: (state) => {},
  },
});

export const cartReducer = cartSlice.reducer;

export const {
  addToCart,
  incrementAmount,
  decrementAmount,
  setDescription,
  removeFromCart,
  clearCart,
} = cartSlice.actions;
