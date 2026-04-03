// Hook for managing the genesis (demon creation) flow
// State lives in global GenesisContext — survives navigation between places

import { invoke } from '@tauri-apps/api/core';
import { useCallback } from 'react';
import { useAppState } from '../state/appState';
import { useGenesisState } from '../state/genesisState';
import { logPrompt } from '../ui/DebugPanel';
import { isAuthError, requestAuthRecovery } from '../ui/AuthRecovery';

/** Extract readable text from a response that may be raw text, JSON, or markdown-wrapped JSON. */
function extractDisplayText(response: string): string {
  const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : response.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed.text === 'string') return parsed.text;
    if (parsed.name && parsed.seal) return `Entità generata: ${parsed.name}`;
  } catch {
    if (jsonBlockMatch) {
      const before = response.slice(0, response.indexOf('```json')).trim();
      const after = response.slice(response.indexOf('```', response.indexOf('```json') + 7) + 3).trim();
      const textParts = [before, after].filter(Boolean);
      if (textParts.length > 0) return textParts.join('\n\n');
    }
  }
  return response;
}

export function useGenesis() {
  const { dispatch: appDispatch } = useAppState();
  const { state: genesis, dispatch } = useGenesisState();

  const startGenesis = useCallback(async (rank: string) => {
    if (genesis.conversation.length > 0) return; // Already active, don't restart
    await invoke('start_genesis', { rank });
    dispatch({ type: 'RESET' });
    appDispatch({ type: 'SET_GENESIS_ACTIVE', active: true });
  }, [appDispatch, dispatch, genesis.conversation.length]);

  const sendMessage = useCallback(async (message: string) => {
    dispatch({ type: 'ADD_MAGO_TURN', content: message });
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      logPrompt({ timestamp: Date.now(), direction: 'send', content: message });
      const response = await invoke<string>('send_genesis_message', { message });
      logPrompt({ timestamp: Date.now(), direction: 'recv', content: response });
      const displayText = extractDisplayText(response);
      dispatch({ type: 'ADD_ENTITY_TURN', content: displayText, rawResponse: response });
      return response;
    } catch (e) {
      const msg = typeof e === 'string' ? e : (e as Error).message;
      if (isAuthError(msg)) {
        requestAuthRecovery();
      }
      dispatch({ type: 'SET_ERROR', error: msg });
      throw e;
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [dispatch]);

  const acceptDemon = useCallback(async (rank?: string) => {
    if (!genesis.lastRawResponse) throw new Error('No genesis response to accept');
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      const name = await invoke<string>('accept_demon', { genesisResponse: genesis.lastRawResponse });
      appDispatch({ type: 'SET_GENESIS_ACTIVE', active: false });
      appDispatch({ type: 'ADD_DEMON', demon: { name, rank: rank || 'minor' } });
      dispatch({ type: 'RESET' });
      return name;
    } catch (e) {
      const msg = typeof e === 'string' ? e : (e as Error).message;
      dispatch({ type: 'SET_ERROR', error: msg });
      throw e;
    }
  }, [appDispatch, dispatch, genesis.lastRawResponse]);

  const rejectGenesis = useCallback(async () => {
    await invoke('reject_genesis');
    appDispatch({ type: 'SET_GENESIS_ACTIVE', active: false });
    dispatch({ type: 'RESET' });
  }, [appDispatch, dispatch]);

  return {
    conversation: genesis.conversation,
    loading: genesis.loading,
    lastResponse: genesis.lastRawResponse,
    error: genesis.error,
    startGenesis,
    sendMessage,
    acceptDemon,
    rejectGenesis,
  };
}
