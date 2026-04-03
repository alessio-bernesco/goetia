// Evocation — crescendo distortion → explosion → demon fade-in
// Same structure for all ranks, parameterized by EvocationConfig.

import { useRef, useEffect } from 'react';
import {
  type RitualModulation,
  type EvocationConfig,
  getEvocationConfig,
} from '../RitualConfig';
import { ritualDrone } from '../../audio/RitualDrone';
import type { DemonManifest } from '../types';

export type EvocationPhase = 'idle' | 'crescendo' | 'explosion' | 'reveal' | 'complete';

export interface UseEvocationResult {
  ritualProps: RitualModulation | undefined;
  phase: EvocationPhase;
  progress: number;
}

interface EvocationState {
  startTime: number;
  phase: EvocationPhase;
  progress: number;
  config: EvocationConfig;
  glowColor: string;
  ritualProps: RitualModulation;
  droneStarted: boolean;
  demonRevealed: boolean;
}

export function useEvocation(
  active: boolean,
  rank: string,
  manifest: DemonManifest | null,
  onComplete: () => void,
  ritualRef?: React.MutableRefObject<RitualModulation | undefined>,
  onDemonReveal?: () => void,
): UseEvocationResult {
  const stateRef = useRef<EvocationState | null>(null);
  const resultRef = useRef<UseEvocationResult>({
    ritualProps: undefined,
    phase: 'idle',
    progress: 0,
  });
  const frameRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onDemonRevealRef = useRef(onDemonReveal);
  onDemonRevealRef.current = onDemonReveal;
  const ritualRefRef = useRef(ritualRef);
  ritualRefRef.current = ritualRef;

  useEffect(() => {
    if (!active || !manifest) {
      if (stateRef.current) {
        ritualDrone.stop();
        stateRef.current = null;
        resultRef.current = { ritualProps: undefined, phase: 'idle', progress: 0 };
        if (ritualRefRef.current) ritualRefRef.current.current = undefined;
      }
      return;
    }

    const config = getEvocationConfig(rank);
    const glowColor = manifest.glow.color || '#ff4444';

    stateRef.current = {
      startTime: -1,
      phase: 'idle',
      progress: 0,
      config,
      glowColor,
      ritualProps: {},
      droneStarted: false,
      demonRevealed: false,
    };

    const tick = (time: number) => {
      const s = stateRef.current;
      if (!s) return;

      const t = time / 1000;
      if (s.startTime < 0) s.startTime = t;
      const elapsed = t - s.startTime;
      s.progress = Math.min(elapsed / s.config.duration, 1);

      if (!s.droneStarted) {
        s.droneStarted = true;
        ritualDrone.startEvocation(rank, s.glowColor);
      }

      const revealDemon = () => {
        if (!s.demonRevealed) {
          s.demonRevealed = true;
          onDemonRevealRef.current?.();
        }
      };

      orchestrate(s, s.progress, revealDemon);

      const props = { ...s.ritualProps };
      resultRef.current = { ritualProps: props, phase: s.phase, progress: s.progress };
      if (ritualRefRef.current) ritualRefRef.current.current = props;

      if (s.progress >= 1) {
        s.phase = 'complete';
        resultRef.current = { ritualProps: undefined, phase: 'complete', progress: 1 };
        if (ritualRefRef.current) ritualRefRef.current.current = undefined;
        stateRef.current = null;
        onCompleteRef.current();
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ritualDrone.stop();
      stateRef.current = null;
    };
  }, [active, rank, manifest]);

  return resultRef.current;
}

// ─── Single orchestrator ─────────────────────────────────────────────────

function orchestrate(s: EvocationState, progress: number, revealDemon: () => void) {
  const cfg = s.config;

  if (progress < cfg.crescendoEnd) {
    // ── Crescendo: distortion + rotation + waves build ──
    const t = progress / cfg.crescendoEnd;
    s.phase = 'crescendo';
    composeCrescendo(s, t);

  } else if (progress < cfg.explosionEnd) {
    // ── Explosion: flash peak, distortion breaks, demon appears ──
    const t = (progress - cfg.crescendoEnd) / (cfg.explosionEnd - cfg.crescendoEnd);
    s.phase = 'explosion';
    revealDemon();
    composeExplosion(s, t);

  } else {
    // ── Reveal: flash fades, distortion gone, demon settles ──
    const t = (progress - cfg.explosionEnd) / (1 - cfg.explosionEnd);
    s.phase = 'reveal';
    revealDemon();
    composeReveal(s, t);
  }
}

function composeCrescendo(s: EvocationState, t: number) {
  const cfg = s.config;
  // Quadratic ease-in: perceptible early, dramatic ramp at end
  const eased = t * t;

  s.ritualProps = {
    waves: {
      origin: [0, 0, 0],
      speed: 6 + eased * 10,
      intensity: 0.05 + eased * cfg.waveIntensityMax,
      frequency: 0.2 + eased * cfg.waveFreqMax,
    },
    rotationBoost: 1 + eased * (cfg.rotationBoostMax - 1),
    distortion: eased * cfg.distortionMax,
    colorShift: {
      target: s.glowColor,
      // Color shift intensifies with distortion — more aberrated = more tinted
      intensity: eased * (0.2 + cfg.distortionMax * 0.6),
    },
  };
}

// Deterministic pseudo-random from seed — same every frame for a given t
function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function composeExplosion(s: EvocationState, t: number) {
  const cfg = s.config;
  const explosionDur = (cfg.explosionEnd - cfg.crescendoEnd) * cfg.duration;
  const elapsed = t * explosionDur; // seconds into explosion phase

  // Main flash: distinct peaks for each thunder
  let flash = 0;
  let anyThunderActive = false;
  for (let i = 0; i < cfg.thunderCount; i++) {
    const thunderStart = i * cfg.thunderSpacing;
    const localElapsed = elapsed - thunderStart;
    if (localElapsed >= 0) {
      anyThunderActive = true;
      // Sharp attack (20ms), hold (30ms), rapid decay (300ms)
      let peak = 0;
      if (localElapsed < 0.02) {
        peak = localElapsed / 0.02;
      } else if (localElapsed < 0.05) {
        peak = 1;
      } else if (localElapsed < 0.35) {
        peak = 1 - (localElapsed - 0.05) / 0.3;
      }
      flash += cfg.flashIntensity * Math.max(0, peak) * (1 + i * 0.2);
    }
  }

  // Lightning flicker — rapid random strobes during thunder window
  // More thunders = more flicker intensity
  let lightning = 0;
  if (anyThunderActive && cfg.thunderCount > 1) {
    const totalThunderWindow = (cfg.thunderCount - 1) * cfg.thunderSpacing + 0.5;
    if (elapsed < totalThunderWindow) {
      // Flicker: random pulses at ~30Hz, intensity scales with rank
      const flickerRate = 30;
      const flickerSeed = Math.floor(elapsed * flickerRate);
      const flickerVal = pseudoRand(flickerSeed);
      // Only fire ~40% of frames — irregular, like real lightning
      if (flickerVal > 0.6) {
        const flickerIntensity = (flickerVal - 0.6) / 0.4; // 0-1
        // Scale by thunderCount: major gets subtle flickers, prince gets violent
        lightning = flickerIntensity * cfg.flashIntensity * (cfg.thunderCount - 1) * 0.25;
      }
    }
  }

  flash = Math.min(flash + lightning, 1.5);

  // Distortion collapses — persists through multiple thunders
  const distortion = cfg.distortionMax * Math.max(0, 1 - t * 1.2);

  // Rotation slows back
  const rotBoost = 1 + (cfg.rotationBoostMax - 1) * Math.max(0, 1 - t * 1.5);

  // Waves die
  const waveIntensity = cfg.waveIntensityMax * Math.max(0, 1 - t * 2);

  s.ritualProps = {
    flash: {
      intensity: flash,
      color: flash > 0.8 ? '#ffffff' : s.glowColor, // overexposure goes white
    },
    distortion,
    rotationBoost: rotBoost,
    waves: waveIntensity > 0.01 ? {
      origin: [0, 0, 0],
      speed: 14,
      intensity: waveIntensity,
      frequency: 1,
    } : undefined,
    colorShift: {
      target: s.glowColor,
      intensity: 0.3 * (1 - t),
    },
  };
}

function composeReveal(s: EvocationState, t: number) {
  // Everything fades to nothing. Demon is settling in.
  const fade = 1 - t * t; // quadratic fade

  s.ritualProps = {
    flash: fade > 0.01 ? {
      intensity: s.config.flashIntensity * 0.15 * fade,
      color: s.glowColor,
    } : undefined,
    colorShift: fade > 0.01 ? {
      target: s.glowColor,
      intensity: 0.15 * fade,
    } : undefined,
  };
}
