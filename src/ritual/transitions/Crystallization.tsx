// Crystallization — transition from genesis void to the demon's form
// Points coalesce from scattered noise into the demon's geometry

import { useRef } from 'react';
import * as THREE from 'three';
import { Scene } from '../Scene';
import { createGeometry, type GeometryType } from '../geometries';

interface CrystallizationProps {
  geometry: string;
  scale: number;
  color: string;
  duration?: number;
  onComplete?: () => void;
}

const POINT_COUNT = 3000;

// Sample points on a geometry surface
function samplePoints(geo: THREE.BufferGeometry, count: number): Float32Array {
  const posAttr = geo.attributes.position;
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
  return positions;
}

export function Crystallization({
  geometry,
  scale,
  color,
  duration = 4,
  onComplete,
}: CrystallizationProps) {
  const stateRef = useRef<{
    points: THREE.Points;
    targetPositions: Float32Array;
    startPositions: Float32Array;
    startTime: number;
    completed: boolean;
  } | null>(null);

  const setup = (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    camera.position.set(0, 0, 5);

    const targetGeo = createGeometry(geometry as GeometryType, scale);
    const targetPositions = samplePoints(targetGeo, POINT_COUNT);

    // Start positions (scattered noise — far out, random sphere)
    const startPositions = new Float32Array(POINT_COUNT * 3);
    for (let i = 0; i < POINT_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * 8;
      startPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      startPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      startPositions[i * 3 + 2] = r * Math.cos(phi);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(startPositions), 3));

    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: 0.04,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    stateRef.current = {
      points,
      targetPositions,
      startPositions,
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

    // Ease-in-out cubic
    const t = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const positions = state.points.geometry.attributes.position;
    const count = positions.count;

    for (let i = 0; i < count * 3; i++) {
      const start = state.startPositions[i];
      const target = state.targetPositions[i];
      (positions.array as Float32Array)[i] = start + (target - start) * t;
    }
    positions.needsUpdate = true;

    const mat = state.points.material as THREE.PointsMaterial;
    mat.size = 0.04 + t * 0.02;
    mat.opacity = 0.3 + t * 0.7;

    state.points.rotation.y += 0.005;

    if (progress >= 1 && !state.completed) {
      state.completed = true;
      onComplete?.();
    }
  };

  return <Scene children={setup} onFrame={onFrame} transparent />;
}
