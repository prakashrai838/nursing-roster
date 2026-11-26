import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { AppState, Nurse, Department, ShiftTemplate, RosterEntry, LeaveRequest } from '../types';
import { defaultState } from '../data/defaults';
import { useAuth } from './AuthContext';

type Action =
  | { type: 'LOAD'; payload: AppState }
  | { type: 'ADD_NURSE'; payload: Omit<Nurse, 'id'> } | { type: 'UPDATE_NURSE'; payload: Nurse } | { type: 'DELETE_NURSE'; payload: string }
  | { type: 'ADD_DEPARTMENT'; payload: Omit<Department, 'id'> } | { type: 'UPDATE_DEPARTMENT'; payload: Department } | { type: 'DELETE_DEPARTMENT'; payload: string }
  | { type: 'ADD_SHIFT'; payload: Omit<ShiftTemplate, 'id'> } | { type: 'UPDATE_SHIFT'; payload: ShiftTemplate } | { type: 'DELETE_SHIFT'; payload: string }
  | { type: 'ADD_ROSTER_ENTRY'; payload: Omit<RosterEntry, 'id'> } | { type: 'UPDATE_ROSTER_ENTRY'; payload: RosterEntry } | { type: 'DELETE_ROSTER_ENTRY'; payload: string }
  | { type: 'ADD_LEAVE'; payload: Omit<LeaveRequest, 'id'> } | { type: 'UPDATE_LEAVE'; payload: LeaveRequest } | { type: 'DELETE_LEAVE'; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD': return action.payload;
    case 'ADD_NURSE': return { ...state, nurses: [...state.nurses, { ...action.payload, id: crypto.randomUUID() }] };
    case 'UPDATE_NURSE': return { ...state, nurses: state.nurses.map(n => n.id === action.payload.id ? action.payload : n) };
    case 'DELETE_NURSE': return { ...state, nurses: state.nurses.filter(n => n.id !== action.payload), rosterEntries: state.rosterEntries.filter(r => r.nurseId !== action.payload), leaveRequests: state.leaveRequests.filter(l => l.nurseId !== action.payload) };
    case 'ADD_DEPARTMENT': return { ...state, departments: [...state.departments, { ...action.payload, id: crypto.randomUUID() }] };
    case 'UPDATE_DEPARTMENT': return { ...state, departments: state.departments.map(d => d.id === action.payload.id ? action.payload : d) };
    case 'DELETE_DEPARTMENT': return { ...state, departments: state.departments.filter(d => d.id !== action.payload) };
    case 'ADD_SHIFT': return { ...state, shiftTemplates: [...state.shiftTemplates, { ...action.payload, id: crypto.randomUUID() }] };
    case 'UPDATE_SHIFT': return { ...state, shiftTemplates: state.shiftTemplates.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SHIFT': return { ...state, shiftTemplates: state.shiftTemplates.filter(s => s.id !== action.payload), rosterEntries: state.rosterEntries.filter(r => r.shiftTemplateId !== action.payload) };
    case 'ADD_ROSTER_ENTRY': return { ...state, rosterEntries: [...state.rosterEntries, { ...action.payload, id: crypto.randomUUID() }] };
    case 'UPDATE_ROSTER_ENTRY': return { ...state, rosterEntries: state.rosterEntries.map(r => r.id === action.payload.id ? action.payload : r) };
    case 'DELETE_ROSTER_ENTRY': return { ...state, rosterEntries: state.rosterEntries.filter(r => r.id !== action.payload) };
    case 'ADD_LEAVE': return { ...state, leaveRequests: [...state.leaveRequests, { ...action.payload, id: crypto.randomUUID() }] };
    case 'UPDATE_LEAVE': return { ...state, leaveRequests: state.leaveRequests.map(l => l.id === action.payload.id ? action.payload : l) };
    case 'DELETE_LEAVE': return { ...state, leaveRequests: state.leaveRequests.filter(l => l.id !== action.payload) };
  }
}

async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, { ...options, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...options?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

interface RosterContextType { state: AppState; dispatch: (action: Action) => Promise<void>; isLoading: boolean; ready: boolean; loadFailed: boolean; error: string | null; clearError: () => void; retry: () => void }
const RosterContext = createContext<RosterContextType | null>(null);

export function RosterProvider({ children }: { children: ReactNode }) {
  const [state, dispatchLocal] = useReducer(reducer, defaultState);
  const stateRef = useRef(state);
  const versionRef = useRef<string | null>(null);
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const { user } = useAuth();
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    let active = true;
    api('/api/state').then(result => {
      if (active) { stateRef.current = result.state; versionRef.current = result.updatedAt; dispatchLocal({ type: 'LOAD', payload: result.state }); }
    }).catch(err => { if (active) { setError(err.message); setLoadFailed(true); } }).finally(() => { if (active) { setLoading(false); setReady(true); } });
    return () => { active = false; };
  }, [retryKey]);

  async function applyAction(action: Action) {
    if (user?.role === 'nurse') {
      try {
        let result;
        if (action.type === 'ADD_LEAVE') {
          const { nurseId, startDate, endDate, type, reason } = action.payload;
          result = await api('/api/leave', { method: 'POST', body: JSON.stringify({ nurseId, startDate, endDate, type, reason }) });
        }
        else if (action.type === 'DELETE_LEAVE') result = await api(`/api/leave/${encodeURIComponent(action.payload)}`, { method: 'DELETE' });
        else { setError('Your account has read-only roster access. Contact an administrator for changes.'); return; }
        stateRef.current = result.state;
        versionRef.current = result.updatedAt;
        dispatchLocal({ type: 'LOAD', payload: result.state });
        setError(null);
      } catch (err) { setError(err instanceof Error ? err.message : 'Could not save changes.'); }
      return;
    }
    const next = reducer(stateRef.current, action);
    try {
      const result = await api('/api/state', { method: 'PUT', headers: versionRef.current ? { 'If-Match': versionRef.current } : {}, body: JSON.stringify({ state: next }) });
      stateRef.current = result.state;
      versionRef.current = result.updatedAt;
      dispatchLocal({ type: 'LOAD', payload: result.state });
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save changes.'); }
  }

  function dispatch(action: Action): Promise<void> {
    const pending = mutationQueue.current.then(() => applyAction(action));
    mutationQueue.current = pending.catch(() => undefined);
    return pending;
  }

  return <RosterContext.Provider value={{ state, dispatch, isLoading, ready, loadFailed, error, clearError: () => setError(null), retry: () => { setError(null); setLoadFailed(false); setLoading(true); setRetryKey(key => key + 1); } }}>{children}</RosterContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRoster() {
  const ctx = useContext(RosterContext);
  if (!ctx) throw new Error('useRoster must be used within RosterProvider');
  return ctx;
}
