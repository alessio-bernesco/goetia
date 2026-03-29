// Genesis state — persists across navigation, lives until accept/reject

import { createContext, useContext } from 'react';

export interface GenesisTurn {
  role: 'mago' | 'entity';
  content: string;
}

export interface GenesisState {
  conversation: GenesisTurn[];
  loading: boolean;
  lastRawResponse: string | null;
  error: string | null;
}

export type GenesisAction =
  | { type: 'ADD_MAGO_TURN'; content: string }
  | { type: 'ADD_ENTITY_TURN'; content: string; rawResponse: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET' };

export const initialGenesisState: GenesisState = {
  conversation: [],
  loading: false,
  lastRawResponse: null,
  error: null,
};

export function genesisReducer(state: GenesisState, action: GenesisAction): GenesisState {
  switch (action.type) {
    case 'ADD_MAGO_TURN':
      return {
        ...state,
        conversation: [...state.conversation, { role: 'mago', content: action.content }],
      };
    case 'ADD_ENTITY_TURN':
      return {
        ...state,
        conversation: [...state.conversation, { role: 'entity', content: action.content }],
        lastRawResponse: action.rawResponse,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'RESET':
      return initialGenesisState;
    default:
      return state;
  }
}

export interface GenesisContextValue {
  state: GenesisState;
  dispatch: React.Dispatch<GenesisAction>;
}

export const GenesisContext = createContext<GenesisContextValue | null>(null);

export function useGenesisState(): GenesisContextValue {
  const ctx = useContext(GenesisContext);
  if (!ctx) throw new Error('useGenesisState must be used within GenesisContext.Provider');
  return ctx;
}
