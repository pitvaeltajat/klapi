import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DatesState } from "../types";

const initialState: DatesState = {
  startDate: new Date(),
  endDate: new Date(),
  datesSet: false,
  selectedUserId: null,
};

const dateSlice = createSlice({
  name: "dates",
  initialState,
  reducers: {
    setStartDate: (state, action: PayloadAction<Date>) => {
      state.startDate = action.payload;
    },
    setEndDate: (state, action: PayloadAction<Date>) => {
      state.endDate = action.payload;
    },
    datesSet: (state, action: PayloadAction<boolean>) => {
      state.datesSet = action.payload;
    },
    setSelectedUserId: (state, action: PayloadAction<string | null>) => {
      state.selectedUserId = action.payload;
    },
  },
});

export const dateReducer = dateSlice.reducer;
export const { setStartDate, setEndDate, datesSet, setSelectedUserId } =
  dateSlice.actions;
