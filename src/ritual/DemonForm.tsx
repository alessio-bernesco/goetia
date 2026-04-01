// DemonForm — loads geometry from manifest, applies visual parameters + transient state
// Supports single bodies (minor/major) and composite multi-body (prince)

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Scene } from './Scene';
import { createGeometry, type GeometryType, type GeometryParams } from './geometries';
import type { DemonVisualState } from '../state/appState';
import type { DemonManifest, OrbitConfig } from './types';
import { isComposite } from './types';

import demonVertexShader from './shaders/demon.vert.glsl?raw';
import demonFragmentShader from './shaders/demon.frag.glsl?raw';

interface DemonFormProps {
  manifest: DemonManifest;
  visualState?: DemonVisualState | null;
  waiting?: boolean;
  speaking?: boolean;
  arriving?: boolean;
  departing?: boolean;
  onDepartComplete?: () => void;
}

function hexToVec3(hex: string): THREE.Vector3 {
  const color = new THREE.Color(hex);
  return new THREE.Vector3(color.r, color.g, color.b);
}

// ─── Shared uniform factory ────────────────────────────────────────────────

function createUniforms(
  baseColor: string,
  manifest: DemonManifest,
  opacity: number,
): Record<string, THREE.IUniform> {
  const color = hexToVec3(baseColor);
  return {
    uTime: { value: 0 },
    uPulseFrequency: { value: manifest.pulse_frequency },
    uNoiseAmplitude: { value: manifest.noise_amplitude },
    uScaleFactor: { value: 1.0 },
    uBaseColor: { value: new THREE.Vector3(color.x, color.y, color.z) },
    uColorShift: { value: new THREE.Vector3(1, 1, 1) },
    uGlowIntensity: { value: manifest.glow.intensity },
    uOpacity: { value: opacity },
    uValence: { value: 0 },
    uSpeaking: { value: 0 },
    uWaiting: { value: 0 },
  };
}

// ─── Single body mesh builder ──────────────────────────────────────────────

function buildSingleMesh(
  shape: string,
  scale: number,
  baseColor: string,
  opacity: number,
  glowColor: string,
  manifest: DemonManifest,
  params?: GeometryParams,
): { mesh: THREE.Object3D; uniforms: Record<string, THREE.IUniform>; isPoints: boolean; basePositions: Float32Array | null; wireframeMat?: THREE.MeshBasicMaterial } {
  const geometry = createGeometry(shape as GeometryType, scale, params);
  const uniforms = createUniforms(baseColor, manifest, opacity);
  const isPoints = shape === 'point_cloud';

  if (isPoints) {
    const pointMat = new THREE.PointsMaterial({
      color: new THREE.Color(baseColor),
      size: 0.03,
      transparent: true,
      opacity,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, pointMat);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    return { mesh: points, uniforms, isPoints: true, basePositions: new Float32Array(pos.array) };
  }

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

  // Wireframe overlay
  const wireMat = new THREE.MeshBasicMaterial({
    color: glowColor,
    wireframe: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const wireMesh = new THREE.Mesh(geometry.clone(), wireMat);
  mesh.add(wireMesh);

  return { mesh, uniforms, isPoints: false, basePositions: null, wireframeMat: wireMat };
}

// ─── Component ─────────────────────────────────────────────────────────────

interface BodyRef {
  mesh: THREE.Object3D;
  uniforms: Record<string, THREE.IUniform>;
  isPoints: boolean;
  basePositions: Float32Array | null;
  rotation?: { speed: number; axis: [number, number, number] };
  orbit?: OrbitConfig;
  wireframeMat?: THREE.MeshBasicMaterial;
  baseWireframeOpacity: number;
}

// Arrival animation duration (seconds)
const ARRIVAL_DURATION = 4.0;
// Peak perturbation strength during arrival (speaking=1 is normal speech)
const ARRIVAL_PERTURBATION = 3.5;
// Departure animation duration (seconds)
const DEPARTURE_DURATION = 2.5;
// Number of dissolution particles
const DEPARTURE_PARTICLE_COUNT = 2000;
// Peak perturbation during departure
const DEPARTURE_PERTURBATION = 4.0;

interface DepartureState {
  startTime: number;
  active: boolean;
  completed: boolean;
  particles: THREE.Points | null;
  velocities: Float32Array | null;
  basePositions: Float32Array | null;
}

export function DemonForm({ manifest, visualState, waiting = false, speaking = false, arriving = false, departing = false, onDepartComplete }: DemonFormProps) {
  const bodiesRef = useRef<BodyRef[]>([]);
  const arrivalRef = useRef<{ startTime: number; active: boolean }>({ startTime: -1, active: arriving });
  const departureRef = useRef<DepartureState>({ startTime: -1, active: false, completed: false, particles: null, velocities: null, basePositions: null });
  const sceneRef = useRef<THREE.Scene | null>(null);
  const onDepartCompleteRef = useRef(onDepartComplete);
  onDepartCompleteRef.current = onDepartComplete;
  const geo = manifest.geometry;

  const setup = useCallback((scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    camera.position.set(0, 0, 4);
    sceneRef.current = scene;

    if (isComposite(geo)) {
      // ─── Prince: composite multi-body ─────────────────────────────
      const group = new THREE.Group();
      const bodies: BodyRef[] = [];

      geo.bodies.forEach((body, i) => {
        const built = buildSingleMesh(
          body.shape,
          body.scale * manifest.scale,
          body.color.base,
          body.opacity,
          manifest.glow.color,
          manifest,
          body.params,
        );

        // Find rotation for this body
        const rot = geo.rotations.find(r => r.body === i);
        // Find orbit for this body
        const orbit = geo.orbits.find(o => o.body === i);

        // Set initial position for axis pattern (center offset)
        if (orbit && orbit.radius === 0 && orbit.speed === 0) {
          built.mesh.position.set(orbit.center[0], orbit.center[1], orbit.center[2]);
        }

        group.add(built.mesh);
        bodies.push({
          mesh: built.mesh,
          uniforms: built.uniforms,
          isPoints: built.isPoints,
          basePositions: built.basePositions,
          wireframeMat: built.wireframeMat,
          baseWireframeOpacity: built.wireframeMat?.opacity ?? 0.6,
          rotation: rot ? { speed: rot.speed, axis: rot.axis } : undefined,
          orbit: orbit && orbit.radius > 0 ? orbit : undefined,
        });
      });

      scene.add(group);
      bodiesRef.current = bodies;
    } else {
      // ─── Minor/Major: single body ─────────────────────────────────
      const baseColor = manifest.color?.base ?? '#ff4444';
      const opacity = manifest.opacity ?? 0.8;
      const built = buildSingleMesh(
        geo.type,
        manifest.scale,
        baseColor,
        opacity,
        manifest.glow.color,
        manifest,
        geo.params,
      );

      scene.add(built.mesh);
      bodiesRef.current = [{
        mesh: built.mesh,
        uniforms: built.uniforms,
        isPoints: built.isPoints,
        basePositions: built.basePositions,
        wireframeMat: built.wireframeMat,
        baseWireframeOpacity: built.wireframeMat?.opacity ?? 0.6,
        rotation: { speed: geo.rotation.speed, axis: geo.rotation.axis },
      }];
    }
  }, [manifest]);

  // Update transient visual state
  useEffect(() => {
    if (!visualState) return;
    for (const body of bodiesRef.current) {
      const u = body.uniforms;
      u.uScaleFactor.value = visualState.scale_factor;
      u.uValence.value = visualState.valence;
      u.uColorShift.value = new THREE.Vector3(
        visualState.color_shift[0],
        visualState.color_shift[1],
        visualState.color_shift[2],
      );
      if (visualState.glow_override != null) u.uGlowIntensity.value = visualState.glow_override;
      if (visualState.pulse_override != null) u.uPulseFrequency.value = visualState.pulse_override;
    }
  }, [visualState]);

  // Trigger departure when prop changes
  useEffect(() => {
    if (departing && !departureRef.current.active && !departureRef.current.completed) {
      departureRef.current.active = true;
      departureRef.current.startTime = -1;

      // Spawn dissolution particles from the first body's geometry
      const scene = sceneRef.current;
      if (scene && bodiesRef.current.length > 0) {
        const firstBody = bodiesRef.current[0];
        const geo = (firstBody.mesh as THREE.Mesh).geometry || (firstBody.mesh as any).geometry;
        if (geo) {
          const posAttr = geo.attributes.position;
          const vertexCount = posAttr.count;
          const positions = new Float32Array(DEPARTURE_PARTICLE_COUNT * 3);
          const velocities = new Float32Array(DEPARTURE_PARTICLE_COUNT * 3);

          for (let i = 0; i < DEPARTURE_PARTICLE_COUNT; i++) {
            // Sample a point on the geometry surface
            const a = Math.floor(Math.random() * vertexCount);
            const b = Math.floor(Math.random() * vertexCount);
            const t = Math.random();
            const px = posAttr.getX(a) * (1 - t) + posAttr.getX(b) * t;
            const py = posAttr.getY(a) * (1 - t) + posAttr.getY(b) * t;
            const pz = posAttr.getZ(a) * (1 - t) + posAttr.getZ(b) * t;
            positions[i * 3] = px;
            positions[i * 3 + 1] = py;
            positions[i * 3 + 2] = pz;

            // Radial velocity outward + random jitter
            const len = Math.sqrt(px * px + py * py + pz * pz) || 0.1;
            const speed = 2 + Math.random() * 4;
            velocities[i * 3] = (px / len) * speed + (Math.random() - 0.5) * 2;
            velocities[i * 3 + 1] = (py / len) * speed + (Math.random() - 0.5) * 2;
            velocities[i * 3 + 2] = (pz / len) * speed + (Math.random() - 0.5) * 2;
          }

          const particleGeo = new THREE.BufferGeometry();
          particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(positions), 3));

          const glowColor = new THREE.Color(manifest.glow.color || '#ff4444');
          const hsl = { h: 0, s: 0, l: 0 };
          glowColor.getHSL(hsl);
          if (hsl.l < 0.3) glowColor.setHSL(hsl.h, Math.max(hsl.s, 0.5), 0.4);
          glowColor.multiplyScalar(2.0);

          const particleMat = new THREE.PointsMaterial({
            color: glowColor,
            size: 0.06,
            transparent: true,
            opacity: 1.0,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });

          const particles = new THREE.Points(particleGeo, particleMat);
          particles.renderOrder = 20;
          scene.add(particles);

          departureRef.current.particles = particles;
          departureRef.current.velocities = velocities;
          departureRef.current.basePositions = positions;
        }
      }
    }
  }, [departing, manifest.glow.color]);

  const onFrame = useCallback((time: number) => {
    // ─── Arrival animation ────────────────────────────────────────
    const arr = arrivalRef.current;
    let arrivalFactor = 0; // 0 = fully arrived, 1 = just appearing
    if (arr.active) {
      if (arr.startTime < 0) arr.startTime = time;
      const elapsed = time - arr.startTime;
      if (elapsed < ARRIVAL_DURATION) {
        // Linear fade — long, steady, very visible transparency transition
        arrivalFactor = 1 - elapsed / ARRIVAL_DURATION;
      } else {
        arr.active = false;
        arrivalFactor = 0;
      }
    }

    // ─── Departure animation ───────────────────────────────────────
    const dep = departureRef.current;
    let departureFactor = 0; // 0 = not departing, 1 = fully dissolved
    if (dep.active && !dep.completed) {
      if (dep.startTime < 0) dep.startTime = time;
      const elapsed = time - dep.startTime;
      departureFactor = Math.min(elapsed / DEPARTURE_DURATION, 1);

      // Animate dissolution particles
      if (dep.particles && dep.velocities && dep.basePositions) {
        const positions = dep.particles.geometry.attributes.position;
        const t2 = departureFactor * departureFactor; // accelerating
        for (let i = 0; i < positions.count; i++) {
          const i3 = i * 3;
          (positions.array as Float32Array)[i3] = dep.basePositions[i3] + dep.velocities[i3] * t2;
          (positions.array as Float32Array)[i3 + 1] = dep.basePositions[i3 + 1] + dep.velocities[i3 + 1] * t2;
          (positions.array as Float32Array)[i3 + 2] = dep.basePositions[i3 + 2] + dep.velocities[i3 + 2] * t2;
        }
        positions.needsUpdate = true;

        const mat = dep.particles.material as THREE.PointsMaterial;
        // Stay bright for first 60%, then fade
        const fadeProg = Math.max(0, (departureFactor - 0.6) / 0.4);
        mat.opacity = 1 - fadeProg;
        mat.size = 0.06 * (1 + departureFactor * 0.8);
      }

      if (departureFactor >= 1) {
        dep.completed = true;
        dep.active = false;
        // Cleanup particles
        if (dep.particles && sceneRef.current) {
          sceneRef.current.remove(dep.particles);
          dep.particles.geometry.dispose();
          (dep.particles.material as THREE.PointsMaterial).dispose();
          dep.particles = null;
        }
        onDepartCompleteRef.current?.();
      }
    }

    for (const body of bodiesRef.current) {
      if (!body.mesh) continue;
      const u = body.uniforms;
      u.uTime.value = time;

      // Smooth speaking/waiting transitions
      // During arrival: override speaking with strong perturbation
      // During departure: strong perturbation as form dissolves
      const arrivalPerturbation = arrivalFactor * ARRIVAL_PERTURBATION;
      const departurePerturbation = departureFactor * DEPARTURE_PERTURBATION;
      const speakTarget = Math.max(speaking ? 1 : 0, arrivalPerturbation, departurePerturbation);
      u.uSpeaking.value += (speakTarget - u.uSpeaking.value) * 0.08;
      const waitTarget = waiting ? 1 : 0;
      u.uWaiting.value += (waitTarget - u.uWaiting.value) * 0.05;

      // Arrival opacity fade-in (shader + wireframe)
      if (arr.active || arrivalFactor > 0.01) {
        const opacityTarget = (1 - arrivalFactor);
        u.uOpacity.value = opacityTarget * (manifest.opacity ?? 0.8);
        if (body.wireframeMat) {
          body.wireframeMat.opacity = opacityTarget * body.baseWireframeOpacity;
        }
      }

      // Departure opacity fade-out (mesh dissolves while particles scatter)
      if (departureFactor > 0.01) {
        // Linear fade — steady dissolve over full departure duration
        const opacityTarget = Math.max(0, 1 - departureFactor);
        u.uOpacity.value = opacityTarget * (manifest.opacity ?? 0.8);
        if (body.wireframeMat) {
          body.wireframeMat.opacity = opacityTarget * body.baseWireframeOpacity;
        }
      }

      // Per-body rotation
      if (body.rotation) {
        const { speed, axis } = body.rotation;
        body.mesh.rotation.x += speed * axis[0];
        body.mesh.rotation.y += speed * axis[1];
        body.mesh.rotation.z += speed * axis[2];
      }

      // Arousal modulates rotation speed
      if (visualState?.arousal && body.rotation) {
        body.mesh.rotation.y += body.rotation.speed * visualState.arousal;
      }

      // Orbital animation
      if (body.orbit) {
        const orb = body.orbit;
        const angle = (time * orb.speed * orb.direction + (orb.phase * Math.PI / 180));
        // Compute position on orbit circle, rotated by orbit axis
        const baseX = Math.cos(angle) * orb.radius;
        const baseZ = Math.sin(angle) * orb.radius;
        // Simple axis rotation: if axis is mostly Y, orbit in XZ plane
        // For arbitrary axes, use full rotation matrix
        const ax = orb.axis[0], ay = orb.axis[1], az = orb.axis[2];
        const len = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
        const nx = ax / len, ny = ay / len, nz = az / len;

        // Rodrigues-style: find two perpendicular vectors to the axis
        // u = any vector not parallel to axis
        let ux: number, uy: number, uz: number;
        if (Math.abs(nx) < 0.9) {
          ux = 0; uy = -nz; uz = ny;
        } else {
          ux = nz; uy = 0; uz = -nx;
        }
        const ulen = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
        ux /= ulen; uy /= ulen; uz /= ulen;
        // v = axis × u
        const vx = ny * uz - nz * uy;
        const vy = nz * ux - nx * uz;
        const vz = nx * uy - ny * ux;

        body.mesh.position.set(
          orb.center[0] + baseX * ux + baseZ * vx,
          orb.center[1] + baseX * uy + baseZ * vy,
          orb.center[2] + baseX * uz + baseZ * vz,
        );
      }

      // Point cloud: animate positions directly
      if (body.isPoints && body.basePositions) {
        const geo = (body.mesh as unknown as THREE.Points).geometry;
        const pos = geo.attributes.position as THREE.BufferAttribute;
        const base = body.basePositions;
        const speakAmt = u.uSpeaking.value;
        const waitAmt = u.uWaiting.value;

        if (speakAmt > 0.01 || waitAmt > 0.01) {
          const breath = Math.sin(time * 5.0) * 0.06 * waitAmt;
          const scale = 1.0 + breath;
          for (let i = 0; i < pos.count; i++) {
            const i3 = i * 3;
            const bx = base[i3], by = base[i3 + 1], bz = base[i3 + 2];
            let px = bx * scale, py = by * scale, pz = bz * scale;
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

        // Point cloud arrival opacity
        if (arrivalFactor > 0.01) {
          const pointMat = (body.mesh as unknown as THREE.Points).material as THREE.PointsMaterial;
          pointMat.opacity = (1 - arrivalFactor) * (manifest.opacity ?? 0.8);
        }
      }
    }
  }, [visualState?.arousal, speaking, waiting, manifest.opacity]);

  return <Scene children={setup} onFrame={onFrame} transparent />;
}
