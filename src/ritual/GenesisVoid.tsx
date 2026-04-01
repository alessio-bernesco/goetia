// GenesisVoid — void nero, griglia sottile, nubi di punti distanti rotanti
// Now reactive: accepts optional ritual modulation props for evocation/banishment

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Scene } from './Scene';
import type { RitualModulation } from './RitualConfig';

import shockwaveVertSrc from './shaders/shockwave.vert.glsl?raw';
import shockwaveFragSrc from './shaders/shockwave.frag.glsl?raw';

interface GenesisVoidProps {
  ritual?: RitualModulation;
  ritualRef?: React.MutableRefObject<RitualModulation | undefined>;
}

interface CloudData {
  cloud: THREE.Points;
  originalColor: THREE.Color;
  basePositions: Float32Array;
  worldPos: THREE.Vector3;
  distFromOrigin: number; // cached distance to wave origin
}

interface ExtractionState {
  points: THREE.Points;
  startPositions: Float32Array;
  targetPositions: Float32Array;
  // Per-particle trajectory randomness (for spiral/chaotic)
  spiralPhases: Float32Array;
  spiralRadii: Float32Array;
  chaoticDelays: Float32Array;
  count: number;
  active: boolean;
}

interface RestitutionState {
  points: THREE.Points;
  startPositions: Float32Array;
  targetPositions: Float32Array;
  targetCloudIndices: Int32Array;
  spiralPhases: Float32Array;
  spiralRadii: Float32Array;
  chaoticDelays: Float32Array;
  count: number;
  active: boolean;
}

interface WaveState {
  emitTimes: number[];
  lastEmitTime: number;
}

export function GenesisVoid({ ritual, ritualRef: externalRitualRef }: GenesisVoidProps = {}) {
  const objectsRef = useRef<{
    clouds: CloudData[];
    grid: THREE.LineSegments;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer | null;
    flashMesh: THREE.Mesh | null;
    extraction: ExtractionState | null;
    restitution: RestitutionState | null;
    waves: WaveState;
    // Shockwave post-processing (lazy init)
    shockwave: {
      renderTarget: THREE.WebGLRenderTarget;
      quadScene: THREE.Scene;
      quadCamera: THREE.OrthographicCamera;
      material: THREE.ShaderMaterial;
    } | null;
  } | null>(null);

  const internalRitualRef = useRef<RitualModulation | undefined>(undefined);
  // Use external ref if provided (for frame-by-frame updates from hooks), else sync from prop
  const ritualRef = externalRitualRef || internalRitualRef;

  useEffect(() => {
    if (!externalRitualRef) {
      internalRitualRef.current = ritual;
    }
  }, [ritual, externalRitualRef]);

  const setup = (scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => {
    camera.position.set(0, 0, 8);

    // Subtle grid on the floor
    const gridGeo = new THREE.BufferGeometry();
    const gridPoints: number[] = [];
    const gridSize = 40;
    const gridStep = 2;
    for (let i = -gridSize; i <= gridSize; i += gridStep) {
      gridPoints.push(-gridSize, 0, i, gridSize, 0, i);
      gridPoints.push(i, 0, -gridSize, i, 0, gridSize);
    }
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
    const grid = new THREE.LineSegments(
      gridGeo,
      new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.5 }),
    );
    grid.position.y = -3;
    grid.rotation.x = Math.PI * 0.1;
    scene.add(grid);

    // Point clouds — "galaxies" orbiting at various depths
    const cloudConfigs = [
      { count: 3000, radius: 6, pos: [-4, 2, -8], axis: new THREE.Vector3(0.3, 1, 0.1), speed: 0.003, color: 0xbbbbbb, size: 0.03 },
      { count: 2000, radius: 4, pos: [5, -1, -6], axis: new THREE.Vector3(-0.5, 0.8, 0.3), speed: -0.002, color: 0x9999cc, size: 0.035 },
      { count: 4000, radius: 8, pos: [0, 0, -12], axis: new THREE.Vector3(0.1, 0.6, -0.8), speed: 0.001, color: 0xaaaaaa, size: 0.025 },
      { count: 1000, radius: 3, pos: [-6, -2, -4], axis: new THREE.Vector3(0.7, 0.3, 0.5), speed: 0.004, color: 0xcc7777, size: 0.04 },
      { count: 1500, radius: 5, pos: [3, 3, -10], axis: new THREE.Vector3(-0.2, 1, -0.3), speed: -0.0015, color: 0x77cc77, size: 0.03 },
    ];

    const clouds: CloudData[] = [];

    for (const cfg of cloudConfigs) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(cfg.count * 3);
      for (let i = 0; i < cfg.count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = cfg.radius * (0.3 + Math.random() * 0.7);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

      const mat = new THREE.PointsMaterial({
        color: cfg.color,
        size: cfg.size,
        transparent: true,
        opacity: 1.0,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const cloud = new THREE.Points(geo, mat);
      cloud.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      cloud.userData = { axis: cfg.axis.normalize(), speed: cfg.speed, baseSize: cfg.size, baseOpacity: 1.0 };
      scene.add(cloud);

      clouds.push({
        cloud,
        originalColor: new THREE.Color(cfg.color),
        basePositions: new Float32Array(positions),
        worldPos: new THREE.Vector3(cfg.pos[0], cfg.pos[1], cfg.pos[2]),
        distFromOrigin: 0,
      });
    }

    objectsRef.current = {
      clouds,
      grid,
      scene,
      camera,
      renderer,
      flashMesh: null,
      extraction: null,
      restitution: null,
      waves: { emitTimes: [], lastEmitTime: 0 },
      shockwave: null,
    };
  };

  const onFrame = (time: number) => {
    const state = objectsRef.current;
    if (!state) return;
    const { clouds, grid } = state;
    const r = ritualRef.current;

    // ─── Base rotation (always active) ──────────────────────────────
    for (const cd of clouds) {
      const { axis, speed } = cd.cloud.userData;
      cd.cloud.rotateOnAxis(axis, speed);
    }
    grid.position.z = Math.sin(time * 0.1) * 0.5;

    // ─── No ritual? Reset and return ────────────────────────────────
    if (!r) {
      resetRitualState(state, time);
      return;
    }

    // ─── Pulse wave system ──────────────────────────────────────────
    if (r.waves) {
      const w = r.waves;
      const origin = new THREE.Vector3(w.origin[0], w.origin[1], w.origin[2]);

      // Update cached distances
      for (const cd of clouds) {
        cd.distFromOrigin = cd.worldPos.distanceTo(origin);
      }

      // Emit new waves
      const waveInterval = w.frequency > 0 ? 1 / w.frequency : 999;
      if (time - state.waves.lastEmitTime > waveInterval) {
        state.waves.emitTimes.push(time);
        state.waves.lastEmitTime = time;
      }

      // Process active waves
      const threshold = 3.0;
      const maxWaveAge = 5.0;
      const activeWaves = state.waves.emitTimes.filter(t => time - t < maxWaveAge);
      state.waves.emitTimes = activeWaves;

      for (const cd of clouds) {
        let totalFlare = 0;
        for (const emitTime of activeWaves) {
          const waveRadius = (time - emitTime) * w.speed;
          const dist = cd.distFromOrigin;
          const diff = Math.abs(dist - waveRadius);
          if (diff < threshold) {
            const falloff = 1 - diff / threshold;
            totalFlare += w.intensity * falloff;
          }
        }
        totalFlare = Math.min(totalFlare, 1.5);

        const mat = cd.cloud.material as THREE.PointsMaterial;
        const baseSize = cd.cloud.userData.baseSize;
        mat.size = baseSize * (1 + totalFlare * 2);
        mat.opacity = Math.min(1, cd.cloud.userData.baseOpacity + totalFlare * 0.5);
      }
    } else {
      // Reset sizes when no waves
      for (const cd of clouds) {
        const mat = cd.cloud.material as THREE.PointsMaterial;
        mat.size += (cd.cloud.userData.baseSize - mat.size) * 0.1;
        mat.opacity += (cd.cloud.userData.baseOpacity - mat.opacity) * 0.1;
      }
    }

    // ─── Color shift ────────────────────────────────────────────────
    if (r.colorShift && r.colorShift.intensity > 0) {
      const targetColor = new THREE.Color(r.colorShift.target);
      for (const cd of clouds) {
        const mat = cd.cloud.material as THREE.PointsMaterial;
        mat.color.lerp(targetColor, r.colorShift.intensity * 0.05);
      }
    } else {
      // Lerp back to original
      for (const cd of clouds) {
        const mat = cd.cloud.material as THREE.PointsMaterial;
        mat.color.lerp(cd.originalColor, 0.03);
      }
    }

    // ─── Flash ──────────────────────────────────────────────────────
    if (r.flash && r.flash.intensity > 0.01) {
      if (!state.flashMesh) {
        const flashGeo = new THREE.PlaneGeometry(100, 100);
        const flashMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(r.flash.color),
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
          side: THREE.DoubleSide,
        });
        state.flashMesh = new THREE.Mesh(flashGeo, flashMat);
        state.flashMesh.position.z = state.camera.position.z - 1;
        state.flashMesh.renderOrder = 999;
        state.scene.add(state.flashMesh);
      }
      const flashMat = state.flashMesh.material as THREE.MeshBasicMaterial;
      flashMat.color.set(r.flash.color);
      flashMat.opacity = r.flash.intensity;
    } else if (state.flashMesh) {
      state.scene.remove(state.flashMesh);
      (state.flashMesh.material as THREE.MeshBasicMaterial).dispose();
      state.flashMesh.geometry.dispose();
      state.flashMesh = null;
    }

    // ─── Particle extraction ────────────────────────────────────────
    if (r.extraction) {
      if (!state.extraction || !state.extraction.active) {
        state.extraction = allocateExtraction(state, r.extraction.count, r.extraction.target, r.extraction.trajectoryType);
      }
      if (state.extraction.active) {
        animateExtraction(state.extraction, r.extraction.progress, r.extraction.trajectoryType, time);
      }
    } else if (state.extraction?.active) {
      cleanupExtraction(state);
    }

    // ─── Particle restitution ───────────────────────────────────────
    if (r.restitution) {
      if (!state.restitution || !state.restitution.active) {
        state.restitution = allocateRestitution(state, r.restitution.count, r.restitution.origin, r.restitution.trajectoryType);
      }
      if (state.restitution.active) {
        animateRestitution(state.restitution, r.restitution.progress, r.restitution.trajectoryType, time);
      }
    } else if (state.restitution?.active) {
      cleanupRestitution(state);
    }

    // ─── Shockwave post-processing uniforms ─────────────────────────
    if (r.shockwave && r.shockwave.intensity > 0.001) {
      if (!state.shockwave && state.renderer) {
        state.shockwave = createShockwavePass(state.renderer);
      }
      if (state.shockwave) {
        const sw = state.shockwave;
        sw.material.uniforms.uRadius.value = r.shockwave.radius;
        sw.material.uniforms.uIntensity.value = r.shockwave.intensity;
        sw.material.uniforms.uWidth.value = 0.15;
        sw.material.uniforms.uCenter.value.set(0.5, 0.5);
      }
    } else if (state.shockwave) {
      cleanupShockwave(state);
    }
  };

  // Render override for shockwave post-processing
  const renderOverride = useCallback((renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    const state = objectsRef.current;
    if (state?.shockwave) {
      const sw = state.shockwave;
      // Render scene to texture
      renderer.setRenderTarget(sw.renderTarget);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      // Render fullscreen quad with shockwave distortion
      renderer.render(sw.quadScene, sw.quadCamera);
    } else {
      renderer.render(scene, camera);
    }
  }, []);

  return <Scene children={setup} onFrame={onFrame} renderOverride={renderOverride} />;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function resetRitualState(state: any, _time: number) {
  // Smoothly return clouds to base state
  const obj = state;
  for (const cd of obj.clouds as CloudData[]) {
    const mat = cd.cloud.material as THREE.PointsMaterial;
    mat.size += (cd.cloud.userData.baseSize - mat.size) * 0.05;
    mat.opacity += (cd.cloud.userData.baseOpacity - mat.opacity) * 0.05;
    mat.color.lerp(cd.originalColor, 0.03);
  }
  // Clean up flash
  if (obj.flashMesh) {
    obj.scene.remove(obj.flashMesh);
    (obj.flashMesh.material as THREE.MeshBasicMaterial).dispose();
    obj.flashMesh.geometry.dispose();
    obj.flashMesh = null;
  }
  // Clean up extraction
  if (obj.extraction?.active) cleanupExtraction(obj);
  // Clean up restitution
  if (obj.restitution?.active) cleanupRestitution(obj);
  // Clean up shockwave
  if (obj.shockwave) cleanupShockwave(obj);
  // Reset wave state
  obj.waves.emitTimes = [];
}

// ─── Particle extraction ────────────────────────────────────────────────────

function allocateExtraction(
  state: any,
  count: number,
  target: [number, number, number],
  trajectoryType: string,
): ExtractionState {
  const clouds = state.clouds as CloudData[];
  const scene = state.scene as THREE.Scene;

  // Total points across all clouds
  const totalCloudPoints = clouds.reduce((sum, cd) => sum + cd.basePositions.length / 3, 0);

  const startPositions = new Float32Array(count * 3);
  const targetPositions = new Float32Array(count * 3);
  const spiralPhases = new Float32Array(count);
  const spiralRadii = new Float32Array(count);
  const chaoticDelays = new Float32Array(count);

  let idx = 0;
  for (const cd of clouds) {
    // Proportional allocation
    const cloudCount = cd.basePositions.length / 3;
    const allocation = Math.round(count * (cloudCount / totalCloudPoints));
    const posAttr = cd.cloud.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < allocation && idx < count; i++) {
      const pointIdx = Math.floor(Math.random() * cloudCount);

      // World position = cloud position + local position (with rotation applied)
      const local = new THREE.Vector3(
        posAttr.getX(pointIdx),
        posAttr.getY(pointIdx),
        posAttr.getZ(pointIdx),
      );
      local.applyQuaternion(cd.cloud.quaternion);
      local.add(cd.worldPos);

      startPositions[idx * 3] = local.x;
      startPositions[idx * 3 + 1] = local.y;
      startPositions[idx * 3 + 2] = local.z;

      targetPositions[idx * 3] = target[0];
      targetPositions[idx * 3 + 1] = target[1];
      targetPositions[idx * 3 + 2] = target[2];

      spiralPhases[idx] = Math.random() * Math.PI * 2;
      spiralRadii[idx] = 0.5 + Math.random() * 1.5;
      chaoticDelays[idx] = trajectoryType === 'chaotic' ? Math.random() * 0.3 : 0;

      idx++;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(startPositions), 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.04,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  points.renderOrder = 10;
  scene.add(points);

  return {
    points,
    startPositions,
    targetPositions,
    spiralPhases,
    spiralRadii,
    chaoticDelays,
    count: idx,
    active: true,
  };
}

function animateExtraction(
  ext: ExtractionState,
  progress: number,
  trajectoryType: string,
  time: number,
) {
  const positions = ext.points.geometry.attributes.position;

  for (let i = 0; i < ext.count; i++) {
    const i3 = i * 3;
    // Per-particle progress with optional chaotic delay
    let p = Math.max(0, Math.min(1, (progress - ext.chaoticDelays[i]) / (1 - ext.chaoticDelays[i])));
    // Ease-in-out cubic
    p = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

    const sx = ext.startPositions[i3];
    const sy = ext.startPositions[i3 + 1];
    const sz = ext.startPositions[i3 + 2];
    const tx = ext.targetPositions[i3];
    const ty = ext.targetPositions[i3 + 1];
    const tz = ext.targetPositions[i3 + 2];

    let x = sx + (tx - sx) * p;
    let y = sy + (ty - sy) * p;
    let z = sz + (tz - sz) * p;

    // Spiral/chaotic offset (decreases as particles approach target)
    if (trajectoryType === 'spiral' || trajectoryType === 'chaotic') {
      const offset = (1 - p) * ext.spiralRadii[i];
      const angle = ext.spiralPhases[i] + time * 3 + p * Math.PI * 4;
      x += Math.cos(angle) * offset;
      y += Math.sin(angle) * offset;
      if (trajectoryType === 'chaotic') {
        z += Math.sin(angle * 1.7 + ext.spiralPhases[i]) * offset * 0.5;
      }
    }

    (positions.array as Float32Array)[i3] = x;
    (positions.array as Float32Array)[i3 + 1] = y;
    (positions.array as Float32Array)[i3 + 2] = z;
  }
  positions.needsUpdate = true;

  // Particles stay bright and visible throughout the entire sequence
  const mat = ext.points.material as THREE.PointsMaterial;
  mat.size = 0.08;
  mat.opacity = 0.9;
}

function cleanupExtraction(state: any) {
  if (!state.extraction) return;
  const ext = state.extraction as ExtractionState;
  state.scene.remove(ext.points);
  ext.points.geometry.dispose();
  (ext.points.material as THREE.PointsMaterial).dispose();
  state.extraction = null;
}

// ─── Particle restitution ───────────────────────────────────────────────────

function allocateRestitution(
  state: any,
  count: number,
  origin: [number, number, number],
  trajectoryType: string,
): RestitutionState {
  const clouds = state.clouds as CloudData[];
  const scene = state.scene as THREE.Scene;

  const startPositions = new Float32Array(count * 3);
  const targetPositions = new Float32Array(count * 3);
  const targetCloudIndices = new Int32Array(count);
  const spiralPhases = new Float32Array(count);
  const spiralRadii = new Float32Array(count);
  const chaoticDelays = new Float32Array(count);

  const originVec = new THREE.Vector3(origin[0], origin[1], origin[2]);

  for (let i = 0; i < count; i++) {
    // Start at origin with small random spread
    startPositions[i * 3] = origin[0] + (Math.random() - 0.5) * 0.5;
    startPositions[i * 3 + 1] = origin[1] + (Math.random() - 0.5) * 0.5;
    startPositions[i * 3 + 2] = origin[2] + (Math.random() - 0.5) * 0.5;

    // Find nearest cloud
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let c = 0; c < clouds.length; c++) {
      const d = clouds[c].worldPos.distanceTo(originVec);
      // Add randomness so particles don't all go to the same cloud
      const jittered = d + (Math.random() - 0.5) * 4;
      if (jittered < nearestDist) {
        nearestDist = jittered;
        nearestIdx = c;
      }
    }
    targetCloudIndices[i] = nearestIdx;

    // Target is a random point on the surface of the chosen cloud
    const cd = clouds[nearestIdx];
    const cloudCount = cd.basePositions.length / 3;
    const pointIdx = Math.floor(Math.random() * cloudCount);
    const posAttr = cd.cloud.geometry.attributes.position as THREE.BufferAttribute;

    const local = new THREE.Vector3(
      posAttr.getX(pointIdx),
      posAttr.getY(pointIdx),
      posAttr.getZ(pointIdx),
    );
    local.applyQuaternion(cd.cloud.quaternion);
    local.add(cd.worldPos);

    targetPositions[i * 3] = local.x;
    targetPositions[i * 3 + 1] = local.y;
    targetPositions[i * 3 + 2] = local.z;

    spiralPhases[i] = Math.random() * Math.PI * 2;
    spiralRadii[i] = 0.5 + Math.random() * 2.0;
    chaoticDelays[i] = trajectoryType === 'chaotic' ? Math.random() * 0.25 : 0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(startPositions), 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.06,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  points.renderOrder = 10;
  scene.add(points);

  return {
    points,
    startPositions,
    targetPositions,
    targetCloudIndices,
    spiralPhases,
    spiralRadii,
    chaoticDelays,
    count,
    active: true,
  };
}

function animateRestitution(
  rest: RestitutionState,
  progress: number,
  trajectoryType: string,
  time: number,
) {
  const positions = rest.points.geometry.attributes.position;

  for (let i = 0; i < rest.count; i++) {
    const i3 = i * 3;
    let p = Math.max(0, Math.min(1, (progress - rest.chaoticDelays[i]) / (1 - rest.chaoticDelays[i])));
    p = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

    const sx = rest.startPositions[i3];
    const sy = rest.startPositions[i3 + 1];
    const sz = rest.startPositions[i3 + 2];
    const tx = rest.targetPositions[i3];
    const ty = rest.targetPositions[i3 + 1];
    const tz = rest.targetPositions[i3 + 2];

    let x = sx + (tx - sx) * p;
    let y = sy + (ty - sy) * p;
    let z = sz + (tz - sz) * p;

    if (trajectoryType === 'spiral' || trajectoryType === 'chaotic') {
      const offset = (1 - p) * rest.spiralRadii[i];
      const angle = rest.spiralPhases[i] + time * 2.5 + p * Math.PI * 3;
      x += Math.cos(angle) * offset;
      y += Math.sin(angle) * offset;
      if (trajectoryType === 'chaotic') {
        z += Math.sin(angle * 1.3 + rest.spiralPhases[i]) * offset * 0.6;
      }
    }

    (positions.array as Float32Array)[i3] = x;
    (positions.array as Float32Array)[i3 + 1] = y;
    (positions.array as Float32Array)[i3 + 2] = z;
  }
  positions.needsUpdate = true;

  // Particles dim as they return to clouds
  const mat = rest.points.material as THREE.PointsMaterial;
  mat.size = 0.06 * (1 - progress * 0.5);
  mat.opacity = 0.9 * (1 - progress * 0.6);
}

function cleanupRestitution(state: any) {
  if (!state.restitution) return;
  const rest = state.restitution as RestitutionState;
  state.scene.remove(rest.points);
  rest.points.geometry.dispose();
  (rest.points.material as THREE.PointsMaterial).dispose();
  state.restitution = null;
}

// ─── Shockwave post-processing ──────────────────────────────────────────────

function createShockwavePass(renderer: THREE.WebGLRenderer) {
  const size = renderer.getSize(new THREE.Vector2());
  const renderTarget = new THREE.WebGLRenderTarget(
    size.x * renderer.getPixelRatio(),
    size.y * renderer.getPixelRatio(),
  );

  const material = new THREE.ShaderMaterial({
    vertexShader: shockwaveVertSrc,
    fragmentShader: shockwaveFragSrc,
    uniforms: {
      tDiffuse: { value: renderTarget.texture },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uRadius: { value: 0 },
      uIntensity: { value: 0 },
      uWidth: { value: 0.15 },
    },
    depthWrite: false,
    depthTest: false,
  });

  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const quadMesh = new THREE.Mesh(quadGeo, material);
  const quadScene = new THREE.Scene();
  quadScene.add(quadMesh);
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return { renderTarget, quadScene, quadCamera, material };
}

function cleanupShockwave(state: any) {
  if (!state.shockwave) return;
  const sw = state.shockwave;
  sw.renderTarget.dispose();
  sw.material.dispose();
  state.shockwave = null;
}
