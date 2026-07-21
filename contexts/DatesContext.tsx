import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { DatesState } from '../types';
import { DATES_STORAGE_KEY, loadPersisted, savePersisted } from '@/utils/sessionState';

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
  | { type: 'SET_BROWSE_MODE'; payload: boolean }
  | { type: 'RESTORE_DATES'; payload: DatesState };

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
    case 'RESTORE_DATES':
      return { ...initialDatesState, ...action.payload };
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

  // Restored after mount (see CartProvider for why) and only when the stored
  // range still ends in the future — a reload the morning after shouldn't drop
  // you back into yesterday's loan window.
  const restored = useRef(false);
  useEffect(() => {
    const saved = loadPersisted<DatesState>(DATES_STORAGE_KEY);
    if (saved) {
      const startDate = new Date(saved.startDate);
      const endDate = new Date(saved.endDate);
      const usable =
        !Number.isNaN(startDate.getTime()) &&
        !Number.isNaN(endDate.getTime()) &&
        endDate.getTime() > Date.now();
      if (usable) {
        dispatch({ type: 'RESTORE_DATES', payload: { ...saved, startDate, endDate } });
      }
    }
    restored.current = true;
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    savePersisted(DATES_STORAGE_KEY, state);
  }, [state]);

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
