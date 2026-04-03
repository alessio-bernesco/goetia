// RitualConfig — centralised rank-based parameters for evocation & banishment

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

export interface EmberModulation {
  intensity: number;   // 0-1
  color: string;       // hex
  size: number;        // sprite scale
}

export interface RitualModulation {
  waves?: WaveModulation;
  colorShift?: ColorShiftModulation;
  flash?: FlashModulation;
  extraction?: ExtractionModulation;
  restitution?: RestitutionModulation;
  shockwave?: ShockwaveModulation;
  freeze?: boolean;
  ember?: EmberModulation;
  rotationBoost?: number;   // multiplier for galaxy rotation speed (1 = normal)
  distortion?: number;      // 0-1, radial barrel distortion + chromatic aberration
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

// ─── Evocation config ────────────────────────────────────────────────────
// All ranks: crescendo distortion → explosion → demon fade-in.
// Same structure, different intensities and durations.

export interface EvocationConfig {
  duration: number;             // total seconds
  crescendoEnd: number;         // proportion 0-1: end of crescendo phase
  explosionEnd: number;         // proportion 0-1: end of explosion (rest = reveal)
  rotationBoostMax: number;     // peak galaxy rotation multiplier
  distortionMax: number;        // peak barrel distortion (0-1)
  flashIntensity: number;       // explosion flash peak (0-1)
  waveIntensityMax: number;     // peak wave pulsation (0-1)
  waveFreqMax: number;          // peak wave frequency (Hz)
  drone: DroneParams;
  thunderCount: number;           // 1=minor, 2=major, 3=prince
  thunderSpacing: number;         // seconds between consecutive thunders
  boom: {
    subFreq: number;            // sub-bass sine (Hz)
    subGain: number;
    subDecay: number;           // seconds
    crackGain: number;          // rumble tail gain
    crackDecay: number;         // seconds
  };
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

const MINOR_EVOCATION: EvocationConfig = {
  duration: 16,
  crescendoEnd: 0.75,          // 12s crescendo
  explosionEnd: 0.9,           // 2.4s explosion phase
  rotationBoostMax: 2.0,
  distortionMax: 0.15,
  flashIntensity: 0.5,
  waveIntensityMax: 0.4,
  waveFreqMax: 2,
  drone: {
    freqStart: 80, freqEnd: 400,
    beatStart: 1, beatEnd: 5,
    gainMax: 0.45,
    hasSubBass: false, hasDissonance: false,
  },
  thunderCount: 1,
  thunderSpacing: 0,
  boom: { subFreq: 45, subGain: 0.8, subDecay: 1.5, crackGain: 0.4, crackDecay: 0.5 },
};

const MAJOR_EVOCATION: EvocationConfig = {
  duration: 18,
  crescendoEnd: 0.72,          // 13s crescendo
  explosionEnd: 0.9,           // 3.2s explosion — room for 2 thunders
  rotationBoostMax: 3.0,
  distortionMax: 0.4,
  flashIntensity: 0.7,
  waveIntensityMax: 0.6,
  waveFreqMax: 3.5,
  drone: {
    freqStart: 60, freqEnd: 500,
    beatStart: 1.5, beatEnd: 8,
    gainMax: 0.5,
    hasSubBass: true, hasDissonance: false,
  },
  thunderCount: 2,
  thunderSpacing: 0.7,         // wide spacing — distinct events
  boom: { subFreq: 35, subGain: 1.0, subDecay: 1.5, crackGain: 0.6, crackDecay: 0.5 },
};

const PRINCE_EVOCATION: EvocationConfig = {
  duration: 22,
  crescendoEnd: 0.7,           // 15.4s crescendo
  explosionEnd: 0.9,           // 4.4s explosion — room for 3 thunders
  rotationBoostMax: 5.0,
  distortionMax: 0.9,
  flashIntensity: 1.0,
  waveIntensityMax: 1.0,
  waveFreqMax: 6,
  drone: {
    freqStart: 40, freqEnd: 700,
    beatStart: 2, beatEnd: 14,
    gainMax: 0.6,
    hasSubBass: true, hasDissonance: true,
  },
  thunderCount: 3,
  thunderSpacing: 0.6,         // each thunder clearly separate
  boom: { subFreq: 25, subGain: 1.2, subDecay: 2.0, crackGain: 0.8, crackDecay: 0.6 },
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

const EVOCATION_MAP: Record<string, EvocationConfig> = {
  minor: MINOR_EVOCATION,
  major: MAJOR_EVOCATION,
  prince: PRINCE_EVOCATION,
};

const BANISHMENT_MAP: Record<string, BanishmentParams> = {
  minor: MINOR_BANISHMENT,
  major: MAJOR_BANISHMENT,
  prince: PRINCE_BANISHMENT,
};

export function getEvocationConfig(rank: string): EvocationConfig {
  return EVOCATION_MAP[rank] ?? MINOR_EVOCATION;
}

export function getBanishmentParams(rank: string): BanishmentParams {
  return BANISHMENT_MAP[rank] ?? MINOR_BANISHMENT;
}
