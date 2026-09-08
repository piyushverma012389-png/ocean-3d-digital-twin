import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ArgoFloat, GliderMission, OceanVariable } from '../types/ocean';
import { Html } from '@react-three/drei';

interface ObservationLayerProps {
  floats: ArgoFloat[];
  gliders: GliderMission[];
  visibleFloats: boolean;
  visibleGliders: boolean;
  selectedFloatId: string | null;
  onSelectFloat: (floatId: string) => void;
  selectedCycle?: number;
  activeVariable?: OceanVariable;
  currentTimeStep?: number;
}

/**
 * Subtle breathing beacon halo for authentic Argo Float 2902088
 */
const ArgoBeaconHalo: React.FC<{
  position: THREE.Vector3;
  isSelected: boolean;
}> = ({ position, isSelected }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      const s = 1.0 + Math.sin(t * 2.2) * 0.08;
      groupRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <group ref={groupRef} position={[position.x, position.y + 0.02, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.44, 32]} />
        <meshBasicMaterial
          color={isSelected ? '#00f0ff' : '#00ffb2'}
          transparent
          opacity={isSelected ? 0.9 : 0.65}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.48, 0.58, 32]} />
        <meshBasicMaterial
          color={isSelected ? '#00f0ff' : '#00ffb2'}
          transparent
          opacity={isSelected ? 0.45 : 0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

export const ObservationLayer: React.FC<ObservationLayerProps> = ({
  floats,
  gliders,
  visibleFloats,
  visibleGliders,
  selectedFloatId,
  onSelectFloat,
  selectedCycle = 217,
  activeVariable = 'temperature',
  currentTimeStep = 2
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Coordinate mapping helper
  const toWorld = (lon: number, lat: number, depth: number = 0) => {
    const x = ((lon - 30.0) / 85.0 - 0.5) * 20.0;
    const z = -((lat - (-25.0)) / 55.0 - 0.5) * 13.0;
    const y = -(depth / 4000.0) * 3.0;
    return new THREE.Vector3(x, y, z);
  };

  return (
    <group>
      {/* Argo Profiling Floats */}
      {visibleFloats &&
        floats.map((f) => {
          const is2902088 = f.wmo === '2902088' || f.id.includes('2902088');
          // For Float 2902088, use exact verified coords: -4.1515°N, 85.9971°E
          const fLon = is2902088 ? 85.997 : f.lon;
          const fLat = is2902088 ? -4.152 : f.lat;
          const surfPos = toWorld(fLon, fLat, 0);
          const deepPos = toWorld(fLon, fLat, f.max_depth || 2000);
          const isSelected = selectedFloatId === f.id;
          const isHovered = hoveredId === f.id;

          const buoyColor = is2902088
            ? (isSelected ? '#00f0ff' : '#00ffb2')
            : isSelected
            ? '#00f0ff'
            : f.status === 'profiling'
            ? '#00e5a3'
            : f.status === 'surface'
            ? '#ffb800'
            : '#a855f7';

          // Vertical tether geometry
          const lineGeom = new THREE.BufferGeometry().setFromPoints([surfPos, deepPos]);

          const isSynopticMatch = is2902088 && selectedCycle === 217 && currentTimeStep === 2;
          const targetVarLabel = activeVariable === 'salinity' ? 'Salinity (PSU)' : 'Temperature (°C)';

          return (
            <group key={f.id}>
              {/* Subtle Animated Beacon Halo for Authentic Argo Float 2902088 */}
              {is2902088 && (
                <ArgoBeaconHalo position={surfPos} isSelected={isSelected} />
              )}

              {/* Vertical Profiling Cable Line */}
              <primitive object={new THREE.Line(
                lineGeom,
                new THREE.LineBasicMaterial({
                  color: is2902088 ? '#00ffb2' : isSelected ? '#00f0ff' : '#00e5a3',
                  transparent: true,
                  opacity: isSelected || is2902088 ? 0.85 : 0.4,
                  linewidth: is2902088 ? 2.5 : 1.5
                })
              )} />

              {/* Depth Sensor Rings along Cable (500m, 1000m, 2000m) */}
              {[500, 1000, 2000].map((d) => {
                const ringPos = toWorld(fLon, fLat, d);
                return (
                  <mesh key={`ring-${d}`} position={ringPos}>
                    <ringGeometry args={[0.08, 0.12, 12]} />
                    <meshBasicMaterial
                      color={is2902088 ? '#00ffb2' : '#00f0ff'}
                      side={THREE.DoubleSide}
                      transparent
                      opacity={0.5}
                    />
                  </mesh>
                );
              })}

              {/* Surface Buoy Marker (Clickable) */}
              <mesh
                position={surfPos}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFloat(f.id);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredId(f.id);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  setHoveredId(null);
                  document.body.style.cursor = 'default';
                }}
              >
                <sphereGeometry args={[is2902088 ? 0.32 : isSelected || isHovered ? 0.28 : 0.2, 16, 16]} />
                <meshStandardMaterial
                  color={buoyColor}
                  emissive={buoyColor}
                  emissiveIntensity={is2902088 ? 0.9 : isSelected ? 0.8 : 0.3}
                  roughness={0.2}
                />

                {/* Phase 3D Requirement 6: Detailed Argo Observation Tooltip on Hover */}
                {isHovered && (
                  <Html position={[0, 0.45, 0]} center distanceFactor={14}>
                    <div
                      style={{
                        background: 'rgba(7, 11, 20, 0.95)',
                        border: is2902088 ? '1.5px solid var(--accent-emerald)' : '1px solid var(--accent-cyan)',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        color: '#fff',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        boxShadow: is2902088 ? '0 4px 22px rgba(0, 255, 178, 0.45)' : '0 4px 16px rgba(0, 240, 255, 0.35)',
                        pointerEvents: 'auto',
                        minWidth: '220px'
                      }}
                    >
                      {is2902088 ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '6px' }}>
                            <span style={{ color: 'var(--accent-emerald)', fontWeight: 800, letterSpacing: '0.5px' }}>
                              ARGO: IN-SITU OBSERVATION
                            </span>
                            <span style={{
                              fontSize: '8.5px',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: isSynopticMatch ? 'rgba(0, 229, 163, 0.2)' : 'rgba(255, 184, 0, 0.2)',
                              color: isSynopticMatch ? 'var(--accent-emerald)' : '#ffb800',
                              border: isSynopticMatch ? '1px solid var(--accent-emerald)' : '1px solid #ffb800'
                            }}>
                              {isSynopticMatch ? 'NEAR-SYNOPTIC' : 'MISMATCHED'}
                            </span>
                          </div>

                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '11px' }}>
                            WMO 2902088 • Cycle {selectedCycle}
                          </div>

                          <div style={{ color: 'var(--text-secondary)', marginTop: '3px' }}>
                            Observed: <strong style={{ color: '#fff' }}>{selectedCycle === 228 ? '10 Mar 2019 • 03:49 UTC' : '20 Nov 2018 • 03:29 UTC'}</strong>
                          </div>

                          <div style={{ color: 'var(--text-secondary)' }}>
                            Location: <strong>4.15°S, 86.00°E</strong>
                          </div>

                          <div style={{ color: 'var(--text-secondary)' }}>
                            Valid QC Levels: <strong style={{ color: 'var(--accent-emerald)' }}>138 levels (QC 1, 2)</strong>
                          </div>

                          <div style={{ color: 'var(--text-secondary)' }}>
                            Depth Coverage: <strong>5.6 m – 1966.6 m</strong>
                          </div>

                          <div style={{ color: 'var(--text-secondary)' }}>
                            Comparison Variable: <strong style={{ color: 'var(--accent-cyan)' }}>{targetVarLabel}</strong>
                          </div>

                          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                            Observed CTD vs HYCOM Numerical Model
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFloat(f.id);
                            }}
                            style={{
                              marginTop: '8px',
                              background: 'rgba(0, 240, 255, 0.25)',
                              border: '1px solid var(--accent-cyan)',
                              borderRadius: '4px',
                              color: '#fff',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              fontWeight: 700,
                              letterSpacing: '0.4px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              display: 'block',
                              width: '100%',
                              textAlign: 'center'
                            }}
                          >
                            COMPARE WITH HYCOM &rarr;
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: 700, color: '#8c9ebc', fontSize: '9.5px' }}>
                            SIMULATED FLEET FLOAT &bull; WMO {f.wmo}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {f.lat.toFixed(2)}°N, {f.lon.toFixed(2)}°E &bull; Cycle #{f.cycle}
                          </div>
                          <div style={{ color: 'var(--accent-cyan)', fontSize: '9px', marginTop: '2px' }}>
                            Platform: {f.platform_type} (Fleet Simulation)
                          </div>
                        </>
                      )}
                    </div>
                  </Html>
                )}
              </mesh>
            </group>
          );
        })}

      {/* Autonomous Underwater Gliders */}
      {visibleGliders &&
        gliders.map((g) => {
          const points = g.waypoints.map((wp) => toWorld(wp.lon, wp.lat, wp.depth));
          const curve = new THREE.CatmullRomCurve3(points);
          const tubeGeom = new THREE.TubeGeometry(curve, points.length * 3, 0.05, 6, false);

          const currentPos = points[points.length - 1];

          return (
            <group key={g.id}>
              {/* 3D Sawtooth Trajectory Ribbon */}
              <mesh geometry={tubeGeom}>
                <meshStandardMaterial
                  color="#ff4766"
                  emissive="#ff4766"
                  emissiveIntensity={0.4}
                  roughness={0.3}
                  transparent
                  opacity={0.8}
                />
              </mesh>

              {/* Glider Vehicle Marker */}
              {currentPos && (
                <mesh position={currentPos}>
                  <coneGeometry args={[0.18, 0.45, 8]} />
                  <meshStandardMaterial
                    color="#ff4766"
                    emissive="#ff4766"
                    emissiveIntensity={0.8}
                  />
                  <Html position={[0, 0.35, 0]} center distanceFactor={16}>
                    <div
                      style={{
                        background: 'rgba(7, 11, 20, 0.9)',
                        border: '1px solid #ff4766',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: '#fff',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none'
                      }}
                    >
                      {g.name}
                    </div>
                  </Html>
                </mesh>
              )}
            </group>
          );
        })}
    </group>
  );
};
