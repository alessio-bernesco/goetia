// Demon geometry factories — each returns a THREE.BufferGeometry

import * as THREE from 'three';

export type GeometryType =
  | 'tetrahedron'
  | 'cube'
  | 'octahedron'
  | 'icosahedron'
  | 'point_cloud'
  | 'torus'
  | 'moebius'
  | 'dodecahedron'
  | 'torus_knot'
  | 'fragmented_cube';

export interface GeometryParams {
  radius_ratio?: number;
  twists?: number;
  p?: number;
  q?: number;
  count?: number;
}

export function createGeometry(
  type: GeometryType,
  scale: number = 1,
  params?: GeometryParams,
): THREE.BufferGeometry {
  switch (type) {
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(scale, 0);
    case 'cube':
      return new THREE.BoxGeometry(scale, scale, scale);
    case 'octahedron':
      return new THREE.OctahedronGeometry(scale, 0);
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(scale, 1);
    case 'point_cloud':
      return createPointCloudGeometry(scale, params?.count ?? 5000);
    case 'torus':
      return new THREE.TorusGeometry(scale, scale * (params?.radius_ratio ?? 0.35), 24, 64);
    case 'moebius':
      return createMoebiusGeometry(scale, params?.twists ?? 1);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(scale, 0);
    case 'torus_knot':
      return new THREE.TorusKnotGeometry(scale, scale * 0.3, 128, 16, params?.p ?? 2, params?.q ?? 3);
    case 'fragmented_cube':
      return createFragmentedCubeGeometry(scale);
    default:
      return new THREE.IcosahedronGeometry(scale, 1);
  }
}

function createPointCloudGeometry(scale: number, count: number): THREE.BufferGeometry {
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

function createMoebiusGeometry(scale: number, twists: number = 1): THREE.BufferGeometry {
  const segments = 128;
  const width = scale * 0.3;
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    for (let j = 0; j <= 1; j++) {
      const s = (j - 0.5) * width;
      const halfT = (t * twists) / 2;
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
