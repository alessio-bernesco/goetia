// DebugPanel — hidden debug/test panel, activated with Ctrl+Shift+D

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { voiceSynth } from '../audio/VoiceSynth';
import { ambientSound } from '../audio/Ambient';
import { audioEngine } from '../audio/AudioEngine';
import { backgroundNoise } from '../audio/BackgroundNoise';

export function DebugPanel() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const testVoice = useCallback(async () => {
    await audioEngine.init();
    voiceSynth.speak('Io sono un demone del grimorio. Ascolta.', {
      baseFrequency: 120,
      formants: [600, 1000, 2500],
      breathiness: 0.3,
      speed: 1.0,
    });
  }, []);

  const testVoiceHigh = useCallback(async () => {
    await audioEngine.init();
    voiceSynth.speak('Il teorema di Pitagora è una delle pietre angolari della geometria euclidea. La sua enunciazione è elegante.', {
      baseFrequency: 220,
      formants: [800, 1400, 3200],
      breathiness: 0.1,
      speed: 1.5,
    });
  }, []);

  const testVoiceLow = useCallback(async () => {
    await audioEngine.init();
    voiceSynth.speak('La verità è nascosta dentro il nonsense come una perla dentro un pesce dentro un acquario dentro un sogno.', {
      baseFrequency: 65,
      formants: [400, 800, 2000],
      breathiness: 0.5,
      speed: 0.7,
    });
  }, []);

  const testVoiceStop = useCallback(() => {
    voiceSynth.stop();
  }, []);

  const testAmbientIdle = useCallback(async () => {
    await audioEngine.init();
    ambientSound.start('idle');
  }, []);

  const testAmbientGenesis = useCallback(async () => {
    await audioEngine.init();
    ambientSound.start('genesis');
  }, []);

  const testAmbientEvocation = useCallback(async () => {
    await audioEngine.init();
    ambientSound.start('evocation');
  }, []);

  const stopAudio = useCallback(() => {
    ambientSound.stop();
  }, []);

  const clearData = useCallback(async () => {
    if (!confirm('Distruggere tutti i dati locali?')) return;
    try {
      await invoke('release_lock');
    } catch { /* ok */ }
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '30px',
      left: '10px',
      width: '280px',
      maxHeight: '80vh',
      overflow: 'auto',
      background: 'rgba(10, 10, 10, 0.95)',
      border: '1px solid #2a2a2a',
      padding: '16px',
      zIndex: 9999,
      fontFamily: '"SF Mono", monospace',
      fontSize: '10px',
      color: '#888',
      scrollbarWidth: 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ color: '#cc4444', letterSpacing: '0.15em' }}>DEBUG</span>
        <button onClick={() => setVisible(false)} style={closeBtnStyle}>✕</button>
      </div>

      <Section title="VOICE SYNTH">
        <Btn onClick={testVoice}>Voce media (120Hz) — corta</Btn>
        <Btn onClick={testVoiceHigh}>Voce acuta (220Hz) — testo lungo</Btn>
        <Btn onClick={testVoiceLow}>Voce profonda (65Hz) — testo lungo</Btn>
        <Btn onClick={testVoiceStop}>Stop voce</Btn>
      </Section>

      <Section title="AMBIENT SOUND">
        <Btn onClick={testAmbientIdle}>Ambient: idle</Btn>
        <Btn onClick={testAmbientGenesis}>Ambient: genesis</Btn>
        <Btn onClick={testAmbientEvocation}>Ambient: evocation</Btn>
        <Btn onClick={async () => { await audioEngine.init(); backgroundNoise.start(); }}>Background noise: ON</Btn>
        <Btn onClick={() => { backgroundNoise.stop(); }}>Background noise: OFF</Btn>
        <Btn onClick={stopAudio}>Stop all ambient</Btn>
      </Section>

      <Section title="SISTEMA">
        <Btn onClick={clearData} danger>Release lock</Btn>
      </Section>

      <div style={{ marginTop: '12px', color: '#444', fontSize: '9px' }}>
        Ctrl+Shift+D per chiudere
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ color: '#666', letterSpacing: '0.1em', marginBottom: '6px', fontSize: '9px' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {children}
      </div>
    </div>
  );
}

function Btn({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent',
      border: `1px solid ${danger ? '#4a1a1a' : '#222'}`,
      color: danger ? '#8a3a3a' : '#777',
      fontFamily: 'inherit',
      fontSize: '10px',
      padding: '5px 10px',
      cursor: 'pointer',
      textAlign: 'left',
    }}>
      {children}
    </button>
  );
}

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#555',
  cursor: 'pointer',
  fontSize: '12px',
};
