import React from 'react';
import { ColormapType } from '../types/ocean';
import { Palette, Navigation } from 'lucide-react';

interface ColorLegendProps {
  variable: string;
  units: string;
  minVal: number;
  maxVal: number;
  colormap: ColormapType;
  onColormapChange: (colormap: ColormapType) => void;
}

export const ColorLegend: React.FC<ColorLegendProps> = ({
  variable,
  units,
  minVal,
  maxVal,
  colormap,
  onColormapChange
}) => {
  // CSS gradient representations of oceanographic colormaps
  const gradients: Record<ColormapType, string> = {
    turbo: 'linear-gradient(to right, #30123b, #4145ab, #4675ed, #39a2fc, #1bcfd4, #24eca6, #61fc6c, #a4fc3b, #d1e834, #f3c63a, #fe9b2d, #f36315, #d93806, #b11902, #7a0403)',
    viridis: 'linear-gradient(to right, #440154, #482878, #3e4989, #31688e, #26828e, #1f9e89, #35b779, #6ece58, #b5de2b, #fde725)',
    thermal: 'linear-gradient(to right, #040404, #1b0c3d, #4d0c5a, #820e5c, #b6174a, #dc3d32, #f37324, #fca636, #f7dc66, #fcfea4)',
    haline: 'linear-gradient(to right, #242234, #273b6a, #235999, #1f78be, #2997d6, #4fb5e2, #7eceea, #b2e4f2, #e8f7fa)',
    coolwarm: 'linear-gradient(to right, #3b4cc0, #6788ee, #9abbff, #c9d7f0, #edd1c2, #f7a889, #e26952, #b40426)'
  };

  const getVariableLabel = (v: string): string => {
    switch (v) {
      case 'temperature':
        return 'Temperature (°C)';
      case 'salinity':
        return 'Salinity (PSU)';
      case 'velocity':
        return 'Current Speed (m/s)';
      case 'ssh':
        return 'Sea Surface Height (m)';
      default:
        return `${v} (${units})`;
    }
  };

  const midVal = ((minVal + maxVal) / 2).toFixed(2);
  const minFormatted = minVal.toFixed(2);
  const maxFormatted = maxVal.toFixed(2);

  return (
    <div className="glass-panel" style={{ pointerEvents: 'auto' }}>
      <div className="panel-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span className="panel-title" style={{ color: 'var(--text-primary)', fontSize: '11px', fontWeight: 600 }}>
            <Palette size={12} color="var(--accent-cyan)" />
            {getVariableLabel(variable)}
          </span>
          <span style={{ fontSize: '9px', color: 'var(--accent-cyan)', opacity: 0.85, fontFamily: 'var(--font-mono)' }}>
            Active Slice Range
          </span>
        </div>
        <select
          value={colormap}
          onChange={(e) => onColormapChange(e.target.value as ColormapType)}
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            color: 'var(--accent-cyan)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            padding: '2px 6px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="turbo">Turbo (Rainbow)</option>
          <option value="viridis">Viridis (Perceptual)</option>
          <option value="thermal">Thermal (Heat)</option>
          <option value="haline">Haline (Salinity)</option>
          <option value="coolwarm">Coolwarm (Bipolar)</option>
        </select>
      </div>

      <div className="panel-body">
        <div
          className="colormap-gradient-bar"
          style={{ background: gradients[colormap] }}
        />
        <div className="colormap-ticks">
          <span>{minFormatted} {units}</span>
          <span>{midVal} {units}</span>
          <span>{maxFormatted} {units}</span>
        </div>

        {/* Phase 3D Requirement 5: Current-Vector Storytelling Context Panel */}
        {variable === 'velocity' && (
          <div className="current-vector-story-panel" style={{
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <Navigation size={11} color="var(--accent-emerald)" />
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-emerald)', letterSpacing: '0.4px' }}>
                CURRENT VECTOR SPECIFICATION
              </span>
            </div>

            <div className="vector-spec-row">
              <span className="vector-spec-label">Direction:</span>
              <span className="vector-spec-value">U/V velocity components (atan2(V, U))</span>
            </div>

            <div className="vector-spec-row">
              <span className="vector-spec-label">Magnitude:</span>
              <span className="vector-spec-value">√(U² + V²)</span>
            </div>

            <div className="vector-spec-row">
              <span className="vector-spec-label">Vector density:</span>
              <span className="vector-spec-value" style={{ color: 'var(--text-muted)' }}>
                Decimated for browser performance
              </span>
            </div>

            <div className="vector-spec-row">
              <span className="vector-spec-label">Unit:</span>
              <span className="vector-spec-value" style={{ color: 'var(--accent-cyan)' }}>m/s</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
