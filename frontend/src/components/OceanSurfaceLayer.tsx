import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ModelSliceData, ColormapType } from '../types/ocean';

interface OceanSurfaceLayerProps {
  sliceData: ModelSliceData;
  depth: number;
  colormap: ColormapType;
  visible: boolean;
  opacity?: number;
}

export const OceanSurfaceLayer: React.FC<OceanSurfaceLayerProps> = ({
  sliceData,
  depth,
  colormap,
  visible,
  opacity = 0.88
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Effective depth: SSH is strictly locked to surface z = 0m
  const effectiveDepth = sliceData.variable === 'ssh' ? 0 : depth;
  const targetYRef = useRef<number>(-(effectiveDepth / 4000.0) * 3.0);

  useEffect(() => {
    targetYRef.current = -(effectiveDepth / 4000.0) * 3.0;
  }, [effectiveDepth]);

  // Smooth vertical translation when changing depth layers (Task 5)
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.y = THREE.MathUtils.damp(
        groupRef.current.position.y,
        targetYRef.current,
        10,
        delta
      );
    }
  });

  // Texture generation from 2D scalar field (Task 4: smooth gradients, no distortion)
  const texture = useMemo(() => {
    const nx = sliceData.lons.length;
    const ny = sliceData.lats.length;
    const canvas = document.createElement('canvas');
    canvas.width = nx;
    canvas.height = ny;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imgData = ctx.createImageData(nx, ny);
    const minVal = sliceData.min_val;
    const maxVal = sliceData.max_val;
    const range = maxVal - minVal || 1.0;

    for (let j = 0; j < ny; j++) {
      // Invert row for canvas Y orientation
      const rowIdx = ny - 1 - j;
      const row = sliceData.values[rowIdx] || [];

      for (let i = 0; i < nx; i++) {
        const val = row[i];
        const pixelIdx = (j * nx + i) * 4;

        if (val === null || val === undefined) {
          // Land mask: completely transparent
          imgData.data[pixelIdx] = 0;
          imgData.data[pixelIdx + 1] = 0;
          imgData.data[pixelIdx + 2] = 0;
          imgData.data[pixelIdx + 3] = 0;
        } else {
          // Normalized scientific value [0, 1]
          const t = Math.max(0, Math.min(1, (val - minVal) / range));
          const [r, g, b] = sampleColormap(colormap, t);

          imgData.data[pixelIdx] = r;
          imgData.data[pixelIdx + 1] = g;
          imgData.data[pixelIdx + 2] = b;
          imgData.data[pixelIdx + 3] = 238; // Alpha
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, [sliceData, colormap]);

  // Perimeter bounding line geometry for depth slice perception
  const perimeterPoints = useMemo(() => {
    const hw = 10.0;
    const hh = 6.5;
    return [
      new THREE.Vector3(-hw, 0, -hh),
      new THREE.Vector3(hw, 0, -hh),
      new THREE.Vector3(hw, 0, hh),
      new THREE.Vector3(-hw, 0, hh),
      new THREE.Vector3(-hw, 0, -hh)
    ];
  }, []);

  const perimeterLineGeom = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(perimeterPoints);
  }, [perimeterPoints]);

  if (!visible || !texture) return null;

  return (
    <group ref={groupRef} position={[0, targetYRef.current, 0]}>
      {/* 2D Ocean Model Scalar Field Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20.0, 13.0]} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={opacity}
          roughness={0.35}
          metalness={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Subtle depth slice perimeter edge cue (visible when at depth > 0) */}
      {effectiveDepth > 0 && (
        <primitive
          object={
            new THREE.Line(
              perimeterLineGeom,
              new THREE.LineBasicMaterial({
                color: '#00f0ff',
                transparent: true,
                opacity: 0.35,
                linewidth: 1
              })
            )
          }
        />
      )}
    </group>
  );
};

/**
 * Procedural colormap sampler for scientific visualization
 */
function sampleColormap(colormap: ColormapType, t: number): [number, number, number] {
  if (colormap === 'viridis') {
    // Viridis approx
    const r = Math.floor(255 * (0.28 + 0.72 * Math.sin(t * Math.PI * 0.8)));
    const g = Math.floor(255 * Math.sin(t * Math.PI * 0.9));
    const b = Math.floor(255 * (0.45 * Math.cos(t * Math.PI) + 0.5));
    return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
  }

  if (colormap === 'haline') {
    // Haline: dark blue to bright cyan-white
    const r = Math.floor(255 * (0.1 + 0.85 * t * t));
    const g = Math.floor(255 * (0.15 + 0.8 * t));
    const b = Math.floor(255 * (0.35 + 0.65 * Math.sqrt(t)));
    return [r, g, b];
  }

  if (colormap === 'coolwarm') {
    // Blue to white to red
    if (t < 0.5) {
      const f = t / 0.5;
      return [Math.floor(255 * (0.2 + 0.8 * f)), Math.floor(255 * (0.3 + 0.7 * f)), 255];
    } else {
      const f = (t - 0.5) / 0.5;
      return [255, Math.floor(255 * (1.0 - 0.7 * f)), Math.floor(255 * (1.0 - 0.8 * f))];
    }
  }

  if (colormap === 'thermal') {
    // Black - purple - red - orange - yellow
    if (t < 0.33) {
      const f = t / 0.33;
      return [Math.floor(180 * f), 0, Math.floor(100 * f)];
    } else if (t < 0.66) {
      const f = (t - 0.33) / 0.33;
      return [180 + Math.floor(75 * f), Math.floor(140 * f), 0];
    } else {
      const f = (t - 0.66) / 0.34;
      return [255, 140 + Math.floor(115 * f), Math.floor(160 * f)];
    }
  }

  // Turbo colormap polynomial approximation (Google Turbo)
  const x = t;
  const r = 34.61 + x * (1172.0 + x * (-3029.0 + x * (2856.0 + x * (-879.0))));
  const g = 23.31 + x * (557.3 + x * (1225.0 + x * (-3574.0 + x * (1073.0))));
  const b = 27.2 + x * (3211.0 + x * (-15327.0 + x * (27814.0 + x * (-22569.0 + x * 6838.0))));

  return [
    Math.max(0, Math.min(255, Math.floor(r))),
    Math.max(0, Math.min(255, Math.floor(g))),
    Math.max(0, Math.min(255, Math.floor(b)))
  ];
}
