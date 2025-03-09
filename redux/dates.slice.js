import { createSlice } from "@reduxjs/toolkit";

const dateSlice = createSlice({
  name: "dates",
  initialState: {
    startDate: new Date(),
    endDate: new Date(),
    datesSet: false,
  },
  reducers: {
    setStartDate: (state, action) => {
      state.startDate = action.payload;
    },
    setEndDate: (state, action) => {
      state.endDate = action.payload;
    },
    datesSet: (state, action) => {
      state.datesSet = action.payload;
    },
  },
});

export const dateReducer = dateSlice.reducer;

export const { setStartDate, setEndDate, datesSet } = dateSlice.actions;
