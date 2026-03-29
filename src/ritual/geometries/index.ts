// Demon geometry factories — each returns a THREE.BufferGeometry

import * as THREE from 'three';

export type GeometryType =
  | 'icosahedron'
  | 'point_cloud'
  | 'moebius'
  | 'torus'
  | 'fragmented_cube'
  | 'tetrahedron';

export function createGeometry(type: GeometryType, scale: number = 1): THREE.BufferGeometry {
  switch (type) {
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(scale, 1);
    case 'point_cloud':
      return createPointCloudGeometry(scale);
    case 'moebius':
      return createMoebiusGeometry(scale);
    case 'torus':
      return new THREE.TorusGeometry(scale, scale * 0.35, 24, 64);
    case 'fragmented_cube':
      return createFragmentedCubeGeometry(scale);
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(scale, 0);
    default:
      return new THREE.IcosahedronGeometry(scale, 1);
  }
}

function createPointCloudGeometry(scale: number): THREE.BufferGeometry {
  const count = 5000;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = scale * (0.5 + Math.random() * 0.5);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

function createMoebiusGeometry(scale: number): THREE.BufferGeometry {
  const segments = 128;
  const width = scale * 0.3;
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    for (let j = 0; j <= 1; j++) {
      const s = (j - 0.5) * width;
      const halfT = t / 2;
      const x = (scale + s * Math.cos(halfT)) * Math.cos(t);
      const y = (scale + s * Math.cos(halfT)) * Math.sin(t);
      const z = s * Math.sin(halfT);
      positions.push(x, y, z);
    }
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createFragmentedCubeGeometry(scale: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(scale, scale, scale, 3, 3, 3);
  // Offset vertices slightly for fragmented look
  const positions = geo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const offset = (Math.random() - 0.5) * scale * 0.1;
    positions.setX(i, positions.getX(i) + offset);
    positions.setY(i, positions.getY(i) + offset);
    positions.setZ(i, positions.getZ(i) + offset);
  }
  geo.computeVertexNormals();
  return geo;
}
