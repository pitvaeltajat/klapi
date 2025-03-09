import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { cartReducer } from "./cart.slice";
import { dateReducer } from "./dates.slice";

const reducer = {
  cart: cartReducer,
  dates: dateReducer,
};

const combineReducer = combineReducers({
  cart: cartReducer,
  dates: dateReducer,
});

const rootReducer = (state, action) => {
  if (action.type === "cart/clearCart") {
    state = undefined;
  }
  return combineReducer(state, action);
};

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

export default store;
