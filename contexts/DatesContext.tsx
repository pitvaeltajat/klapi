import React, { createContext, useContext, useReducer } from 'react';
import { DatesState } from '../types';

export const initialDatesState: DatesState = {
  startDate: new Date(),
  endDate: new Date(),
  datesSet: false,
  selectedUserId: null,
  browseMode: false,
};

export type DatesAction =
  | { type: 'SET_START_DATE'; payload: Date }
  | { type: 'SET_END_DATE'; payload: Date }
  | { type: 'SET_DATES_SET'; payload: boolean }
  | { type: 'SET_SELECTED_USER_ID'; payload: string | null }
  | { type: 'SET_BROWSE_MODE'; payload: boolean };

export function datesReducer(state: DatesState, action: DatesAction): DatesState {
  switch (action.type) {
    case 'SET_START_DATE':
      return { ...state, startDate: action.payload };
    case 'SET_END_DATE':
      return { ...state, endDate: action.payload };
    case 'SET_DATES_SET':
      return { ...state, datesSet: action.payload };
    case 'SET_SELECTED_USER_ID':
      return { ...state, selectedUserId: action.payload };
    case 'SET_BROWSE_MODE':
      return { ...state, browseMode: action.payload };
    default:
      return state;
  }
}

type DatesContextType = {
  state: DatesState;
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
  setDatesSet: (set: boolean) => void;
  setSelectedUserId: (id: string | null) => void;
  setBrowseMode: (browse: boolean) => void;
};

const DatesContext = createContext<DatesContextType | undefined>(undefined);

export function DatesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(datesReducer, initialDatesState);

  const value = {
    state,
    setStartDate: (date: Date) => dispatch({ type: 'SET_START_DATE', payload: date }),
    setEndDate: (date: Date) => dispatch({ type: 'SET_END_DATE', payload: date }),
    setDatesSet: (set: boolean) => dispatch({ type: 'SET_DATES_SET', payload: set }),
    setSelectedUserId: (id: string | null) =>
      dispatch({ type: 'SET_SELECTED_USER_ID', payload: id }),
    setBrowseMode: (browse: boolean) => dispatch({ type: 'SET_BROWSE_MODE', payload: browse }),
  };

  return <DatesContext.Provider value={value}>{children}</DatesContext.Provider>;
}

export function useDates() {
  const context = useContext(DatesContext);
  if (context === undefined) {
    throw new Error('useDates must be used within a DatesProvider');
  }
  return context;
}
