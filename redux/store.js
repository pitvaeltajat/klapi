import { configureStore } from '@reduxjs/toolkit';
import { cartReducer } from './cart.slice';
import { dateReducer } from './dates.slice';

const reducer = {
  cart: cartReducer,
  dates: dateReducer
};

const store = configureStore({
  reducer,
});

export default store;