import React from 'react';
import { Layers } from 'lucide-react';

interface DepthSliderProps {
  currentDepth: number;
  onDepthChange: (depth: number) => void;
  availableDepths?: number[];
  disabled?: boolean;
  disabledMessage?: string;
}

export const DepthSlider: React.FC<DepthSliderProps> = ({
  currentDepth,
  onDepthChange,
  availableDepths = [0, 10, 20, 50, 100, 200, 500, 1000, 1500, 2000, 3000, 4000],
  disabled = false,
  disabledMessage = '2D Surface Variable (z = 0m)'
}) => {
  // Find current index
  const activeDepth = disabled ? 0 : currentDepth;
  const currentIndex = availableDepths.indexOf(activeDepth) !== -1
    ? availableDepths.indexOf(activeDepth)
    : 0;

  // Determine ocean depth zone
  const getZoneLabel = (d: number) => {
    if (disabled) return disabledMessage;
    if (d <= 200) return 'Epipelagic (Sunlight Zone)';
    if (d <= 1000) return 'Mesopelagic (Twilight Zone)';
    if (d <= 4000) return 'Bathypelagic (Midnight Zone)';
    return 'Abyssopelagic';
  };

  // Phase 3D Requirement 2: 10 explicit depth presets
  const presets = [
    { label: 'Surface', depth: 0 },
    { label: '10 m', depth: 10 },
    { label: '20 m', depth: 20 },
    { label: '50 m', depth: 50 },
    { label: '100 m', depth: 100 },
    { label: '200 m', depth: 200 },
    { label: '500 m', depth: 500 },
    { label: '1000 m', depth: 1000 },
    { label: '1500 m', depth: 1500 },
    { label: '2000 m', depth: 2000 }
  ];

  return (
    <div className="glass-panel" style={{ pointerEvents: 'auto', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 14px' }}>
      <div className="panel-header" style={{ padding: '0 0 6px 0', borderBottom: 'none' }}>
        <span className="panel-title" style={{ fontSize: '11px' }}>
          <Layers size={13} color="var(--accent-cyan)" />
          Depth Stratification
        </span>
        <span
          className="slider-value-badge"
          style={{
            background: disabled ? 'rgba(255, 184, 0, 0.15)' : undefined,
            color: disabled ? '#ffb800' : undefined,
            borderColor: disabled ? 'rgba(255, 184, 0, 0.4)' : undefined
          }}
        >
          {disabled ? 'LOCKED AT SURFACE (0 m)' : activeDepth === 0 ? 'Depth: Surface (0 m)' : `Depth: ${activeDepth} m`}
        </span>
      </div>

      <div
        className="slider-group"
        style={{
          opacity: disabled ? 0.55 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
          filter: disabled ? 'grayscale(0.4)' : undefined,
          transition: 'opacity 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: disabled ? '#ffb800' : 'var(--text-muted)' }}>
            {getZoneLabel(activeDepth)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: 'var(--text-secondary)' }}>
            {disabled ? 'SSH 2D ONLY' : `Level ${currentIndex + 1} of ${availableDepths.length}`}
          </span>
        </div>

        <input
          type="range"
          className="custom-range"
          min={0}
          max={availableDepths.length - 1}
          step={1}
          value={currentIndex}
          disabled={disabled}
          onChange={(e) => {
            const idx = parseInt(e.target.value, 10);
            onDepthChange(availableDepths[idx]);
          }}
        />

        {/* Phase 3D: 10 Explicit Depth Presets Grid */}
        <div
          className="depth-presets-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '3px',
            marginTop: '2px'
          }}
        >
          {presets.map((p) => {
            const isSelected = !disabled && activeDepth === p.depth;
            return (
              <button
                key={p.depth}
                className={`btn-preset depth-preset-btn ${isSelected ? 'active' : ''}`}
                disabled={disabled}
                style={{
                  padding: '3px 1px',
                  fontSize: '8.5px',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  borderColor: isSelected ? 'var(--accent-cyan)' : undefined,
                  background: isSelected ? 'rgba(0, 240, 255, 0.25)' : undefined,
                  color: isSelected ? '#ffffff' : undefined,
                  fontWeight: isSelected ? 700 : 400
                }}
                onClick={() => onDepthChange(p.depth)}
                title={p.depth === 0 ? 'Surface layer (0 m)' : `${p.depth} meters`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
