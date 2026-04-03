// TempleGate — temple selection/creation/destruction screen between auth and grimoire

import { useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import * as THREE from 'three';
import { Scene } from '../ritual/Scene';
import { GlowText } from './GlowText';

interface TempleInfo {
  id: string;
  name: string;
  created_at: string;
  demon_count: number;
}

interface TempleGateProps {
  temples: TempleInfo[];
  onSelect: (templeId: string, hasGrimoire: boolean) => void;
  onCreated: (temple: TempleInfo) => void;
  onDestroyed: (templeId: string) => void;
}

export function TempleGate({ temples, onSelect, onCreated, onDestroyed }: TempleGateProps) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [destroying, setDestroying] = useState<string | null>(null);
  const [confirmDestroy, setConfirmDestroy] = useState<string | null>(null);
  const brightnessRef = useRef({ target: 0.15, current: 0.15 });
  const cloudsRef = useRef<THREE.Points[]>([]);

  const handleSelect = useCallback(async (templeId: string) => {
    setSelecting(true);
    setError(null);
    try {
      await invoke('select_temple', { templeId });
      const hasGrimoire = await invoke<boolean>('grimoire_exists');
      onSelect(templeId, hasGrimoire);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Selezione fallita');
      setSelecting(false);
    }
  }, [onSelect]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    setError(null);
    brightnessRef.current.target = 1.0;
    try {
      const temple = await invoke<TempleInfo>('create_temple');
      brightnessRef.current.target = 0.15;
      onCreated(temple);
    } catch (e) {
      brightnessRef.current.target = 0.15;
      setError(typeof e === 'string' ? e : 'Creazione tempio fallita');
    } finally {
      setCreating(false);
    }
  }, [onCreated]);

  const handleDestroyClick = useCallback((templeId: string) => {
    setConfirmDestroy(templeId);
    setError(null);
  }, []);

  const handleDestroyConfirm = useCallback(async () => {
    if (!confirmDestroy) return;
    const templeId = confirmDestroy;
    setConfirmDestroy(null);
    setDestroying(templeId);
    setError(null);
    try {
      await invoke('destroy_temple', { templeId });
      onDestroyed(templeId);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Distruzione fallita');
    } finally {
      setDestroying(null);
    }
  }, [confirmDestroy, onDestroyed]);

  const handleDestroyCancel = useCallback(() => {
    setConfirmDestroy(null);
  }, []);

  // Scene setup — galaxy-like point clouds
  const setup = useCallback((scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    camera.position.set(0, 0, 8);

    const clouds: THREE.Points[] = [];
    const configs = [
      { count: 3000, radius: 6, pos: [-4, 2, -8], color: 0xbbbbbb, size: 0.03, speed: 0.003 },
      { count: 2000, radius: 4, pos: [5, -1, -6], color: 0x9999cc, size: 0.035, speed: -0.002 },
      { count: 4000, radius: 8, pos: [0, 0, -12], color: 0xaaaaaa, size: 0.025, speed: 0.001 },
      { count: 1000, radius: 3, pos: [-6, -2, -4], color: 0xcc7777, size: 0.04, speed: 0.004 },
      { count: 1500, radius: 5, pos: [3, 3, -10], color: 0x77cc77, size: 0.03, speed: -0.0015 },
    ];

    for (const cfg of configs) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(cfg.count * 3);
      for (let i = 0; i < cfg.count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = cfg.radius * (0.3 + Math.random() * 0.7);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

      const mat = new THREE.PointsMaterial({
        color: cfg.color,
        size: cfg.size,
        transparent: true,
        opacity: brightnessRef.current.current,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const cloud = new THREE.Points(geo, mat);
      cloud.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      cloud.userData = {
        axis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random(),
          Math.random() - 0.5,
        ).normalize(),
        speed: cfg.speed,
      };
      scene.add(cloud);
      clouds.push(cloud);
    }

    cloudsRef.current = clouds;
  }, []);

  // Animation — rotate galaxies, animate brightness
  const onFrame = useCallback(() => {
    const b = brightnessRef.current;
    b.current += (b.target - b.current) * 0.02;

    for (const cloud of cloudsRef.current) {
      const { axis, speed } = cloud.userData;
      cloud.rotateOnAxis(axis, speed);

      const mat = cloud.material as THREE.PointsMaterial;
      mat.opacity = b.current;

      // During ceremony, increase size for pulse effect
      if (b.target > 0.5) {
        const pulse = 1.0 + Math.sin(performance.now() * 0.003) * 0.3;
        mat.size = (cloud.userData.baseSize || mat.size) * pulse;
        if (!cloud.userData.baseSize) cloud.userData.baseSize = mat.size;
      }
    }
  }, []);

  const busy = creating || selecting || destroying !== null;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      <Scene children={setup} onFrame={onFrame} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        maxWidth: '500px',
        width: '100%',
        padding: '0 40px',
      }}>
        {creating ? (
          <GlowText text="ERIGENDO..." color="#8a8aff" size="12px" animate glow />
        ) : confirmDestroy ? (
          <>
            <GlowText text="DISTRUZIONE TEMPIO" color="#8a3a3a" size="12px" animate={false} glow />
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#666', textAlign: 'center' }}>
              Il tempio e tutto il suo contenuto verranno distrutti irreversibilmente.
              Touch ID richiesto.
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={handleDestroyConfirm} style={destroyConfirmBtnStyle}>
                DISTRUGGI
              </button>
              <button onClick={handleDestroyCancel} style={cancelBtnStyle}>
                ANNULLA
              </button>
            </div>
          </>
        ) : (
          <>
            <GlowText text="TEMPLI" color="#777" size="14px" animate={false} glow />

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
              {temples.map(t => (
                <div key={t.id} style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <button
                    onClick={() => handleSelect(t.id)}
                    disabled={busy}
                    style={{ ...templeButtonStyle, flex: 1, opacity: destroying === t.id ? 0.3 : 1 }}
                  >
                    <span style={{ letterSpacing: '0.1em' }}>{t.name}</span>
                    <span style={{ fontSize: '10px', color: '#555' }}>
                      {destroying === t.id
                        ? 'DISTRUZIONE...'
                        : `${t.demon_count} ${t.demon_count === 1 ? 'demone' : 'demoni'}`}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDestroyClick(t.id)}
                    disabled={busy}
                    style={destroyBtnStyle}
                    title="Distruggi tempio"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleCreate}
              disabled={busy}
              style={createButtonStyle}
            >
              + ERIGERE NUOVO TEMPIO
            </button>
          </>
        )}

        {error && (
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#8a3a3a' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

const templeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #222',
  color: '#888',
  fontFamily: '"SF Mono", "Fira Code", monospace',
  fontSize: '12px',
  padding: '16px 20px',
  cursor: 'pointer',
  transition: 'border-color 0.3s, color 0.3s',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '4px',
  textAlign: 'left',
};

const createButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px dashed #333',
  color: '#555',
  fontFamily: '"SF Mono", "Fira Code", monospace',
  fontSize: '11px',
  letterSpacing: '0.1em',
  padding: '14px 20px',
  cursor: 'pointer',
  transition: 'border-color 0.3s, color 0.3s',
  width: '100%',
};

const destroyBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #2a1a1a',
  color: '#553333',
  fontFamily: '"SF Mono", monospace',
  fontSize: '16px',
  width: '40px',
  cursor: 'pointer',
  transition: 'border-color 0.3s, color 0.3s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const destroyConfirmBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #5a2a2a',
  color: '#8a3a3a',
  fontFamily: '"SF Mono", monospace',
  fontSize: '11px',
  letterSpacing: '0.1em',
  padding: '12px 24px',
  cursor: 'pointer',
  transition: 'border-color 0.3s, color 0.3s',
};

const cancelBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #333',
  color: '#666',
  fontFamily: '"SF Mono", monospace',
  fontSize: '11px',
  letterSpacing: '0.1em',
  padding: '12px 24px',
  cursor: 'pointer',
  transition: 'border-color 0.3s, color 0.3s',
};
