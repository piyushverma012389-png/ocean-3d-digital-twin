import React from 'react';
import { Camera, Compass, RotateCw } from 'lucide-react';

export type CameraPreset = 'full' | 'surface' | 'oblique' | 'argo_focus' | 'arabian_sea' | 'bay_of_bengal';

interface OceanControlsProps {
  onSelectPreset: (preset: CameraPreset) => void;
  isAutoRotating: boolean;
  onToggleAutoRotate: () => void;
}

export const OceanControls: React.FC<OceanControlsProps> = ({
  onSelectPreset,
  isAutoRotating,
  onToggleAutoRotate
}) => {
  const presets: Array<{ id: CameraPreset; label: string; desc: string }> = [
    { id: 'full', label: 'Basin Overview', desc: 'Indian Ocean basin overview (30°E - 115°E)' },
    { id: 'surface', label: 'Surface View', desc: 'Nadir 2D plan view of sea surface' },
    { id: 'oblique', label: 'Oblique 3D View', desc: 'Angled perspective showing vertical depth stratification' },
    { id: 'argo_focus', label: 'Observation Focus', desc: 'Centered on authentic Argo Float 2902088 CTD profile' },
    { id: 'arabian_sea', label: 'Arabian Sea', desc: 'Somali Jet & high-salinity water mass' },
    { id: 'bay_of_bengal', label: 'Bay of Bengal', desc: 'River discharge plume & cyclonic circulation' }
  ];

  return (
    <div className="glass-panel" style={{ pointerEvents: 'auto' }}>
      <div className="panel-header">
        <span className="panel-title">
          <Compass size={12} color="var(--accent-cyan)" />
          Camera Vantage Presets
        </span>
        <button
          className={`btn-icon ${isAutoRotating ? 'active' : ''}`}
          onClick={onToggleAutoRotate}
          title={isAutoRotating ? 'Stop Slow Rotation' : 'Enable Slow Rotation'}
          style={{ width: '22px', height: '22px', padding: '2px' }}
        >
          <RotateCw size={11} />
        </button>
      </div>

      <div className="panel-body">
        <div className="preset-grid">
          {presets.map((p) => (
            <button
              key={p.id}
              className="btn-preset"
              onClick={() => onSelectPreset(p.id)}
              title={p.desc}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
