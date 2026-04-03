// AuthRecovery — modal dialog for replacing an invalid/revoked API key
// Triggered when any API call returns AUTH_ERROR:

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

/** Check if an error string indicates an auth failure. */
export function isAuthError(error: string): boolean {
  return error.startsWith('AUTH_ERROR:');
}

/** Emit an auth recovery request. The AuthRecovery component listens for this. */
export function requestAuthRecovery(onRecovered?: () => void) {
  window.dispatchEvent(new CustomEvent('goetia:auth-recovery', { detail: { onRecovered } }));
}

export function AuthRecovery() {
  const [visible, setVisible] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onRecovered, setOnRecovered] = useState<(() => void) | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setVisible(true);
      setNewKey('');
      setError(null);
      if (detail?.onRecovered) {
        setOnRecovered(() => detail.onRecovered);
      }
    };
    window.addEventListener('goetia:auth-recovery', handler);
    return () => window.removeEventListener('goetia:auth-recovery', handler);
  }, []);

  const handleReplace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('update_api_key', { key: newKey });
      setVisible(false);
      setNewKey('');
      onRecovered?.();
      setOnRecovered(null);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Sostituzione fallita');
    } finally {
      setLoading(false);
    }
  }, [newKey, onRecovered]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setNewKey('');
    setError(null);
    setOnRecovered(null);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}>
      <div style={{
        background: '#0a0a0a',
        border: '1px solid #2a2a2a',
        padding: '32px',
        maxWidth: '440px',
        width: '100%',
        fontFamily: '"SF Mono", monospace',
      }}>
        <div style={{ color: '#8a3a3a', fontSize: '11px', letterSpacing: '0.15em', marginBottom: '16px' }}>
          API KEY NON VALIDA
        </div>
        <div style={{ color: '#666', fontSize: '10px', marginBottom: '20px', lineHeight: '1.6' }}>
          La tua API key è stata revocata o non è più valida. Inserisci una nuova key per continuare.
        </div>
        <input
          type="password"
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          placeholder="sk-ant-..."
          autoFocus
          style={{
            width: '100%',
            background: '#050505',
            border: '1px solid #1a1a1a',
            color: '#999',
            fontFamily: '"SF Mono", monospace',
            fontSize: '12px',
            padding: '10px 14px',
            outline: 'none',
            letterSpacing: '0.05em',
            marginBottom: '12px',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <div style={{ fontSize: '10px', color: '#8a3a3a', marginBottom: '12px' }}>{error}</div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleReplace}
            disabled={loading || !newKey.trim()}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid #333',
              color: '#888',
              fontFamily: '"SF Mono", monospace',
              fontSize: '10px',
              letterSpacing: '0.1em',
              padding: '10px',
              cursor: 'pointer',
            }}
          >
            {loading ? 'VERIFICA...' : 'VERIFICA E SALVA'}
          </button>
          <button
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              border: '1px solid #222',
              color: '#555',
              fontFamily: '"SF Mono", monospace',
              fontSize: '10px',
              padding: '10px 16px',
              cursor: 'pointer',
            }}
          >
            ANNULLA
          </button>
        </div>
      </div>
    </div>
  );
}
