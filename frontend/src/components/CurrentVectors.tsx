import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { VectorSample } from '../types/ocean';

interface CurrentVectorsProps {
  vectors: VectorSample[];
  depth: number;
  visible: boolean;
}

export const CurrentVectors: React.FC<CurrentVectorsProps> = ({
  vectors,
  depth,
  visible
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const targetYRef = useRef<number>(-(depth / 4000.0) * 3.0 + 0.04);

  // Keep targetY updated on depth change
  useEffect(() => {
    targetYRef.current = -(depth / 4000.0) * 3.0 + 0.04;
  }, [depth]);

  // Smooth vertical position tracking with depth transitions
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.damp(
        meshRef.current.position.y,
        targetYRef.current,
        10,
        delta
      );
    }
  });

  // Construct a streamlined 3D arrow geometry (shaft + head) lying horizontally along +X
  const arrowGeometry = useMemo(() => {
    // Shaft: Cylinder aligned along X axis from x = 0 to x = 0.45
    const shaftGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.44, 6);
    shaftGeom.rotateZ(-Math.PI / 2);
    shaftGeom.translate(0.22, 0, 0);

    // Arrowhead: Cone pointing along +X from x = 0.44 to x = 0.66
    const headGeom = new THREE.ConeGeometry(0.065, 0.22, 8);
    headGeom.rotateZ(-Math.PI / 2);
    headGeom.translate(0.44 + 0.11, 0, 0);

    // Combine into a single BufferGeometry
    const pos1 = shaftGeom.attributes.position.array;
    const norm1 = shaftGeom.attributes.normal.array;
    const idx1 = shaftGeom.index ? shaftGeom.index.array : null;

    const pos2 = headGeom.attributes.position.array;
    const norm2 = headGeom.attributes.normal.array;
    const idx2 = headGeom.index ? headGeom.index.array : null;

    const totalPositions = new Float32Array(pos1.length + pos2.length);
    totalPositions.set(pos1);
    totalPositions.set(pos2, pos1.length);

    const totalNormals = new Float32Array(norm1.length + norm2.length);
    totalNormals.set(norm1);
    totalNormals.set(norm2, norm1.length);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(totalPositions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(totalNormals, 3));

    if (idx1 && idx2) {
      const vOffset = pos1.length / 3;
      const totalIndices = new Uint16Array(idx1.length + idx2.length);
      totalIndices.set(idx1);
      for (let k = 0; k < idx2.length; k++) {
        totalIndices[idx1.length + k] = idx2[k] + vOffset;
      }
      geom.setIndex(new THREE.BufferAttribute(totalIndices, 1));
    }

    geom.computeVertexNormals();
    return geom;
  }, []);

  useEffect(() => {
    if (!meshRef.current || !vectors.length) return;

    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    vectors.forEach((v, i) => {
      // Coordinate mapping to Three.js World: Lon [30, 115] -> X [-10, 10], Lat [-25, 30] -> Z [6.5, -6.5]
      const x = ((v.lon - 30.0) / 85.0 - 0.5) * 20.0;
      const z = -((v.lat - (-25.0)) / 55.0 - 0.5) * 13.0;

      dummy.position.set(x, 0, z);

      // Authentic oceanographic rotation: theta = atan2(v, u) in horizontal X-Z plane
      // u > 0 (East) -> theta = 0 -> +X
      // v > 0 (North) -> theta = +PI/2 -> -Z
      const angle = Math.atan2(v.v, v.u);
      dummy.rotation.set(0, angle, 0);

      // Scale arrow length and width according to current magnitude (m/s)
      const scale = Math.max(0.32, Math.min(1.15, 0.38 + v.magnitude * 0.42));
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);

      // Color mapping according to oceanographic velocity classes
      if (v.magnitude >= 1.2) {
        color.set('#ff5376'); // High speed jet (Somali current core)
      } else if (v.magnitude >= 0.7) {
        color.set('#ffb800'); // Strong flow
      } else if (v.magnitude >= 0.35) {
        color.set('#00f0ff'); // Moderate current
      } else {
        color.set('#00e5a3'); // Calm drift
      }
      mesh.setColorAt(i, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [vectors]);

  if (!visible || !vectors.length) return null;

  return (
    <instancedMesh
      ref={meshRef}
      geometry={arrowGeometry}
      args={[undefined, undefined, vectors.length]}
    >
      <meshStandardMaterial
        roughness={0.3}
        metalness={0.2}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
};
