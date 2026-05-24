import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { AppState, Nurse, Department, ShiftTemplate, RosterEntry, LeaveRequest } from '../types';
import { defaultState } from '../data/defaults';

const STORAGE_KEY = 'nursing-roster-data';

type Action =
  | { type: 'LOAD'; payload: AppState }
  | { type: 'ADD_NURSE'; payload: Omit<Nurse, 'id'> }
  | { type: 'UPDATE_NURSE'; payload: Nurse }
  | { type: 'DELETE_NURSE'; payload: string }
  | { type: 'ADD_DEPARTMENT'; payload: Omit<Department, 'id'> }
  | { type: 'UPDATE_DEPARTMENT'; payload: Department }
  | { type: 'DELETE_DEPARTMENT'; payload: string }
  | { type: 'ADD_SHIFT'; payload: Omit<ShiftTemplate, 'id'> }
  | { type: 'UPDATE_SHIFT'; payload: ShiftTemplate }
  | { type: 'DELETE_SHIFT'; payload: string }
  | { type: 'ADD_ROSTER_ENTRY'; payload: Omit<RosterEntry, 'id'> }
  | { type: 'UPDATE_ROSTER_ENTRY'; payload: RosterEntry }
  | { type: 'DELETE_ROSTER_ENTRY'; payload: string }
  | { type: 'ADD_LEAVE'; payload: Omit<LeaveRequest, 'id'> }
  | { type: 'UPDATE_LEAVE'; payload: LeaveRequest }
  | { type: 'DELETE_LEAVE'; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD':
      return action.payload;
    case 'ADD_NURSE':
      return { ...state, nurses: [...state.nurses, { ...action.payload, id: uuidv4() }] };
    case 'UPDATE_NURSE':
      return { ...state, nurses: state.nurses.map(n => n.id === action.payload.id ? action.payload : n) };
    case 'DELETE_NURSE':
      return {
        ...state,
        nurses: state.nurses.filter(n => n.id !== action.payload),
        rosterEntries: state.rosterEntries.filter(r => r.nurseId !== action.payload),
      };
    case 'ADD_DEPARTMENT':
      return { ...state, departments: [...state.departments, { ...action.payload, id: uuidv4() }] };
    case 'UPDATE_DEPARTMENT':
      return { ...state, departments: state.departments.map(d => d.id === action.payload.id ? action.payload : d) };
    case 'DELETE_DEPARTMENT':
      return { ...state, departments: state.departments.filter(d => d.id !== action.payload) };
    case 'ADD_SHIFT':
      return { ...state, shiftTemplates: [...state.shiftTemplates, { ...action.payload, id: uuidv4() }] };
    case 'UPDATE_SHIFT':
      return { ...state, shiftTemplates: state.shiftTemplates.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SHIFT':
      return { ...state, shiftTemplates: state.shiftTemplates.filter(s => s.id !== action.payload) };
    case 'ADD_ROSTER_ENTRY':
      return { ...state, rosterEntries: [...state.rosterEntries, { ...action.payload, id: uuidv4() }] };
    case 'UPDATE_ROSTER_ENTRY':
      return { ...state, rosterEntries: state.rosterEntries.map(r => r.id === action.payload.id ? action.payload : r) };
    case 'DELETE_ROSTER_ENTRY':
      return { ...state, rosterEntries: state.rosterEntries.filter(r => r.id !== action.payload) };
    case 'ADD_LEAVE':
      return { ...state, leaveRequests: [...state.leaveRequests, { ...action.payload, id: uuidv4() }] };
    case 'UPDATE_LEAVE':
      return { ...state, leaveRequests: state.leaveRequests.map(l => l.id === action.payload.id ? action.payload : l) };
    case 'DELETE_LEAVE':
      return { ...state, leaveRequests: state.leaveRequests.filter(l => l.id !== action.payload) };
    default:
      return state;
  }
}

interface RosterContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const RosterContext = createContext<RosterContextType | null>(null);

export function RosterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        dispatch({ type: 'LOAD', payload: JSON.parse(saved) });
      } catch {
        /* use defaults */
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <RosterContext.Provider value={{ state, dispatch }}>
      {children}
    </RosterContext.Provider>
  );
}

export function useRoster() {
  const ctx = useContext(RosterContext);
  if (!ctx) throw new Error('useRoster must be used within RosterProvider');
  return ctx;
}
