// GenesisVoid — void nero, griglia sottile, nubi di punti distanti rotanti

import { useRef } from 'react';
import * as THREE from 'three';
import { Scene } from './Scene';

export function GenesisVoid() {
  const objectsRef = useRef<{
    pointClouds: THREE.Points[];
    grid: THREE.LineSegments;
  } | null>(null);

  const setup = (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
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
    const pointClouds: THREE.Points[] = [];
    const cloudConfigs = [
      { count: 3000, radius: 6, pos: [-4, 2, -8], axis: new THREE.Vector3(0.3, 1, 0.1), speed: 0.003, color: 0xbbbbbb, size: 0.03 },
      { count: 2000, radius: 4, pos: [5, -1, -6], axis: new THREE.Vector3(-0.5, 0.8, 0.3), speed: -0.002, color: 0x9999cc, size: 0.035 },
      { count: 4000, radius: 8, pos: [0, 0, -12], axis: new THREE.Vector3(0.1, 0.6, -0.8), speed: 0.001, color: 0xaaaaaa, size: 0.025 },
      { count: 1000, radius: 3, pos: [-6, -2, -4], axis: new THREE.Vector3(0.7, 0.3, 0.5), speed: 0.004, color: 0xcc7777, size: 0.04 },
      { count: 1500, radius: 5, pos: [3, 3, -10], axis: new THREE.Vector3(-0.2, 1, -0.3), speed: -0.0015, color: 0x77cc77, size: 0.03 },
    ];

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
      cloud.userData = { axis: cfg.axis.normalize(), speed: cfg.speed };
      scene.add(cloud);
      pointClouds.push(cloud);
    }

    objectsRef.current = { pointClouds, grid };
  };

  const onFrame = (time: number) => {
    if (!objectsRef.current) return;
    const { pointClouds, grid } = objectsRef.current;

    for (const cloud of pointClouds) {
      const { axis, speed } = cloud.userData;
      cloud.rotateOnAxis(axis, speed);
    }

    // Subtle grid drift
    grid.position.z = Math.sin(time * 0.1) * 0.5;
  };

  return <Scene children={setup} onFrame={onFrame} />;
}
