// Hook for managing an active evocation session

import { invoke } from '@tauri-apps/api/core';
import { useCallback } from 'react';
import { useAppState } from '../state/appState';
import { useSessionState } from '../state/sessionState';
import type { DemonVisualState } from '../state/appState';

interface MessageResult {
  text: string;
  state: DemonVisualState | null;
}

export function useSession() {
  const { dispatch: appDispatch } = useAppState();
  const { state: session, dispatch: sessionDispatch } = useSessionState();

  const startSession = useCallback(async (demonName: string) => {
    await invoke('start_session', { demonName });
    sessionDispatch({ type: 'START_SESSION', demonName });
    appDispatch({ type: 'SET_SESSION_ACTIVE', active: true });
    appDispatch({ type: 'SET_ACTIVE_DEMON', name: demonName });
  }, [appDispatch, sessionDispatch]);

  const sendMessage = useCallback(async (message: string) => {
    sessionDispatch({ type: 'ADD_MAGO_TURN', content: message });
    sessionDispatch({ type: 'SET_STREAMING', streaming: true });

    try {
      const result = await invoke<MessageResult>('send_message', { message });
      sessionDispatch({
        type: 'ADD_DEMON_TURN',
        content: result.text,
        visualState: result.state ?? undefined,
      });
      if (result.state) {
        sessionDispatch({ type: 'SET_VISUAL_STATE', state: result.state });
      }
    } catch (e) {
      const msg = typeof e === 'string' ? e : (e as Error).message;
      sessionDispatch({
        type: 'ADD_DEMON_TURN',
        content: `[ERRORE: ${msg}]`,
      });
    } finally {
      sessionDispatch({ type: 'SET_STREAMING', streaming: false });
    }
  }, [sessionDispatch]);

  const endSession = useCallback(async () => {
    sessionDispatch({ type: 'SET_STREAMING', streaming: true });
    try {
      await invoke<string>('end_session');
    } finally {
      sessionDispatch({ type: 'END_SESSION' });
      appDispatch({ type: 'SET_SESSION_ACTIVE', active: false });
      appDispatch({ type: 'SET_ACTIVE_DEMON', name: null });
    }
  }, [appDispatch, sessionDispatch]);

  const injectChronicle = useCallback(async (demonName: string, filename: string) => {
    await invoke('inject_chronicle', { demonName, filename });
  }, []);

  return {
    session,
    startSession,
    sendMessage,
    endSession,
    injectChronicle,
  };
}
