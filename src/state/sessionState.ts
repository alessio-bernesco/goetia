// Session state — conversation with the evoked demon

import { createContext, useContext } from 'react';
import type { DemonVisualState } from './appState';

export interface ConversationTurn {
  role: 'mago' | 'demon';
  content: string;
  visualState?: DemonVisualState;
}

export interface SessionState {
  demonName: string | null;
  conversation: ConversationTurn[];
  streaming: boolean;
  currentVisualState: DemonVisualState | null;
  streamingText: string;
}

export type SessionAction =
  | { type: 'START_SESSION'; demonName: string }
  | { type: 'END_SESSION' }
  | { type: 'ADD_MAGO_TURN'; content: string }
  | { type: 'ADD_DEMON_TURN'; content: string; visualState?: DemonVisualState }
  | { type: 'SET_STREAMING'; streaming: boolean }
  | { type: 'SET_STREAMING_TEXT'; text: string }
  | { type: 'SET_VISUAL_STATE'; state: DemonVisualState | null };

export const initialSessionState: SessionState = {
  demonName: null,
  conversation: [],
  streaming: false,
  currentVisualState: null,
  streamingText: '',
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'START_SESSION':
      return { ...initialSessionState, demonName: action.demonName };
    case 'END_SESSION':
      return initialSessionState;
    case 'ADD_MAGO_TURN':
      return {
        ...state,
        conversation: [...state.conversation, { role: 'mago', content: action.content }],
      };
    case 'ADD_DEMON_TURN':
      return {
        ...state,
        conversation: [
          ...state.conversation,
          { role: 'demon', content: action.content, visualState: action.visualState },
        ],
        streamingText: '',
      };
    case 'SET_STREAMING':
      return { ...state, streaming: action.streaming };
    case 'SET_STREAMING_TEXT':
      return { ...state, streamingText: action.text };
    case 'SET_VISUAL_STATE':
      return { ...state, currentVisualState: action.state };
    default:
      return state;
  }
}

export interface SessionContextValue {
  state: SessionState;
  dispatch: React.Dispatch<SessionAction>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSessionState(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionState must be used within SessionContext.Provider');
  return ctx;
}
