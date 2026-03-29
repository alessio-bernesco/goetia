// Generic hook for invoking typed Tauri commands

import { invoke } from '@tauri-apps/api/core';
import { useState, useCallback } from 'react';

interface CommandState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useTauriCommand<T, A extends Record<string, unknown> = Record<string, never>>(
  command: string,
) {
  const [state, setState] = useState<CommandState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (args?: A): Promise<T> => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const result = await invoke<T>(command, args as Record<string, unknown>);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (e) {
        const error = typeof e === 'string' ? e : (e as Error).message;
        setState({ data: null, loading: false, error });
        throw e;
      }
    },
    [command],
  );

  return { ...state, execute };
}
