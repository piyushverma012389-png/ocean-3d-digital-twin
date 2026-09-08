import React, { useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import {
  BathymetryGrid,
  ModelSliceData,
  ArgoFloat,
  GliderMission,
  LayerVisibilityState,
  ColormapType,
  CursorCoordinate
} from '../types/ocean';
import { BathymetryMesh } from './BathymetryMesh';
import { OceanSurfaceLayer } from './OceanSurfaceLayer';
import { CurrentVectors } from './CurrentVectors';
import { ObservationLayer } from './ObservationLayer';
import { CameraPreset } from './OceanControls';

interface OceanViewerProps {
  bathymetryGrid: BathymetryGrid | null;
  sliceData: ModelSliceData | null;
  argoFloats: ArgoFloat[];
  gliders: GliderMission[];
  layers: LayerVisibilityState;
  colormap: ColormapType;
  depth: number;
  selectedFloatId: string | null;
  onSelectFloat: (floatId: string) => void;
  onCursorMove: (coord: CursorCoordinate | null) => void;
  cameraPreset: CameraPreset;
  isAutoRotating: boolean;
  selectedCycle?: number;
}

/**
 * Internal Camera Controller handling presets and smooth transitions (Task 10)
 */
const CameraManager: React.FC<{
  preset: CameraPreset;
  autoRotate: boolean;
  onControlsReady?: (controls: OrbitControlsImpl) => void;
}> = ({ preset, autoRotate, onControlsReady }) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const targetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 16, 17));
  const targetLook = useRef<THREE.Vector3>(new THREE.Vector3(0, -0.5, 0));
  const isTransitioning = useRef<boolean>(false);

  useEffect(() => {
    if (controlsRef.current && onControlsReady) {
      onControlsReady(controlsRef.current);
    }
  }, [onControlsReady]);

  // Handle Preset Views (Task 10: intuitive, non-disorienting presets)
  useEffect(() => {
    switch (preset) {
      case 'full':
        // Indian Ocean Basin Overview
        targetPos.current.set(0, 16, 17);
        targetLook.current.set(0, -0.5, 0);
        break;
      case 'surface':
        // Nadir 2D Surface Plan View
        targetPos.current.set(0, 22, 0.01);
        targetLook.current.set(0, 0, 0);
        break;
      case 'oblique':
        // 3D Oblique View showing vertical depth stratification
        targetPos.current.set(-14, 11, 14);
        targetLook.current.set(0, -1.0, 0);
        break;
      case 'argo_focus':
        // Centered on authentic Argo Float 2902088 (Lon 86.00°E, Lat 4.15°S)
        targetPos.current.set(4.6, 5.2, 4.8);
        targetLook.current.set(3.18, -0.7, 1.56);
        break;
      case 'arabian_sea':
        // Focus on Arabian Sea & Somali Current
        targetPos.current.set(-4.5, 9, 4);
        targetLook.current.set(-3.0, -0.5, -2.5);
        break;
      case 'bay_of_bengal':
        // Focus on Bay of Bengal & Northern Basin
        targetPos.current.set(4.5, 9, 4);
        targetLook.current.set(3.5, -0.5, -2.5);
        break;
    }
    isTransitioning.current = true;
  }, [preset]);

  // Smooth camera glide without motion sickness
  useFrame((_, delta) => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;

    if (isTransitioning.current) {
      camera.position.lerp(targetPos.current, Math.min(1.0, delta * 4.5));
      ctrl.target.lerp(targetLook.current, Math.min(1.0, delta * 4.5));
      ctrl.update();

      if (
        camera.position.distanceTo(targetPos.current) < 0.04 &&
        ctrl.target.distanceTo(targetLook.current) < 0.04
      ) {
        camera.position.copy(targetPos.current);
        ctrl.target.copy(targetLook.current);
        ctrl.update();
        isTransitioning.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera going beneath horizon
      minDistance={2.5}
      maxDistance={45}
      autoRotate={autoRotate}
      autoRotateSpeed={0.8}
      onStart={() => {
        // User manual drag immediately cancels preset animation
        isTransitioning.current = false;
      }}
    />
  );
};

/**
 * Interactive Raycaster plane tracking geographic coordinates under mouse
 */
const InteractionRaycaster: React.FC<{
  depth: number;
  sliceData: ModelSliceData | null;
  onCursorMove: (coord: CursorCoordinate | null) => void;
}> = ({ depth, sliceData, onCursorMove }) => {
  const yPos = -(depth / 4000.0) * 3.0;

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    const point = e.point;

    // Convert Three.js World (x, z) to Geographic (lon, lat)
    const lon = ((point.x / 20.0) + 0.5) * 85.0 + 30.0;
    const lat = -((point.z / 13.0) - 0.5) * 55.0 + -25.0;

    let val: number | null | undefined = undefined;
    if (sliceData && sliceData.values.length > 0) {
      const nx = sliceData.lons.length;
      const ny = sliceData.lats.length;

      const i = Math.floor(((lon - 30.0) / 85.0) * nx);
      const j = Math.floor(((lat - (-25.0)) / 55.0) * ny);

      if (j >= 0 && j < ny && i >= 0 && i < nx) {
        val = sliceData.values[j]?.[i];
      }
    }

    onCursorMove({
      lon: Math.max(30.0, Math.min(115.0, lon)),
      lat: Math.max(-25.0, Math.min(30.0, lat)),
      depth,
      val
    });
  };

  const handlePointerOut = () => {
    onCursorMove(null);
  };

  return (
    <mesh
      position={[0, yPos, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      visible={false}
    >
      <planeGeometry args={[20.0, 13.0]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
};

/**
 * 3D Vertical Depth Scale Guide (Task 2: visual depth perception)
 */
const DepthRuler: React.FC<{ activeDepth: number }> = ({ activeDepth }) => {
  const rulerX = -10.35;
  const rulerZ = 0.0;
  const levels = [0, 500, 1000, 2000, 4000];

  const markerRef = useRef<THREE.Group>(null);
  const targetY = -(activeDepth / 4000.0) * 3.0;

  useFrame((_, delta) => {
    if (markerRef.current) {
      markerRef.current.position.y = THREE.MathUtils.damp(
        markerRef.current.position.y,
        targetY,
        10,
        delta
      );
    }
  });

  return (
    <group position={[rulerX, 0, rulerZ]}>
      {/* Vertical Depth Axis */}
      <primitive
        object={
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(0, 0.05, 0),
              new THREE.Vector3(0, -3.05, 0)
            ]),
            new THREE.LineBasicMaterial({
              color: 'rgba(0, 240, 255, 0.35)',
              transparent: true
            })
          )
        }
      />

      {/* Depth Level Calibration Ticks */}
      {levels.map((lvl) => {
        const y = -(lvl / 4000.0) * 3.0;
        const isCurrent = Math.abs(activeDepth - lvl) < 25;
        return (
          <group key={lvl} position={[0, y, 0]}>
            <primitive
              object={
                new THREE.Line(
                  new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(-0.25, 0, 0),
                    new THREE.Vector3(0.25, 0, 0)
                  ]),
                  new THREE.LineBasicMaterial({
                    color: isCurrent ? '#00f0ff' : 'rgba(255, 255, 255, 0.25)'
                  })
                )
              }
            />
            <Html position={[-0.45, 0, 0]} center distanceFactor={17}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: isCurrent ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.45)',
                  fontWeight: isCurrent ? 700 : 400,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  textShadow: '0 0 6px rgba(0,0,0,0.95)'
                }}
              >
                {lvl === 0 ? '0m' : `-${lvl}m`}
              </div>
            </Html>
          </group>
        );
      })}

      {/* Active Depth Marker (Task 5: visually communicates current depth) */}
      <group ref={markerRef} position={[0, targetY, 0]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.16, 0.16, 0.16]} />
          <meshBasicMaterial color="#00f0ff" />
        </mesh>
      </group>
    </group>
  );
};

/**
 * Subtle Geographic Orientation Labels & 3D Compass (Task 11)
 */
const GeographicLabels: React.FC = () => {
  const toWorld = (lon: number, lat: number, y: number = 0.08) => {
    const x = ((lon - 30.0) / 85.0 - 0.5) * 20.0;
    const z = -((lat - (-25.0)) / 55.0 - 0.5) * 13.0;
    return new THREE.Vector3(x, y, z);
  };

  const labels = [
    { name: 'INDIA', pos: toWorld(77.5, 20.5, 0.5), color: '#8c9ebc', weight: 700, letterSpacing: '2px' },
    { name: 'ARABIAN SEA', pos: toWorld(64.0, 14.5, 0.08), color: 'rgba(0, 240, 255, 0.65)', weight: 600, letterSpacing: '1.5px' },
    { name: 'BAY OF BENGAL', pos: toWorld(88.5, 14.5, 0.08), color: 'rgba(0, 240, 255, 0.65)', weight: 600, letterSpacing: '1.5px' },
    { name: 'EQUATORIAL INDIAN OCEAN', pos: toWorld(78.0, 0.0, 0.08), color: 'rgba(0, 240, 255, 0.55)', weight: 600, letterSpacing: '2px' },
    { name: 'JAVA TRENCH (-6808m)', pos: toWorld(104.0, -8.5, -0.4), color: 'rgba(0, 255, 178, 0.55)', weight: 500, letterSpacing: '1px' }
  ];

  return (
    <group>
      {labels.map((l) => (
        <Html key={l.name} position={[l.pos.x, l.pos.y, l.pos.z]} center distanceFactor={18}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: l.color,
              fontWeight: l.weight,
              letterSpacing: l.letterSpacing,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.8)',
              userSelect: 'none'
            }}
          >
            {l.name}
          </div>
        </Html>
      ))}

      {/* 3D North Orientation Pointer (Task 11) */}
      <group position={[-9.2, 0.08, -5.8]}>
        <mesh position={[0, 0, -0.35]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.15, 0.45, 4]} />
          <meshBasicMaterial color="#ff4766" />
        </mesh>
        <Html position={[0, 0.25, -0.7]} center distanceFactor={16}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 800,
              color: '#ff4766',
              pointerEvents: 'none',
              textShadow: '0 0 6px rgba(0,0,0,0.9)'
            }}
          >
            N
          </div>
        </Html>
      </group>
    </group>
  );
};

export const OceanViewer: React.FC<OceanViewerProps> = ({
  bathymetryGrid,
  sliceData,
  argoFloats,
  gliders,
  layers,
  colormap,
  depth,
  selectedFloatId,
  onSelectFloat,
  onCursorMove,
  cameraPreset,
  isAutoRotating,
  selectedCycle
}) => {
  return (
    <div className="canvas-wrapper">
      <Canvas
        camera={{ position: [0, 16, 17], fov: 46, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        {/* Background & Oceanic Atmosphere Fog */}
        <color attach="background" args={['#050811']} />
        <fog attach="fog" args={['#050811', 20, 60]} />

        {/* Scene Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[15, 25, 10]}
          intensity={1.2}
          color="#f0f6ff"
          castShadow
        />
        <directionalLight
          position={[-15, -10, -10]}
          intensity={0.3}
          color="#00f0ff"
        />

        {/* Camera Controller */}
        <CameraManager
          preset={cameraPreset}
          autoRotate={isAutoRotating}
        />

        {/* Raycaster Plane for Cursor Coordinate Tracking */}
        <InteractionRaycaster
          depth={sliceData?.variable === 'ssh' ? 0 : depth}
          sliceData={sliceData}
          onCursorMove={onCursorMove}
        />

        {/* 3D Indian Ocean Bathymetric Seabed Topography */}
        {bathymetryGrid && (
          <BathymetryMesh
            grid={bathymetryGrid}
            visible={layers.bathymetry}
            wireframe={layers.wireframe}
          />
        )}

        {/* 3D Ocean Model Variable Slice (Temperature, Salinity, etc.) */}
        {sliceData && (
          <OceanSurfaceLayer
            sliceData={sliceData}
            depth={sliceData.variable === 'ssh' ? 0 : depth}
            colormap={colormap}
            visible={layers.modelSlice}
          />
        )}

        {/* 3D Instanced Ocean Current Vectors */}
        {sliceData && sliceData.vectors && (
          <CurrentVectors
            vectors={sliceData.vectors}
            depth={depth}
            visible={layers.currentVectors}
          />
        )}

        {/* In-Situ Observations: Argo Profiling Floats & Underwater Gliders */}
        <ObservationLayer
          floats={argoFloats}
          gliders={gliders}
          visibleFloats={layers.argoFloats}
          visibleGliders={layers.gliders}
          selectedFloatId={selectedFloatId}
          onSelectFloat={onSelectFloat}
          selectedCycle={selectedCycle}
          activeVariable={sliceData?.variable || 'temperature'}
          currentTimeStep={sliceData?.time_step ?? 2}
        />

        {/* 3D Vertical Ocean Depth Stratification Ruler (Task 2) */}
        <DepthRuler activeDepth={sliceData?.variable === 'ssh' ? 0 : depth} />

        {/* Subtle Geographic Orientation Labels & 3D Compass (Task 11) */}
        <GeographicLabels />

        {/* Bounding Coordinate Box / Reference Grid */}
        {layers.wireframe && (
          <gridHelper
            args={[22, 22, '#00f0ff', '#16284d']}
            position={[0, 0.05, 0]}
          />
        )}
      </Canvas>

      {/* Subtle Regional Context Tag (Non-interactive) */}
      <div className="ocean-basin-tag">
        <span className="basin-name">INDIAN OCEAN BASIN</span>
        <span className="basin-coords">30°E – 115°E • 25°S – 30°N • Depth: 0m to -4000m</span>
      </div>
    </div>
  );
};
