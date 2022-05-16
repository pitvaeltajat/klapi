import { createSlice } from '@reduxjs/toolkit';

const dateSlice = createSlice({
    name: 'dates',
    initialState: {
        startDate: new Date(),
        endDate: new Date(),
    },
    reducers: {
        setStartDate: (state, action) => {
            state.startDate = action.payload;
        },
        setEndDate: (state, action) => {
            state.endDate = action.payload;
        },
    },
});

export const dateReducer = dateSlice.reducer;

export const { setStartDate, setEndDate } = dateSlice.actions;
