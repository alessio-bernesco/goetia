// Global application state

import { createContext, useContext } from 'react';

export type Place = 'circle' | 'evoke' | 'chronicles' | 'seals';

export type AuthStatus = 'unauthenticated' | 'authenticated' | 'error';

export interface DemonEntry {
  name: string;
  rank: string;
}

export interface DemonVisualState {
  intensity: number;
  valence: number;
  arousal: number;
  color_shift: [number, number, number];
  scale_factor: number;
  pulse_override: number | null;
  glow_override: number | null;
}

export interface AppState {
  auth: AuthStatus;
  hasApiKey: boolean;
  hasGrimoire: boolean;
  demons: DemonEntry[];
  currentPlace: Place;
  activeDemon: string | null;
  sessionActive: boolean;
  genesisActive: boolean;
  syncStatus: 'up_to_date' | 'syncing' | 'error';
  model: string;
}

export type AppAction =
  | { type: 'SET_AUTH'; status: AuthStatus }
  | { type: 'SET_HAS_API_KEY'; value: boolean }
  | { type: 'SET_HAS_GRIMOIRE'; value: boolean }
  | { type: 'SET_DEMONS'; demons: DemonEntry[] }
  | { type: 'NAVIGATE'; place: Place }
  | { type: 'SET_ACTIVE_DEMON'; name: string | null }
  | { type: 'SET_SESSION_ACTIVE'; active: boolean }
  | { type: 'SET_GENESIS_ACTIVE'; active: boolean }
  | { type: 'SET_SYNC_STATUS'; status: 'up_to_date' | 'syncing' | 'error' }
  | { type: 'ADD_DEMON'; demon: DemonEntry }
  | { type: 'REMOVE_DEMON'; name: string }
  | { type: 'SET_MODEL'; model: string };

export const initialAppState: AppState = {
  auth: 'unauthenticated',
  hasApiKey: false,
  hasGrimoire: false,
  demons: [],
  currentPlace: 'circle',
  activeDemon: null,
  sessionActive: false,
  genesisActive: false,
  syncStatus: 'up_to_date',
  model: 'claude-opus-4-6',
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, auth: action.status };
    case 'SET_HAS_API_KEY':
      return { ...state, hasApiKey: action.value };
    case 'SET_HAS_GRIMOIRE':
      return { ...state, hasGrimoire: action.value };
    case 'SET_DEMONS':
      return { ...state, demons: action.demons };
    case 'NAVIGATE':
      return { ...state, currentPlace: action.place };
    case 'SET_ACTIVE_DEMON':
      return { ...state, activeDemon: action.name };
    case 'SET_SESSION_ACTIVE':
      return { ...state, sessionActive: action.active };
    case 'SET_GENESIS_ACTIVE':
      return { ...state, genesisActive: action.active };
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.status };
    case 'ADD_DEMON':
      return { ...state, demons: [...state.demons, action.demon] };
    case 'REMOVE_DEMON':
      return { ...state, demons: state.demons.filter(d => d.name !== action.name) };
    case 'SET_MODEL':
      return { ...state, model: action.model };
    default:
      return state;
  }
}

export interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppContext.Provider');
  return ctx;
}
