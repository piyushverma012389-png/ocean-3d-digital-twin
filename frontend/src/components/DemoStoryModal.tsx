import React from 'react';
import { Play, ChevronLeft, ChevronRight, X, Compass, Thermometer, Layers, Wind, Anchor, Activity, CheckCircle } from 'lucide-react';
import { CameraPreset } from './OceanControls';
import { OceanVariable, ColormapType } from '../types/ocean';

export interface DemoStoryStateActions {
  setCameraPreset: (preset: CameraPreset) => void;
  setActiveVariable: (v: OceanVariable) => void;
  setCurrentDepth: (d: number) => void;
  setCurrentTimeStep: (t: number) => void;
  setColormap: (c: ColormapType) => void;
  setSelectedFloatId: (id: string | null) => void;
  setSelectedCycle: (cycle: number) => void;
  setIsComparisonOpen: (open: boolean) => void;
  setLayerVisibility: (layer: 'currentVectors' | 'modelSlice' | 'bathymetry', visible: boolean) => void;
}

interface DemoStoryModalProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
  actions: DemoStoryStateActions;
}

export const DemoStoryModal: React.FC<DemoStoryModalProps> = ({
  currentStep,
  onStepChange,
  onClose,
  actions
}) => {
  const storySteps = [
    {
      step: 1,
      title: 'Indian Ocean Overview',
      subtitle: '3D Domain & Authentic Bathymetry',
      icon: <Compass size={16} color="var(--accent-cyan)" />,
      badge: 'NUMERICAL DOMAIN',
      text: 'Overview of the regional Indian Ocean basin (30°E–115°E, 25°S–30°N). Integrates authentic GEBCO gridded bathymetry with high-resolution HYCOM GLBu0.08 numerical circulation modeling.',
      apply: () => {
        actions.setCameraPreset('full');
        actions.setIsComparisonOpen(false);
        actions.setCurrentDepth(0);
        actions.setActiveVariable('temperature');
        actions.setCurrentTimeStep(2);
        actions.setLayerVisibility('bathymetry', true);
        actions.setLayerVisibility('modelSlice', true);
      }
    },
    {
      step: 2,
      title: 'Surface Temperature Field',
      subtitle: 'Equatorial Warm Pool & Upwelling',
      icon: <Thermometer size={16} color="#ff5376" />,
      badge: 'SEA SURFACE TEMP',
      text: 'Modeled sea-surface temperature across the basin on 20 Nov 2018. Note the warm pool exceeding 28°C in the eastern equatorial zone contrasted with localized coastal cooling.',
      apply: () => {
        actions.setIsComparisonOpen(false);
        actions.setActiveVariable('temperature');
        actions.setCurrentDepth(0);
        actions.setColormap('turbo');
        actions.setCurrentTimeStep(2);
      }
    },
    {
      step: 3,
      title: 'Subsurface Stratification at 200 m',
      subtitle: 'Vertical Thermocline Structure',
      icon: <Layers size={16} color="var(--accent-cyan)" />,
      badge: 'DEPTH STRATIFICATION',
      text: 'Subsurface ocean slice at 200 m depth. The 3D viewer smoothly translates through hydrostatic levels, showing rapid temperature drop across the equatorial thermocline.',
      apply: () => {
        actions.setIsComparisonOpen(false);
        actions.setActiveVariable('temperature');
        actions.setCurrentDepth(200);
      }
    },
    {
      step: 4,
      title: 'Current Velocity Vectors',
      subtitle: 'Authentic HYCOM U/V Flow Field',
      icon: <Wind size={16} color="var(--accent-emerald)" />,
      badge: 'HYDRODYNAMICS',
      text: 'Horizontal flow arrows derived from HYCOM U/V velocity components. Direction reflects horizontal angle atan2(V, U), while arrow length and color scale with velocity magnitude √(U² + V²).',
      apply: () => {
        actions.setIsComparisonOpen(false);
        actions.setActiveVariable('velocity');
        actions.setCurrentDepth(0);
        actions.setColormap('viridis');
        actions.setLayerVisibility('currentVectors', true);
      }
    },
    {
      step: 5,
      title: 'In-Situ Argo Float 2902088',
      subtitle: 'Autonomous Profiling CTD Sensor',
      icon: <Anchor size={16} color="var(--accent-emerald)" />,
      badge: 'IN-SITU OBSERVATION',
      text: 'Autonomous profiling float WMO 2902088 located at 4.15°S, 86.00°E. Records authentic CTD vertical profiles down to 2000 m across 138 validated hydrostatic levels.',
      apply: () => {
        actions.setIsComparisonOpen(false);
        actions.setSelectedFloatId('argo-2902088');
        actions.setSelectedCycle(217);
        actions.setCurrentTimeStep(2);
        actions.setCameraPreset('argo_focus');
      }
    },
    {
      step: 6,
      title: 'Near-Synoptic Model vs Observation',
      subtitle: 'Cycle 217 Collocated Statistical Metrics',
      icon: <Activity size={16} color="var(--accent-emerald)" />,
      badge: 'SCIENTIFIC VALIDATION',
      text: 'Collocated vertical water column comparison between Argo Float 2902088 (Cycle 217) and the HYCOM 20 Nov 2018 model slice. Near-synoptic alignment (<3.5h lag) demonstrates statistical agreement across 138 depths.',
      apply: () => {
        actions.setSelectedFloatId('argo-2902088');
        actions.setSelectedCycle(217);
        actions.setCurrentTimeStep(2);
        actions.setActiveVariable('temperature');
        actions.setIsComparisonOpen(true);
      }
    }
  ];

  const current = storySteps[currentStep - 1] || storySteps[0];

  const goToStep = (s: number) => {
    if (s < 1 || s > storySteps.length) return;
    onStepChange(s);
    const target = storySteps[s - 1];
    if (target) target.apply();
  };

  return (
    <div className="demo-story-card glass-panel" style={{ pointerEvents: 'auto' }}>
      <div className="demo-story-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="story-step-badge">
            STEP {current.step} OF {storySteps.length}
          </div>
          <span className="story-step-topic">{current.badge}</span>
        </div>
        <button className="close-btn" onClick={onClose} title="Dismiss Guided Story Mode">
          <X size={15} />
        </button>
      </div>

      <div className="demo-story-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          {current.icon}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{current.title}</div>
            <div style={{ fontSize: '10.5px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{current.subtitle}</div>
          </div>
        </div>

        <p className="demo-story-text">
          {current.text}
        </p>

        {/* Step dots */}
        <div className="story-dots-row">
          {storySteps.map((s) => (
            <button
              key={s.step}
              className={`story-dot ${s.step === currentStep ? 'active' : ''}`}
              onClick={() => goToStep(s.step)}
              title={`Jump to Step ${s.step}: ${s.title}`}
            />
          ))}
        </div>
      </div>

      <div className="demo-story-footer">
        <button
          className="btn-story-nav"
          disabled={currentStep <= 1}
          onClick={() => goToStep(currentStep - 1)}
        >
          <ChevronLeft size={13} />
          Previous
        </button>

        {currentStep < storySteps.length ? (
          <button
            className="btn-story-nav next-btn"
            onClick={() => goToStep(currentStep + 1)}
          >
            Next Step
            <ChevronRight size={13} />
          </button>
        ) : (
          <button
            className="btn-story-nav finish-btn"
            onClick={onClose}
          >
            <CheckCircle size={13} style={{ marginRight: '4px' }} />
            Explore Freely
          </button>
        )}
      </div>
    </div>
  );
};
