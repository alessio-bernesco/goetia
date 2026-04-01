// Banishment — hook that orchestrates the banishment (dismissal) sequence
// Symmetric inverse of evocation: dissolution → return to galaxies → closure

import { useRef, useEffect } from 'react';
import {
  type RitualModulation,
  type BanishmentParams,
  getBanishmentParams,
} from '../RitualConfig';
import { ritualDrone } from '../../audio/RitualDrone';
import type { DemonManifest } from '../types';
import { isComposite } from '../types';
import { createGeometry, type GeometryType } from '../geometries';

export type BanishmentPhase = 'idle' | 'dissolution' | 'return' | 'closure' | 'complete';

export interface UseBanishmentResult {
  ritualProps: RitualModulation | undefined;
  phase: BanishmentPhase;
  progress: number;
}

interface BanishmentState {
  startTime: number;
  phase: BanishmentPhase;
  progress: number;
  params: BanishmentParams;
  glowColor: string;
  ritualProps: RitualModulation;
  droneStarted: boolean;
  // Demon form positions for dissolution particles
  demonPositions: Float32Array;
}

// Sample points from the demon's geometry for dissolution
function sampleDemonPositions(manifest: DemonManifest, count: number): Float32Array {
  const geo = manifest.geometry;
  let shape: string;
  let scale: number;

  if (isComposite(geo)) {
    shape = geo.bodies[0].shape;
    scale = geo.bodies[0].scale * manifest.scale;
  } else {
    shape = geo.type;
    scale = manifest.scale;
  }

  const geometry = createGeometry(shape as GeometryType, scale);
  const posAttr = geometry.attributes.position;
  const vertexCount = posAttr.count;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * vertexCount);
    const b = Math.floor(Math.random() * vertexCount);
    const t = Math.random();
    positions[i * 3] = posAttr.getX(a) * (1 - t) + posAttr.getX(b) * t + (Math.random() - 0.5) * 0.05;
    positions[i * 3 + 1] = posAttr.getY(a) * (1 - t) + posAttr.getY(b) * t + (Math.random() - 0.5) * 0.05;
    positions[i * 3 + 2] = posAttr.getZ(a) * (1 - t) + posAttr.getZ(b) * t + (Math.random() - 0.5) * 0.05;
  }

  geometry.dispose();
  return positions;
}

export function useBanishment(
  active: boolean,
  rank: string,
  manifest: DemonManifest | null,
  onComplete: () => void,
  ritualRef?: React.MutableRefObject<RitualModulation | undefined>,
): UseBanishmentResult {
  const stateRef = useRef<BanishmentState | null>(null);
  const resultRef = useRef<UseBanishmentResult>({
    ritualProps: undefined,
    phase: 'idle',
    progress: 0,
  });
  const frameRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
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

    const params = getBanishmentParams(rank);
    const glowColor = manifest.glow.color || '#ff4444';
    const demonPositions = sampleDemonPositions(manifest, params.particleCount);

    stateRef.current = {
      startTime: -1,
      phase: 'dissolution',
      progress: 0,
      params,
      glowColor,
      ritualProps: {},
      droneStarted: false,
      demonPositions,
    };

    const tick = (time: number) => {
      const s = stateRef.current;
      if (!s) return;

      const t = time / 1000;

      if (s.startTime < 0) s.startTime = t;
      const elapsed = t - s.startTime;
      const duration = s.params.duration;
      s.progress = Math.min(elapsed / duration, 1);

      if (!s.droneStarted) {
        s.droneStarted = true;
        ritualDrone.startBanishment(rank, s.glowColor);
      }

      const { phases } = s.params;
      const dissolutionEnd = phases.dissolution;
      const returnEnd = dissolutionEnd + phases.return;

      if (s.progress < dissolutionEnd) {
        s.phase = 'dissolution';
        composeDissolution(s, s.progress / dissolutionEnd);
      } else if (s.progress < returnEnd) {
        s.phase = 'return';
        const phaseProgress = (s.progress - dissolutionEnd) / phases.return;
        composeReturn(s, phaseProgress);
      } else if (s.progress < 1) {
        s.phase = 'closure';
        const phaseProgress = (s.progress - returnEnd) / phases.closure;
        composeClosure(s, phaseProgress);
      }

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

function composeDissolution(s: BanishmentState, phaseProgress: number) {
  const p = s.params;

  // Flash at the start (masks DemonForm unmount)
  const flashCurve = phaseProgress < 0.4
    ? phaseProgress / 0.4
    : Math.max(0, 1 - (phaseProgress - 0.4) / 0.6);

  s.ritualProps = {
    flash: p.flashIntensity > 0 ? {
      intensity: p.flashIntensity * flashCurve,
      color: s.glowColor,
    } : undefined,
    // Restitution starts immediately — particles at demon position, heading outward
    restitution: {
      count: p.particleCount,
      origin: [0, 0, 0],
      progress: phaseProgress * 0.3, // slow start — prince resistance
      trajectoryType: p.trajectoryType,
    },
  };

  // Shockwave (contracting) for prince
  if (p.hasShockwave) {
    const radius = 2 * (1 - phaseProgress);
    s.ritualProps.shockwave = {
      radius,
      intensity: 0.6 * (1 - phaseProgress),
      expanding: false,
    };
  }

  // Color shift present for prince
  if (p.hasColorShift) {
    s.ritualProps.colorShift = {
      target: s.glowColor,
      intensity: 0.6 * (1 - phaseProgress * 0.3),
    };
  }
}

function composeReturn(s: BanishmentState, phaseProgress: number) {
  const p = s.params;

  // Restitution progress maps through the return phase
  // princeResistance: slow start (particles hesitate)
  let restitutionProgress: number;
  if (p.princeResistance) {
    // Ease-in: slow at start, fast at end
    restitutionProgress = 0.3 + phaseProgress * phaseProgress * 0.7;
  } else {
    restitutionProgress = 0.3 + phaseProgress * 0.7;
  }

  s.ritualProps = {
    restitution: {
      count: p.particleCount,
      origin: [0, 0, 0],
      progress: Math.min(restitutionProgress, 1),
      trajectoryType: p.trajectoryType,
    },
  };

  // Return waves: as particles reach clouds, clouds flare
  if (p.hasReturnWaves) {
    s.ritualProps.waves = {
      origin: [0, 0, 0],
      speed: 6,
      intensity: 0.3 * phaseProgress,
      frequency: 0.5 + phaseProgress,
    };
  }

  // Color shift fading for prince
  if (p.hasColorShift) {
    s.ritualProps.colorShift = {
      target: s.glowColor,
      intensity: 0.5 * (1 - phaseProgress),
    };
  }
}

function composeClosure(s: BanishmentState, phaseProgress: number) {
  const p = s.params;

  s.ritualProps = {
    // Return waves from edges to center
    waves: p.hasReturnWaves ? {
      origin: [0, 0, 0],
      speed: 4,
      intensity: 0.2 * (1 - phaseProgress),
      frequency: 0.3,
    } : undefined,
  };

  // Final color shift reset
  if (p.hasColorShift && phaseProgress < 0.5) {
    s.ritualProps.colorShift = {
      target: s.glowColor,
      intensity: 0.1 * (1 - phaseProgress * 2),
    };
  }
}
