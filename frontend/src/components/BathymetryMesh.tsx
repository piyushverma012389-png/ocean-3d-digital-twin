import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BathymetryGrid } from '../types/ocean';

interface BathymetryMeshProps {
  grid: BathymetryGrid;
  visible: boolean;
  wireframe?: boolean;
}

export const BathymetryMesh: React.FC<BathymetryMeshProps> = ({
  grid,
  visible,
  wireframe = false
}) => {
  const { geometry, material } = useMemo(() => {
    const nx = grid.nx;
    const ny = grid.ny;

    // Plane dimensions in 3D scene
    const width = 20.0;
    const height = 13.0;

    const geom = new THREE.PlaneGeometry(width, height, nx - 1, ny - 1);
    // Rotate plane so X is Lon, Z is Lat, Y is Vertical Depth
    geom.rotateX(-Math.PI / 2);

    const positions = geom.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    // Continuous multi-stop color ramp for realistic seabed and land relief (Task 3)
    const colorStops: Array<{ elev: number; color: THREE.Color }> = [
      { elev: -6800, color: new THREE.Color('#020418') }, // Java / Sunda Trench deepest abyss
      { elev: -5400, color: new THREE.Color('#051532') }, // Trench flanks
      { elev: -4000, color: new THREE.Color('#09224d') }, // Central Indian Abyssal Plain
      { elev: -2600, color: new THREE.Color('#0b476e') }, // Ninety East / Central Indian Ridge flank
      { elev: -1600, color: new THREE.Color('#0d7285') }, // Ridge crests
      { elev: -600,  color: new THREE.Color('#00a88f') }, // Continental rise & slope
      { elev: -120,  color: new THREE.Color('#00e5a3') }, // Continental shelf (India, Sunda, Arabia)
      { elev: 0,     color: new THREE.Color('#283b32') }, // Shoreline boundary
      { elev: 400,   color: new THREE.Color('#38404a') }, // Lowland terrain
      { elev: 1500,  color: new THREE.Color('#586270') }, // High relief topography
    ];

    const sampleElevationColor = (elev: number, target: THREE.Color) => {
      if (elev <= colorStops[0].elev) {
        target.copy(colorStops[0].color);
        return;
      }
      if (elev >= colorStops[colorStops.length - 1].elev) {
        target.copy(colorStops[colorStops.length - 1].color);
        return;
      }
      for (let k = 0; k < colorStops.length - 1; k++) {
        const s1 = colorStops[k];
        const s2 = colorStops[k + 1];
        if (elev >= s1.elev && elev <= s2.elev) {
          const t = (elev - s1.elev) / (s2.elev - s1.elev || 1.0);
          target.lerpColors(s1.color, s2.color, t);
          return;
        }
      }
      target.copy(colorStops[0].color);
    };

    let vertexIdx = 0;
    const tempColor = new THREE.Color();

    // PlaneGeometry layout with rotation
    for (let j = 0; j < ny; j++) {
      // Invert row index to align with Three.js grid orientation
      const rowIdx = ny - 1 - j;
      const row = grid.elevations[rowIdx] || grid.elevations[0];

      for (let i = 0; i < nx; i++) {
        const elev = row[i] !== undefined ? row[i] : -4000;

        // Vertical Y displacement
        let yPos = 0;
        if (elev >= 0) {
          // Land topography (elevations 0m to +1500m)
          yPos = 0.02 + (elev / 1500.0) * 0.45;
        } else {
          // Ocean depth (-6800m to -80m)
          yPos = (elev / 4000.0) * 3.0;
        }

        sampleElevationColor(elev, tempColor);

        positions.setY(vertexIdx, yPos);

        colors[vertexIdx * 3] = tempColor.r;
        colors[vertexIdx * 3 + 1] = tempColor.g;
        colors[vertexIdx * 3 + 2] = tempColor.b;

        vertexIdx++;
      }
    }

    positions.needsUpdate = true;
    geom.computeVertexNormals();
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.72,
      metalness: 0.12,
      wireframe,
      side: THREE.DoubleSide
    });

    return { geometry: geom, material: mat };
  }, [grid, wireframe]);

  if (!visible) return null;

  return <mesh geometry={geometry} material={material} receiveShadow />;
};
