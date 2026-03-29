// ModelSelector — compact model picker in the top-left corner

import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppState } from '../state/appState';

const models = [
  { id: 'claude-opus-4-6', label: 'OPUS' },
  { id: 'claude-sonnet-4-6', label: 'SONNET' },
  { id: 'claude-haiku-4-5-20251001', label: 'HAIKU' },
];

export function ModelSelector() {
  const { state, dispatch } = useAppState();

  const handleSelect = useCallback(async (modelId: string) => {
    try {
      await invoke('set_model', { modelId });
      dispatch({ type: 'SET_MODEL', model: modelId });
      localStorage.setItem('goetia-model', modelId);
    } catch (e) {
      console.error('Failed to set model:', e);
    }
  }, [dispatch]);

  return (
    <div style={{
      animation: 'breathe 3s ease-in-out infinite',
      position: 'fixed',
      top: '8px',
      left: '12px',
      display: 'flex',
      gap: '4px',
      zIndex: 200,
    }}>
      {models.map(m => (
        <button
          key={m.id}
          onClick={() => handleSelect(m.id)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: '"SF Mono", monospace',
            fontSize: '8px',
            letterSpacing: '0.1em',
            padding: '2px 6px',
            color: state.model === m.id ? '#888' : '#333',
            textShadow: state.model === m.id ? '0 0 6px rgba(150,150,150,0.3)' : 'none',
            transition: 'color 0.3s',
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
