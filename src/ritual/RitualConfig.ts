// RitualConfig — centralised rank-based parameters for evocation & banishment
// All timing, particle counts, trajectories, and audio params live here.

// ─── Ritual modulation props (passed to GenesisVoid) ──────────────────────

export interface WaveModulation {
  origin: [number, number, number];
  speed: number;
  intensity: number;   // 0-1
  frequency: number;   // waves per second
}

export interface ColorShiftModulation {
  target: string;      // hex
  intensity: number;   // 0-1
}

export interface FlashModulation {
  intensity: number;   // 0-1
  color: string;       // hex
}

export interface ExtractionModulation {
  count: number;
  target: [number, number, number];
  progress: number;    // 0-1
  trajectoryType: TrajectoryType;
}

export interface RestitutionModulation {
  count: number;
  origin: [number, number, number];
  progress: number;    // 0-1
  trajectoryType: TrajectoryType;
}

export interface ShockwaveModulation {
  radius: number;      // 0-2
  intensity: number;   // 0-1
  expanding: boolean;
}

export interface RitualModulation {
  waves?: WaveModulation;
  colorShift?: ColorShiftModulation;
  flash?: FlashModulation;
  extraction?: ExtractionModulation;
  restitution?: RestitutionModulation;
  shockwave?: ShockwaveModulation;
}

// ─── Trajectory types ─────────────────────────────────────────────────────

export type TrajectoryType = 'linear' | 'spiral' | 'chaotic';

// ─── Drone params ─────────────────────────────────────────────────────────

export interface DroneParams {
  freqStart: number;
  freqEnd: number;
  beatStart: number;   // Hz
  beatEnd: number;     // Hz
  gainMax: number;
  hasSubBass: boolean;
  hasDissonance: boolean;
}

// ─── Evocation params ─────────────────────────────────────────────────────

export interface EvocationParams {
  duration: number;
  phases: { awakening: number; convergence: number; implosion: number; manifestation: number };
  waveCount: number;
  waveIntensity: number;
  waveSpeed: number;
  particleCount: number;
  trajectoryType: TrajectoryType;
  flashIntensity: number;
  hasShockwave: boolean;
  hasColorShift: boolean;
  drone: DroneParams;
}

// ─── Banishment params ────────────────────────────────────────────────────

export interface BanishmentParams {
  duration: number;
  phases: { dissolution: number; return: number; closure: number };
  particleCount: number;
  trajectoryType: TrajectoryType;
  flashIntensity: number;
  hasReturnWaves: boolean;
  hasShockwave: boolean;
  hasColorShift: boolean;
  princeResistance: boolean;
  abruptSilence: boolean;
  drone: DroneParams;
}

// ─── Rank configs ─────────────────────────────────────────────────────────

const MINOR_EVOCATION: EvocationParams = {
  duration: 5.5,
  phases: { awakening: 0.2, convergence: 0.25, implosion: 0.4, manifestation: 0.15 },
  waveCount: 3,
  waveIntensity: 0.3,
  waveSpeed: 8,
  particleCount: 300,
  trajectoryType: 'linear',
  flashIntensity: 0.15,
  hasShockwave: false,
  hasColorShift: false,
  drone: {
    freqStart: 80, freqEnd: 120,
    beatStart: 1, beatEnd: 3,
    gainMax: 0.15,
    hasSubBass: false, hasDissonance: false,
  },
};

const MINOR_BANISHMENT: BanishmentParams = {
  duration: 2.5,
  phases: { dissolution: 0.3, return: 0.5, closure: 0.2 },
  particleCount: 300,
  trajectoryType: 'linear',
  flashIntensity: 0.1,
  hasReturnWaves: true,
  hasShockwave: false,
  hasColorShift: false,
  princeResistance: false,
  abruptSilence: false,
  drone: {
    freqStart: 120, freqEnd: 60,
    beatStart: 3, beatEnd: 0.5,
    gainMax: 0.12,
    hasSubBass: false, hasDissonance: false,
  },
};

const MAJOR_EVOCATION: EvocationParams = {
  duration: 7.0,
  phases: { awakening: 0.2, convergence: 0.25, implosion: 0.4, manifestation: 0.15 },
  waveCount: 5,
  waveIntensity: 0.6,
  waveSpeed: 10,
  particleCount: 750,
  trajectoryType: 'spiral',
  flashIntensity: 0.5,
  hasShockwave: false,
  hasColorShift: false,
  drone: {
    freqStart: 60, freqEnd: 140,
    beatStart: 1.5, beatEnd: 6,
    gainMax: 0.25,
    hasSubBass: false, hasDissonance: false,
  },
};

const MAJOR_BANISHMENT: BanishmentParams = {
  duration: 3.5,
  phases: { dissolution: 0.3, return: 0.5, closure: 0.2 },
  particleCount: 750,
  trajectoryType: 'spiral',
  flashIntensity: 0.3,
  hasReturnWaves: true,
  hasShockwave: false,
  hasColorShift: false,
  princeResistance: false,
  abruptSilence: false,
  drone: {
    freqStart: 140, freqEnd: 40,
    beatStart: 6, beatEnd: 1,
    gainMax: 0.2,
    hasSubBass: false, hasDissonance: false,
  },
};

const PRINCE_EVOCATION: EvocationParams = {
  duration: 9.0,
  phases: { awakening: 0.15, convergence: 0.2, implosion: 0.45, manifestation: 0.2 },
  waveCount: 8,
  waveIntensity: 1.0,
  waveSpeed: 14,
  particleCount: 1500,
  trajectoryType: 'chaotic',
  flashIntensity: 1.0,
  hasShockwave: true,
  hasColorShift: true,
  drone: {
    freqStart: 40, freqEnd: 180,
    beatStart: 2, beatEnd: 12,
    gainMax: 0.4,
    hasSubBass: true, hasDissonance: true,
  },
};

const PRINCE_BANISHMENT: BanishmentParams = {
  duration: 5.0,
  phases: { dissolution: 0.3, return: 0.5, closure: 0.2 },
  particleCount: 1500,
  trajectoryType: 'chaotic',
  flashIntensity: 0.6,
  hasReturnWaves: true,
  hasShockwave: true,
  hasColorShift: true,
  princeResistance: true,
  abruptSilence: true,
  drone: {
    freqStart: 180, freqEnd: 30,
    beatStart: 12, beatEnd: 2,
    gainMax: 0.35,
    hasSubBass: true, hasDissonance: false,
  },
};

// ─── Public API ───────────────────────────────────────────────────────────

const EVOCATION_MAP: Record<string, EvocationParams> = {
  minor: MINOR_EVOCATION,
  major: MAJOR_EVOCATION,
  prince: PRINCE_EVOCATION,
};

const BANISHMENT_MAP: Record<string, BanishmentParams> = {
  minor: MINOR_BANISHMENT,
  major: MAJOR_BANISHMENT,
  prince: PRINCE_BANISHMENT,
};

export function getEvocationParams(rank: string): EvocationParams {
  return EVOCATION_MAP[rank] ?? MINOR_EVOCATION;
}

export function getBanishmentParams(rank: string): BanishmentParams {
  return BANISHMENT_MAP[rank] ?? MINOR_BANISHMENT;
}
