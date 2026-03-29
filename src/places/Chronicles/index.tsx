// Chronicles — timeline of past sessions per demon
// Technical log terminal aesthetic

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppState } from '../../state/appState';
import { GlowText } from '../../ui/GlowText';
import { Terminal } from '../../ui/Terminal';

interface ChronicleEntry {
  filename: string;
  date: string;
  path: string;
}

interface Chronicle {
  metadata: {
    demon_name: string;
    date: string;
    duration_seconds: number;
    turn_count: number;
    topics: string[];
    mood_arc: string[];
    summary: string;
  };
  conversation: Array<{
    role: 'mago' | 'demon';
    content: string;
  }>;
}

export function Chronicles() {
  const { state: app } = useAppState();
  const [selectedDemon, setSelectedDemon] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChronicleEntry[]>([]);
  const [selectedChronicle, setSelectedChronicle] = useState<Chronicle | null>(null);
  const [loading, setLoading] = useState(false);

  const loadEntries = useCallback(async (name: string) => {
    setLoading(true);
    try {
      const result = await invoke<ChronicleEntry[]>('list_chronicles', { name });
      setEntries(result);
    } catch (e) {
      console.error('Failed to load chronicles:', e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChronicle = useCallback(async (demonName: string, filename: string) => {
    setLoading(true);
    try {
      const result = await invoke<Chronicle>('get_chronicle', { demonName, filename });
      setSelectedChronicle(result);
    } catch (e) {
      console.error('Failed to load chronicle:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDemon) {
      loadEntries(selectedDemon);
    }
  }, [selectedDemon, loadEntries]);

  // Detail view
  if (selectedChronicle) {
    const lines = selectedChronicle.conversation.map(turn => ({
      role: turn.role as 'mago' | 'demon',
      content: turn.content,
    }));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <GlowText text={selectedChronicle.metadata.demon_name} color="#8a6a2a" size="11px" animate={false} glow={false} />
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#666', marginTop: '4px' }}>
              {selectedChronicle.metadata.summary}
            </div>
          </div>
          <button onClick={() => setSelectedChronicle(null)} style={btnStyle}>INDIETRO</button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Terminal lines={lines} />
        </div>
      </div>
    );
  }

  // Demon selector
  if (!selectedDemon) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', animation: 'breathe 3s ease-in-out infinite' }}>
        <GlowText text="CRONACHE" color="#8a6a2a" size="11px" animate={false} glow />
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {app.demons.length === 0 && (
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#666' }}>
              Nessun demone presente.
            </div>
          )}
          {app.demons.map(d => (
            <button
              key={d.name}
              onClick={() => setSelectedDemon(d.name)}
              style={{ ...btnStyle, textAlign: 'left', padding: '12px 16px' }}
            >
              {d.name.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Timeline
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <GlowText text={`CRONACHE — ${selectedDemon.toUpperCase()}`} color="#8a6a2a" size="11px" animate={false} glow={false} />
        <button onClick={() => { setSelectedDemon(null); setEntries([]); }} style={btnStyle}>INDIETRO</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 20px', scrollbarWidth: 'none' }}>
        {loading && (
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#666' }}>caricamento...</div>
        )}
        {!loading && entries.length === 0 && (
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#666' }}>Nessuna cronaca.</div>
        )}
        {entries.map(entry => (
          <button
            key={entry.filename}
            onClick={() => loadChronicle(selectedDemon, entry.filename)}
            style={{
              ...btnStyle,
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              marginBottom: '4px',
            }}
          >
            <span style={{ color: '#777' }}>
              {new Date(entry.date).toLocaleString('it-IT', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #1a1a1a',
  color: '#777',
  fontFamily: '"SF Mono", monospace',
  fontSize: '10px',
  letterSpacing: '0.1em',
  padding: '4px 12px',
  cursor: 'pointer',
};
