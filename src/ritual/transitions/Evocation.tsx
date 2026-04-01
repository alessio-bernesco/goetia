// Evocation — hook that orchestrates the evocation sequence
// Computes RitualModulation props for GenesisVoid frame-by-frame

import { useRef, useEffect } from 'react';
import {
  type RitualModulation,
  type EvocationParams,
  getEvocationParams,
} from '../RitualConfig';
import { ritualDrone } from '../../audio/RitualDrone';
import type { DemonManifest } from '../types';

export type EvocationPhase = 'idle' | 'awakening' | 'convergence' | 'implosion' | 'manifestation' | 'complete';

export interface UseEvocationResult {
  ritualProps: RitualModulation | undefined;
  phase: EvocationPhase;
  progress: number;
}

interface EvocationState {
  startTime: number;
  phase: EvocationPhase;
  progress: number;
  params: EvocationParams;
  glowColor: string;
  ritualProps: RitualModulation;
  droneStarted: boolean;
}

export function useEvocation(
  active: boolean,
  rank: string,
  manifest: DemonManifest | null,
  onComplete: () => void,
  ritualRef?: React.MutableRefObject<RitualModulation | undefined>,
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
  const ritualRefRef = useRef(ritualRef);
  ritualRefRef.current = ritualRef;

  // Start/stop the animation loop
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

    const params = getEvocationParams(rank);
    const glowColor = manifest.glow.color || '#ff4444';

    stateRef.current = {
      startTime: -1,
      phase: 'awakening',
      progress: 0,
      params,
      glowColor,
      ritualProps: {},
      droneStarted: false,
    };

    const tick = (time: number) => {
      const s = stateRef.current;
      if (!s) return;

      const t = time / 1000; // seconds

      if (s.startTime < 0) s.startTime = t;
      const elapsed = t - s.startTime;
      const duration = s.params.duration;
      s.progress = Math.min(elapsed / duration, 1);

      // Start drone on first tick
      if (!s.droneStarted) {
        s.droneStarted = true;
        ritualDrone.startEvocation(rank, s.glowColor);
      }

      // Determine phase
      const { phases } = s.params;
      const awakeningEnd = phases.awakening;
      const convergenceEnd = awakeningEnd + phases.convergence;
      const implosionEnd = convergenceEnd + phases.implosion;

      if (s.progress < awakeningEnd) {
        s.phase = 'awakening';
        composeAwakening(s, s.progress / awakeningEnd, t);
      } else if (s.progress < convergenceEnd) {
        s.phase = 'convergence';
        const phaseProgress = (s.progress - awakeningEnd) / phases.convergence;
        composeConvergence(s, phaseProgress, t);
      } else if (s.progress < implosionEnd) {
        s.phase = 'implosion';
        const phaseProgress = (s.progress - convergenceEnd) / phases.implosion;
        composeImplosion(s, phaseProgress, t);
      } else if (s.progress < 1) {
        s.phase = 'manifestation';
        const phaseProgress = (s.progress - implosionEnd) / phases.manifestation;
        composeManifestation(s, phaseProgress, t);
      }

      // Update result and write to shared ref for GenesisVoid
      const props = { ...s.ritualProps };
      resultRef.current = {
        ritualProps: props,
        phase: s.phase,
        progress: s.progress,
      };
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

// ─── Phase composers ──────────────────────────────────────────────────────

function composeAwakening(s: EvocationState, phaseProgress: number, _time: number) {
  const p = s.params;

  // Waves: frequency increases over the awakening phase
  const waveFreq = 0.5 + phaseProgress * (p.waveCount / (p.duration * p.phases.awakening));
  s.ritualProps = {
    waves: {
      origin: [0, 0, 0],
      speed: p.waveSpeed,
      intensity: p.waveIntensity * phaseProgress,
      frequency: waveFreq,
    },
  };

  // Color shift for prince (gradual)
  if (p.hasColorShift) {
    s.ritualProps.colorShift = {
      target: s.glowColor,
      intensity: phaseProgress * 0.3,
    };
  }
}

function composeConvergence(s: EvocationState, phaseProgress: number, _time: number) {
  const p = s.params;

  // Particles converge to ~0.6 progress (still spread, not collapsed)
  const extractionProgress = phaseProgress * 0.6;

  s.ritualProps = {
    waves: {
      origin: [0, 0, 0],
      speed: p.waveSpeed,
      intensity: p.waveIntensity,
      frequency: p.waveCount / (p.duration * p.phases.convergence),
    },
    extraction: {
      count: p.particleCount,
      target: [0, 0, 0],
      progress: extractionProgress,
      trajectoryType: p.trajectoryType,
    },
  };

  if (p.hasColorShift) {
    s.ritualProps.colorShift = {
      target: s.glowColor,
      intensity: 0.3 + phaseProgress * 0.5,
    };
  }
}

function composeImplosion(s: EvocationState, phaseProgress: number, _time: number) {
  const p = s.params;

  // Full expansion→compression:
  // 0.0→0.5: particles EXPLODE back to origin positions (progress 0.6 → 0)
  //           = they return to the galaxy edges, filling the screen
  // 0.5→1.0: particles SLAM inward to center (progress 0 → 1.0)
  //           = accelerating compression, violent
  let extractionProgress: number;
  if (phaseProgress < 0.5) {
    // Expansion: ease-out from 0.6 down to 0 (back to galaxy positions)
    const expandT = phaseProgress / 0.5;
    const eased = 1 - (1 - expandT) * (1 - expandT); // ease-out quadratic
    extractionProgress = 0.6 * (1 - eased);
  } else {
    // Compression: ease-in from 0 to 1.0 (accelerating slam to center)
    const compressT = (phaseProgress - 0.5) / 0.5;
    const eased = compressT * compressT * compressT; // ease-in cubic — slow then FAST
    extractionProgress = eased;
  }

  // Waves intensify during compression phase
  const inCompression = phaseProgress > 0.5;
  const compressionIntensity = inCompression ? (phaseProgress - 0.5) / 0.5 : 0;

  s.ritualProps = {
    waves: {
      origin: [0, 0, 0],
      speed: p.waveSpeed * (1 + compressionIntensity),
      intensity: p.waveIntensity * (inCompression ? 1 + compressionIntensity * 0.5 : 0.5),
      frequency: inCompression
        ? (p.waveCount / (p.duration * p.phases.implosion)) * (1 + compressionIntensity * 3)
        : 0.5,
    },
    extraction: {
      count: p.particleCount,
      target: [0, 0, 0],
      progress: extractionProgress,
      trajectoryType: p.trajectoryType,
    },
  };

  if (p.hasColorShift) {
    s.ritualProps.colorShift = {
      target: s.glowColor,
      intensity: 0.6 + compressionIntensity * 0.3,
    };
  }
}

function composeManifestation(s: EvocationState, phaseProgress: number, _time: number) {
  const p = s.params;

  // Flash peaks at beginning, then fades
  const flashCurve = phaseProgress < 0.3
    ? phaseProgress / 0.3
    : 1 - (phaseProgress - 0.3) / 0.7;

  s.ritualProps = {
    // Waves dissipate
    waves: {
      origin: [0, 0, 0],
      speed: p.waveSpeed,
      intensity: p.waveIntensity * (1 - phaseProgress),
      frequency: 0.3,
    },
    flash: p.flashIntensity > 0 ? {
      intensity: p.flashIntensity * flashCurve,
      color: s.glowColor,
    } : undefined,
  };

  // Shockwave for prince
  if (p.hasShockwave) {
    const radius = phaseProgress < 0.5
      ? phaseProgress * 2
      : 2 - Math.pow(2 - phaseProgress * 2, 2) / 2;
    s.ritualProps.shockwave = {
      radius: radius * 2,
      intensity: p.flashIntensity * (1 - phaseProgress),
      expanding: true,
    };
  }

  if (p.hasColorShift) {
    s.ritualProps.colorShift = {
      target: s.glowColor,
      intensity: 0.8 * (1 - phaseProgress),
    };
  }
}
