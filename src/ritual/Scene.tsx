// Scene — Three.js setup, camera, renderer, animation loop
// Persistent 3D scene across all navigation places

import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface SceneProps {
  children?: (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void;
  onFrame?: (time: number, delta: number) => void;
  transparent?: boolean;
}

export function Scene({ children, onFrame, transparent = false }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const onFrameRef = useRef(onFrame);

  // Keep ref in sync so the animation loop always calls the latest callback
  useEffect(() => { onFrameRef.current = onFrame; }, [onFrame]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    if (!transparent) {
      scene.background = new THREE.Color(0x000000);
      scene.fog = new THREE.FogExp2(0x000000, 0.008);
    }

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: transparent,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    if (transparent) {
      renderer.setClearColor(0x000000, 0);
    }
    container.appendChild(renderer.domElement);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Setup callback
    children?.(scene, camera);

    // Animation loop
    const animate = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      onFrameRef.current?.(time / 1000, delta);
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
