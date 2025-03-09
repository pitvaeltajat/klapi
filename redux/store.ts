import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { cartReducer } from "./cart.slice";
import { dateReducer } from "./dates.slice";

const combineReducer = combineReducers({
  cart: cartReducer,
  dates: dateReducer,
});

const rootReducer = (
  state: ReturnType<typeof combineReducer> | undefined,
  action: any,
) => {
  if (action.type === "cart/clearCart") {
    state = undefined;
  }
  return combineReducer(state, action);
};

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ["dates/setStartDate", "dates/setEndDate"],
        // Ignore these field paths in all actions
        ignoredActionPaths: ["payload.startDate", "payload.endDate"],
        // Ignore these paths in the state
        ignoredPaths: ["dates.startDate", "dates.endDate"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
