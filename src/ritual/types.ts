// Demon manifest types — mirrors the Rust DemonManifest schema

import type { GeometryParams } from './geometries';

// ─── Geometry schemas per rank ─────────────────────────────────────────────

export interface RotationConfig {
  speed: number;
  axis: [number, number, number];
}

/** Minor/Major geometry — single body */
export interface SingleGeometry {
  type: string;
  params?: GeometryParams;
  rotation: RotationConfig;
}

/** Prince composite body */
export interface CompositeBody {
  shape: string;
  scale: number;
  color: { base: string; variance: number };
  opacity: number;
  params?: GeometryParams;
}

/** Prince orbit definition */
export interface OrbitConfig {
  body: number;
  center: [number, number, number];
  axis: [number, number, number];
  speed: number;
  direction: 1 | -1;
  radius: number;
  phase: number;
}

/** Prince composite geometry */
export interface CompositeGeometry {
  type: 'composite';
  pattern: string;
  bodies: CompositeBody[];
  orbits: OrbitConfig[];
  rotations: { body: number; speed: number; axis: [number, number, number] }[];
}

export type DemonGeometry = SingleGeometry | CompositeGeometry;

export function isComposite(geo: DemonGeometry): geo is CompositeGeometry {
  return geo.type === 'composite';
}

// ─── Voice params ────────────────────────────────────────────────────────────

export interface VoiceParams {
  baseFrequency: number;
  formants: [number, number, number];
  breathiness: number;
  speed: number;
}

// ─── Full manifest ───────────────────────────────────────────────────────────

export interface DemonManifest {
  rank: string;
  geometry: DemonGeometry;
  scale: number;
  color?: { base: string; variance: number };
  opacity?: number;
  glow: { intensity: number; color: string };
  pulse_frequency: number;
  noise_amplitude: number;
  output_modes: string[];
  voice: VoiceParams;
}
