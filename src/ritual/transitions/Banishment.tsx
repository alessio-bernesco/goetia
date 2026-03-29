// Banishment — dissolves/fragments the demon form before disappearing
// Vertices scatter outward, opacity fades, form disintegrates

import { useRef } from 'react';
import * as THREE from 'three';
import { Scene } from '../Scene';
import { createGeometry, type GeometryType } from '../geometries';

interface BanishmentProps {
  geometry: string;
  scale: number;
  color: string;
  duration?: number;
  onComplete?: () => void;
}

// Sample points on a geometry surface for the dissolution effect
function samplePoints(geo: THREE.BufferGeometry, count: number): Float32Array {
  const posAttr = geo.attributes.position;
  const vertexCount = posAttr.count;

  if (vertexCount >= count) {
    // Enough vertices — use them directly
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const idx = i % vertexCount;
      positions[i * 3] = posAttr.getX(idx);
      positions[i * 3 + 1] = posAttr.getY(idx);
      positions[i * 3 + 2] = posAttr.getZ(idx);
    }
    return positions;
  }

  // Not enough vertices — interpolate between existing ones with jitter
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * vertexCount);
    const b = Math.floor(Math.random() * vertexCount);
    const t = Math.random();
    positions[i * 3] = posAttr.getX(a) * (1 - t) + posAttr.getX(b) * t + (Math.random() - 0.5) * 0.05;
    positions[i * 3 + 1] = posAttr.getY(a) * (1 - t) + posAttr.getY(b) * t + (Math.random() - 0.5) * 0.05;
    positions[i * 3 + 2] = posAttr.getZ(a) * (1 - t) + posAttr.getZ(b) * t + (Math.random() - 0.5) * 0.05;
  }
  return positions;
}

export function Banishment({
  geometry,
  scale,
  color,
  duration = 3,
  onComplete,
}: BanishmentProps) {
  const stateRef = useRef<{
    points: THREE.Points;
    basePositions: Float32Array;
    velocities: Float32Array;
    baseColor: THREE.Color;
    startTime: number;
    completed: boolean;
  } | null>(null);

  const setup = (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    camera.position.set(0, 0, 4);

    const geo = createGeometry(geometry as GeometryType, scale);
    const POINT_COUNT = 3000;
    const basePositions = samplePoints(geo, POINT_COUNT);

    const velocities = new Float32Array(POINT_COUNT * 3);
    for (let i = 0; i < POINT_COUNT; i++) {
      const nx = basePositions[i * 3];
      const ny = basePositions[i * 3 + 1];
      const nz = basePositions[i * 3 + 2];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      const speed = 1.5 + Math.random() * 3;
      velocities[i * 3] = (nx / len) * speed + (Math.random() - 0.5) * 2;
      velocities[i * 3 + 1] = (ny / len) * speed + (Math.random() - 0.5) * 2;
      velocities[i * 3 + 2] = (nz / len) * speed + (Math.random() - 0.5) * 2;
    }

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(basePositions), 3));

    const baseColor = new THREE.Color(color);
    const mat = new THREE.PointsMaterial({
      color: baseColor,
      size: 0.06,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(pointGeo, mat);
    scene.add(points);

    stateRef.current = {
      points,
      basePositions,
      velocities,
      baseColor,
      startTime: -1,
      completed: false,
    };
  };

  const onFrame = (time: number) => {
    const state = stateRef.current;
    if (!state || state.completed) return;

    if (state.startTime < 0) state.startTime = time;
    const elapsed = time - state.startTime;
    const progress = Math.min(elapsed / duration, 1);
    const t = progress * progress;

    const positions = state.points.geometry.attributes.position;
    const count = positions.count;

    for (let i = 0; i < count * 3; i++) {
      (positions.array as Float32Array)[i] =
        state.basePositions[i] + state.velocities[i] * t;
    }
    positions.needsUpdate = true;

    const mat = state.points.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - progress * 1.2);
    mat.size = 0.06 * (1 - progress * 0.5);

    // Fade from original color to black
    mat.color.setRGB(
      state.baseColor.r * (1 - progress),
      state.baseColor.g * (1 - progress),
      state.baseColor.b * (1 - progress),
    );

    state.points.rotation.y += 0.01 + progress * 0.05;

    if (progress >= 1 && !state.completed) {
      state.completed = true;
      onComplete?.();
    }
  };

  return <Scene children={setup} onFrame={onFrame} transparent />;
}
