import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Minimize2 } from 'lucide-react';
import { oceanApi } from './services/api';
import {
  OceanVariable,
  ColormapType,
  GridMeta,
  ModelSliceData,
  BathymetryGrid,
  ArgoFloat,
  GliderMission,
  ComparisonData,
  LayerVisibilityState,
  CursorCoordinate,
  DataProvenance
} from './types/ocean';
import { Navbar } from './components/Navbar';
import { OceanViewer } from './components/OceanViewer';
import { VariableSelector } from './components/VariableSelector';
import { DepthSlider } from './components/DepthSlider';
import { TimeSlider } from './components/TimeSlider';
import { ColorLegend } from './components/ColorLegend';
import { OceanControls, CameraPreset } from './components/OceanControls';
import { DataPanel } from './components/DataPanel';
import { ComparisonPanel } from './components/ComparisonPanel';
import { ProvenanceModal } from './components/ProvenanceModal';
import { OceanStateSummary } from './components/OceanStateSummary';
import { ArgoStoryCard } from './components/ArgoStoryCard';
import { WorkflowGuide } from './components/WorkflowGuide';
import { DemoStoryModal, DemoStoryStateActions } from './components/DemoStoryModal';

export const App: React.FC = () => {
  // Application State — SIH Demo Default State: Temperature, 0m Depth, 20 Nov 2018 (step 2), Argo 2902088, Cycle 217
  const [activeVariable, setActiveVariable] = useState<OceanVariable>('temperature');
  const [currentDepth, setCurrentDepth] = useState<number>(0);
  const [currentTimeStep, setCurrentTimeStep] = useState<number>(2);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [colormap, setColormap] = useState<ColormapType>('turbo');

  // Provenance Modal State
  const [provenance, setProvenance] = useState<DataProvenance | null>(null);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState<boolean>(false);

  // Guided Story Mode (Phase 3D Requirement 8)
  const [isGuidedStoryOpen, setIsGuidedStoryOpen] = useState<boolean>(false);
  const [guidedStoryStep, setGuidedStoryStep] = useState<number>(1);

  // 1-Click Scientific Workflow Stepper (Phase 3D Requirement 7)
  const [workflowStep, setWorkflowStep] = useState<number>(1);

  // Visualization Layers
  const [layers, setLayers] = useState<LayerVisibilityState>({
    bathymetry: true,
    modelSlice: true,
    currentVectors: true,
    argoFloats: true,
    gliders: true,
    wireframe: false
  });

  // Camera & Interaction
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('full');
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const [cursorCoord, setCursorCoord] = useState<CursorCoordinate | null>(null);

  // In-Situ Selection & Comparison
  const [selectedFloatId, setSelectedFloatId] = useState<string | null>('argo-2902088');
  const [selectedCycle, setSelectedCycle] = useState<number>(217);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);

  // Backend / Data State
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [meta, setMeta] = useState<GridMeta | null>(null);
  const [bathymetryGrid, setBathymetryGrid] = useState<BathymetryGrid | null>(null);
  const [sliceData, setSliceData] = useState<ModelSliceData | null>(null);
  const [isSliceLoading, setIsSliceLoading] = useState<boolean>(false);
  const [argoFloats, setArgoFloats] = useState<ArgoFloat[]>([]);
  const [gliders, setGliders] = useState<GliderMission[]>([]);

  // Phase 4: SIH Presentation Mode state
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);

  // Phase 4: Stale-state request sequencing references
  const sliceRequestIdRef = useRef<number>(0);
  const compRequestIdRef = useRef<number>(0);

  // Loading & error state for comparison modal
  const [isComparisonLoading, setIsComparisonLoading] = useState<boolean>(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Effective depth: SSH is physically a 2D surface metric (z = 0m)
  const effectiveDepth = activeVariable === 'ssh' ? 0 : currentDepth;

  // Fetch comparison data when selected float, comparison variable, or cycle changes (with sequence protection)
  const loadComparison = useCallback(async (floatId: string, variable: OceanVariable, cycle?: number, timeStepOverride?: number) => {
    const currentReqId = ++compRequestIdRef.current;
    try {
      setIsComparisonLoading(true);
      setComparisonError(null);
      const activeTimeStep = timeStepOverride !== undefined ? timeStepOverride : currentTimeStep;
      const activeCycle = cycle !== undefined ? cycle : (floatId.includes('2902088') ? (selectedCycle ?? 217) : undefined);
      const comp = await oceanApi.getComparison(floatId, variable, activeTimeStep, activeCycle);
      
      // Stale-state shielding: only commit if request is still the newest
      if (currentReqId === compRequestIdRef.current) {
        setComparisonData(comp);
        setComparisonError(null);
      }
    } catch (err: any) {
      if (currentReqId === compRequestIdRef.current) {
        console.error('Failed to load comparison data:', err);
        // Clear stale data on failure rather than displaying outdated metrics
        setComparisonData(null);
        setComparisonError(err?.message || 'Comparison unavailable for this cycle');
      }
    } finally {
      if (currentReqId === compRequestIdRef.current) {
        setIsComparisonLoading(false);
      }
    }
  }, [currentTimeStep, selectedCycle]);

  // Initial load
  useEffect(() => {
    async function initData() {
      try {
        const [metaData, bathyData, floatsData, glidersData, provData] = await Promise.all([
          oceanApi.getMetadata(),
          oceanApi.getBathymetry(),
          oceanApi.getArgoFloats(),
          oceanApi.getGliders(),
          oceanApi.getProvenance().catch(() => null)
        ]);
        setMeta(metaData);
        setBathymetryGrid(bathyData);
        setArgoFloats(floatsData);
        setGliders(glidersData);
        if (provData) setProvenance(provData);
        setIsBackendConnected(true);

        // Preload SIH demo baseline comparison (Argo 2902088 Cycle 217 vs HYCOM 20 Nov 2018)
        loadComparison('argo-2902088', 'temperature', 217, 2);
      } catch (e) {
        console.error('Initial data fetch failed:', e);
        setIsBackendConnected(false);
      }
    }
    initData();
  }, [loadComparison]);

  // Fetch slice data on variable, depth, or time change (with stale-state sequencing)
  useEffect(() => {
    const currentReqId = ++sliceRequestIdRef.current;
    let isCancelled = false;

    async function loadSlice() {
      try {
        setIsSliceLoading(true);
        const data = await oceanApi.getSlice(activeVariable, effectiveDepth, currentTimeStep);
        if (!isCancelled && currentReqId === sliceRequestIdRef.current) {
          setSliceData(data);
        }
      } catch (err) {
        if (!isCancelled && currentReqId === sliceRequestIdRef.current) {
          console.error('Failed to load slice:', err);
        }
      } finally {
        if (!isCancelled && currentReqId === sliceRequestIdRef.current) {
          setIsSliceLoading(false);
        }
      }
    }
    loadSlice();
    return () => {
      isCancelled = true;
    };
  }, [activeVariable, effectiveDepth, currentTimeStep]);

  // Keep comparison context updated when time or variable changes (prevents stale comparison values)
  useEffect(() => {
    if (selectedFloatId) {
      const is2902088 = selectedFloatId.includes('2902088');
      const targetCycle = is2902088 ? (selectedCycle ?? 217) : undefined;
      const targetVar = activeVariable === 'salinity' ? 'salinity' : 'temperature';
      loadComparison(selectedFloatId, targetVar, targetCycle, currentTimeStep);
    }
  }, [currentTimeStep, activeVariable, selectedCycle, selectedFloatId, loadComparison]);

  const handleSelectFloat = (floatId: string) => {
    setSelectedFloatId(floatId);
    const is2902088 = floatId.includes('2902088');
    if (is2902088) {
      setSelectedCycle(217);
      setCurrentTimeStep(2); // Compatible model timestamp 2018-11-20T00:00:00Z
      loadComparison(floatId, activeVariable === 'salinity' ? 'salinity' : 'temperature', 217, 2);
    } else {
      loadComparison(floatId, activeVariable === 'salinity' ? 'salinity' : 'temperature', undefined, currentTimeStep);
    }
    setIsComparisonOpen(true);
  };

  const handleOpenComparisonManual = () => {
    const floatToLoad = selectedFloatId || (argoFloats[0]?.id || 'argo-2902088');
    setSelectedFloatId(floatToLoad);
    const is2902088 = floatToLoad.includes('2902088');
    const targetCycle = is2902088 ? (selectedCycle ?? 217) : undefined;
    if (is2902088 && targetCycle === 217) {
      setCurrentTimeStep(2);
      loadComparison(floatToLoad, activeVariable === 'salinity' ? 'salinity' : 'temperature', 217, 2);
    } else {
      loadComparison(floatToLoad, activeVariable === 'salinity' ? 'salinity' : 'temperature', targetCycle, currentTimeStep);
    }
    setIsComparisonOpen(true);
  };

  const handleToggleLayer = (key: keyof LayerVisibilityState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleResetCamera = () => {
    setCameraPreset('full');
    setIsAutoRotating(false);
  };

  // Workflow step handler
  const handleSelectWorkflowStep = (step: number) => {
    setWorkflowStep(step);
    if (step === 1) {
      handleResetCamera();
      setCurrentDepth(0);
      setActiveVariable('temperature');
    } else if (step === 2) {
      setCurrentDepth(200);
    } else if (step === 3) {
      if (activeVariable === 'temperature') setActiveVariable('salinity');
      else if (activeVariable === 'salinity') setActiveVariable('velocity');
      else setActiveVariable('temperature');
    } else if (step === 4) {
      setSelectedFloatId('argo-2902088');
      setSelectedCycle(217);
      setCameraPreset('argo_focus');
    }
  };

  // Actions passed to DemoStoryModal
  const storyActions: DemoStoryStateActions = {
    setCameraPreset,
    setActiveVariable: (v) => {
      setActiveVariable(v);
      if (v === 'salinity') setColormap('haline');
      else if (v === 'velocity') setColormap('viridis');
      else if (v === 'ssh') setColormap('coolwarm');
      else setColormap('turbo');
    },
    setCurrentDepth,
    setCurrentTimeStep,
    setColormap,
    setSelectedFloatId,
    setSelectedCycle,
    setIsComparisonOpen,
    setLayerVisibility: (layer, visible) => {
      setLayers((prev) => ({ ...prev, [layer]: visible }));
    }
  };

  // Active layers counter
  const activeLayersCount = Object.values(layers).filter(Boolean).length;

  // Format active model time label
  const currentTimeLabel = currentTimeStep === 0
    ? '18 Nov 2018'
    : currentTimeStep === 1
    ? '19 Nov 2018'
    : '20 Nov 2018';

  const temporalStatus = selectedCycle === 217 ? 'NEAR_SYNOPTIC' : 'TEMPORALLY_MISMATCHED';

  return (
    <div className={`app-container ${isPresentationMode ? 'presentation-mode' : ''}`}>
      {/* 3D Ocean Visualizer Canvas */}
      <OceanViewer
        bathymetryGrid={bathymetryGrid}
        sliceData={sliceData}
        argoFloats={argoFloats}
        gliders={gliders}
        layers={layers}
        colormap={colormap}
        depth={effectiveDepth}
        selectedFloatId={selectedFloatId}
        onSelectFloat={handleSelectFloat}
        onCursorMove={setCursorCoord}
        cameraPreset={cameraPreset}
        isAutoRotating={isAutoRotating}
        selectedCycle={selectedCycle}
      />

      {/* Top Navigation Bar with Scientific Header, Data Sources, & Action Buttons */}
      <Navbar
        isBackendConnected={isBackendConnected}
        activeLayersCount={activeLayersCount}
        onResetCamera={handleResetCamera}
        onOpenComparison={handleOpenComparisonManual}
        selectedFloatId={selectedFloatId}
        provenance={provenance}
        onOpenProvenance={() => setIsProvenanceOpen(true)}
        temporalStatus={temporalStatus}
        onToggleGuidedStory={() => setIsGuidedStoryOpen(!isGuidedStoryOpen)}
        isGuidedStoryActive={isGuidedStoryOpen}
        isPresentationMode={isPresentationMode}
        onTogglePresentationMode={() => setIsPresentationMode(prev => !prev)}
      />

      {/* 1-Click Scientific Workflow Stepper (Phase 3D Requirement 7) */}
      <WorkflowGuide
        currentStep={workflowStep}
        onSelectStep={handleSelectWorkflowStep}
        selectedCycle={selectedCycle}
        onOpenComparison={handleOpenComparisonManual}
        onSwitchCycle={(newCycle) => {
          setSelectedCycle(newCycle);
          if (newCycle === 217) setCurrentTimeStep(2);
        }}
        activeVariable={activeVariable}
        currentDepth={effectiveDepth}
        selectedFloatId={selectedFloatId}
      />

      {/* Floating Controls (Left Column) */}
      <div className="controls-column-left">
        <VariableSelector
          selectedVariable={activeVariable}
          onSelectVariable={(v) => {
            setActiveVariable(v);
            if (v === 'salinity') setColormap('haline');
            else if (v === 'velocity') setColormap('viridis');
            else if (v === 'ssh') setColormap('coolwarm');
            else setColormap('turbo');
          }}
          variableRange={
            sliceData
              ? { min: sliceData.min_val, max: sliceData.max_val, units: sliceData.units }
              : undefined
          }
          currentDepth={effectiveDepth}
          currentTimeLabel={currentTimeLabel}
        />

        <OceanControls
          onSelectPreset={(preset) => {
            setCameraPreset(preset);
          }}
          isAutoRotating={isAutoRotating}
          onToggleAutoRotate={() => setIsAutoRotating(!isAutoRotating)}
        />

        <ColorLegend
          variable={activeVariable}
          units={sliceData?.units || '°C'}
          minVal={sliceData?.min_val ?? 2.0}
          maxVal={sliceData?.max_val ?? 31.0}
          colormap={colormap}
          onColormapChange={setColormap}
        />
      </div>

      {/* Floating Data, Story & Telemetry (Right Column) */}
      <div className="controls-column-right">
        {/* Phase 3D Requirement 1: Ocean State Summary Card */}
        <OceanStateSummary
          activeVariable={activeVariable}
          sliceData={sliceData}
          currentDepth={effectiveDepth}
          meta={meta}
          onOpenProvenance={() => setIsProvenanceOpen(true)}
          isLoading={isSliceLoading}
        />

        {/* Phase 3D Requirement 6: Argo Observation Story Card */}
        <ArgoStoryCard
          selectedCycle={selectedCycle}
          onCycleSwitch={(c) => {
            setSelectedCycle(c);
            if (c === 217) setCurrentTimeStep(2);
          }}
          activeVariable={activeVariable}
          onOpenComparison={handleOpenComparisonManual}
          onOpenProvenance={() => setIsProvenanceOpen(true)}
          currentTimeStep={currentTimeStep}
        />

        {/* Spatial Telemetry & Layer Toggles */}
        <DataPanel
          cursorCoord={cursorCoord}
          activeVariable={activeVariable}
          variableUnits={sliceData?.units || ''}
          layers={layers}
          onToggleLayer={handleToggleLayer}
          floatsCount={argoFloats.length}
          glidersCount={gliders.length}
        />
      </div>

      {/* Bottom Control Bar: Depth & 4D Time */}
      <div className="bottom-control-bar">
        {/* Depth Controller with 10 Presets */}
        <div style={{ width: '460px', height: '100%' }}>
          <DepthSlider
            currentDepth={currentDepth}
            onDepthChange={setCurrentDepth}
            availableDepths={meta?.depth_levels}
            disabled={activeVariable === 'ssh'}
            disabledMessage="2D Sea Surface Height Anomaly (Locked at z = 0m)"
          />
        </div>

        {/* 4D Temporal Timeline Controller with Discrete Daily Snapshots */}
        <TimeSlider
          currentTimeStep={currentTimeStep}
          onTimeStepChange={(step) => {
            setCurrentTimeStep(step);
          }}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          timeSteps={meta?.time_steps}
          isSynopticMatch={currentTimeStep === 2 && selectedCycle === 217}
        />
      </div>

      {/* Phase 3D Requirement 8: Guided Presentation Story Modal */}
      {isGuidedStoryOpen && (
        <DemoStoryModal
          currentStep={guidedStoryStep}
          onStepChange={setGuidedStoryStep}
          onClose={() => setIsGuidedStoryOpen(false)}
          actions={storyActions}
        />
      )}

      {/* Model vs Observation Comparison Modal */}
      {isComparisonOpen && (
        <ComparisonPanel
          data={comparisonData}
          onClose={() => setIsComparisonOpen(false)}
          activeVariable={activeVariable === 'salinity' ? 'salinity' : 'temperature'}
          selectedCycle={selectedCycle}
          isLoading={isComparisonLoading}
          errorMessage={comparisonError}
          onVariableSwitch={(v) => {
            if (selectedFloatId) {
              loadComparison(selectedFloatId, v, selectedCycle);
            }
          }}
          onCycleSwitch={(newCycle) => {
            setSelectedCycle(newCycle);
            if (newCycle === 217) setCurrentTimeStep(2);
            if (selectedFloatId) {
              loadComparison(selectedFloatId, activeVariable === 'salinity' ? 'salinity' : 'temperature', newCycle);
            }
          }}
        />
      )}

      {/* Data Provenance & Verification Modal */}
      {isProvenanceOpen && (
        <ProvenanceModal
          provenance={provenance}
          onClose={() => setIsProvenanceOpen(false)}
        />
      )}

      {/* Phase 4: SIH Presentation Mode Floating Exit Pill */}
      {isPresentationMode && (
        <button
          id="exit-presentation-mode-btn"
          className="floating-presentation-exit"
          onClick={() => setIsPresentationMode(false)}
          title="Exit Presentation Mode (Restore All Controls)"
        >
          <Minimize2 size={15} />
          <span>Exit Presentation Mode</span>
        </button>
      )}
    </div>
  );
};
