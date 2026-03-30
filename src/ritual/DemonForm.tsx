// DemonForm — loads geometry from manifest, applies visual parameters + transient state

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Scene } from './Scene';
import { createGeometry, type GeometryType } from './geometries';
import type { DemonVisualState } from '../state/appState';

import demonVertexShader from './shaders/demon.vert.glsl?raw';
import demonFragmentShader from './shaders/demon.frag.glsl?raw';

interface DemonManifest {
  geometry: string;
  scale: number;
  color: { base: string; variance: number };
  opacity: number;
  glow: { intensity: number; color: string };
  rotation_speed: number;
  pulse_frequency: number;
  noise_amplitude: number;
}

interface DemonFormProps {
  manifest: DemonManifest;
  visualState?: DemonVisualState | null;
  waiting?: boolean;
  speaking?: boolean;
}

function hexToVec3(hex: string): THREE.Vector3 {
  const color = new THREE.Color(hex);
  return new THREE.Vector3(color.r, color.g, color.b);
}

export function DemonForm({ manifest, visualState, waiting = false, speaking = false }: DemonFormProps) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const uniformsRef = useRef<Record<string, THREE.IUniform> | null>(null);
  const basePositionsRef = useRef<Float32Array | null>(null);
  const isPointCloud = manifest.geometry === 'point_cloud';

  const setup = useCallback((scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    camera.position.set(0, 0, 4);

    const geometry = createGeometry(manifest.geometry as GeometryType, manifest.scale);
    const baseColor = hexToVec3(manifest.color.base);

    const uniforms = {
      uTime: { value: 0 },
      uPulseFrequency: { value: manifest.pulse_frequency },
      uNoiseAmplitude: { value: manifest.noise_amplitude },
      uScaleFactor: { value: 1.0 },
      uBaseColor: { value: new THREE.Vector3(baseColor.x, baseColor.y, baseColor.z) },
      uColorShift: { value: new THREE.Vector3(1, 1, 1) },
      uGlowIntensity: { value: manifest.glow.intensity },
      uOpacity: { value: manifest.opacity },
      uValence: { value: 0 },
      uSpeaking: { value: 0 },
      uWaiting: { value: 0 },
    };

    if (manifest.geometry === 'point_cloud') {
      // Point cloud — render as points
      const pointMat = new THREE.PointsMaterial({
        color: new THREE.Color(manifest.color.base),
        size: 0.03,
        transparent: true,
        opacity: manifest.opacity,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const points = new THREE.Points(geometry, pointMat);
      scene.add(points);
      meshRef.current = points as unknown as THREE.Mesh;
      uniformsRef.current = uniforms;
      // Store original positions for speaking perturbation
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      basePositionsRef.current = new Float32Array(pos.array);
    } else {
      // Solid form with shader — semi-transparent glowing volume
      const material = new THREE.ShaderMaterial({
        vertexShader: demonVertexShader,
        fragmentShader: demonFragmentShader,
        uniforms,
        transparent: true,
        side: THREE.DoubleSide,
        wireframe: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      meshRef.current = mesh;
      uniformsRef.current = uniforms;

      // Bright wireframe overlay — the demon's skeleton
      const wireMat = new THREE.MeshBasicMaterial({
        color: manifest.glow.color,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const wireMesh = new THREE.Mesh(geometry.clone(), wireMat);
      mesh.add(wireMesh);
    }
  }, [manifest]);

  // Update transient visual state
  useEffect(() => {
    if (!uniformsRef.current || !visualState) return;
    const u = uniformsRef.current;

    u.uScaleFactor.value = visualState.scale_factor;
    u.uValence.value = visualState.valence;
    u.uColorShift.value = new THREE.Vector3(
      visualState.color_shift[0],
      visualState.color_shift[1],
      visualState.color_shift[2],
    );

    if (visualState.glow_override != null) {
      u.uGlowIntensity.value = visualState.glow_override;
    }
    if (visualState.pulse_override != null) {
      u.uPulseFrequency.value = visualState.pulse_override;
    }
  }, [visualState]);

  const onFrame = useCallback((time: number) => {
    if (!meshRef.current || !uniformsRef.current) return;

    uniformsRef.current.uTime.value = time;

    // Smooth transitions (~1s ease)
    const speakTarget = speaking ? 1 : 0;
    const speakCurrent = uniformsRef.current.uSpeaking.value;
    uniformsRef.current.uSpeaking.value += (speakTarget - speakCurrent) * 0.05;

    const waitTarget = waiting ? 1 : 0;
    const waitCurrent = uniformsRef.current.uWaiting.value;
    uniformsRef.current.uWaiting.value += (waitTarget - waitCurrent) * 0.05;

    // Base rotation
    meshRef.current.rotation.y += manifest.rotation_speed;
    meshRef.current.rotation.x += manifest.rotation_speed * 0.3;

    // Arousal modulates rotation speed
    if (visualState?.arousal) {
      meshRef.current.rotation.y += manifest.rotation_speed * visualState.arousal;
    }

    // Point cloud: no shader, animate positions directly
    if (isPointCloud && basePositionsRef.current) {
      const geo = (meshRef.current as unknown as THREE.Points).geometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const base = basePositionsRef.current;
      const speakAmt = uniformsRef.current.uSpeaking.value;
      const waitAmt = uniformsRef.current.uWaiting.value;

      if (speakAmt > 0.01 || waitAmt > 0.01) {
        const breath = Math.sin(time * 5.0) * 0.06 * waitAmt;
        const scale = 1.0 + breath;
        for (let i = 0; i < pos.count; i++) {
          const i3 = i * 3;
          const bx = base[i3], by = base[i3 + 1], bz = base[i3 + 2];
          // Breathing (scale from center)
          let px = bx * scale, py = by * scale, pz = bz * scale;
          // Speaking jitter
          if (speakAmt > 0.01) {
            const jitter = 0.15 * speakAmt;
            px += Math.sin(time * 18 + by * 12) * jitter;
            py += Math.sin(time * 23 + bz * 9) * jitter;
            pz += Math.sin(time * 31 + bx * 15) * jitter;
          }
          pos.array[i3] = px;
          pos.array[i3 + 1] = py;
          pos.array[i3 + 2] = pz;
        }
        pos.needsUpdate = true;
      } else if (pos.array[0] !== base[0]) {
        (pos.array as Float32Array).set(base);
        pos.needsUpdate = true;
      }
    }
  }, [manifest.rotation_speed, visualState?.arousal, speaking, waiting, isPointCloud]);

  return <Scene children={setup} onFrame={onFrame} transparent />;
}
