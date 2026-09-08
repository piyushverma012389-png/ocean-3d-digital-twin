import React from 'react';
import { LayerVisibilityState, CursorCoordinate } from '../types/ocean';
import { Eye, MapPin, Database, Anchor, Navigation } from 'lucide-react';

interface DataPanelProps {
  cursorCoord: CursorCoordinate | null;
  activeVariable: string;
  variableUnits: string;
  layers: LayerVisibilityState;
  onToggleLayer: (layerKey: keyof LayerVisibilityState) => void;
  floatsCount: number;
  glidersCount: number;
}

export const DataPanel: React.FC<DataPanelProps> = ({
  cursorCoord,
  activeVariable,
  variableUnits,
  layers,
  onToggleLayer,
  floatsCount,
  glidersCount
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Interactive Cursor Telemetry */}
      <div className="glass-panel" style={{ pointerEvents: 'auto' }}>
        <div className="panel-header">
          <span className="panel-title">
            <MapPin size={12} color="var(--accent-cyan)" />
            Spatial Telemetry
          </span>
          <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
            TRACKING
          </span>
        </div>
        <div className="panel-body">
          <div className="telemetry-grid">
            <div className="telemetry-item">
              <div className="telemetry-label">Longitude</div>
              <div className="telemetry-val">
                {cursorCoord ? `${cursorCoord.lon.toFixed(2)}°E` : '--.--°E'}
              </div>
            </div>
            <div className="telemetry-item">
              <div className="telemetry-label">Latitude</div>
              <div className="telemetry-val">
                {cursorCoord ? `${cursorCoord.lat.toFixed(2)}°N` : '--.--°N'}
              </div>
            </div>
            <div className="telemetry-item">
              <div className="telemetry-label">Target Depth</div>
              <div className="telemetry-val">
                {cursorCoord ? `-${cursorCoord.depth}m` : '-0m'}
              </div>
            </div>
            <div className="telemetry-item">
              <div className="telemetry-label">{activeVariable.toUpperCase()}</div>
              <div className="telemetry-val" style={{ color: 'var(--accent-emerald)' }}>
                {cursorCoord && cursorCoord.val !== undefined && cursorCoord.val !== null
                  ? `${cursorCoord.val} ${variableUnits}`
                  : 'LAND / N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layer Visibility Toggles */}
      <div className="glass-panel" style={{ pointerEvents: 'auto' }}>
        <div className="panel-header">
          <span className="panel-title">
            <Eye size={12} color="var(--accent-cyan)" />
            Visualization Layers
          </span>
        </div>
        <div className="panel-body" style={{ padding: '8px 14px' }}>
          <div className="layer-toggle-row">
            <div className="layer-toggle-info">
              <Database size={13} color="var(--accent-cyan)" />
              <span>3D Seabed Bathymetry</span>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={layers.bathymetry}
              onChange={() => onToggleLayer('bathymetry')}
            />
          </div>

          <div className="layer-toggle-row">
            <div className="layer-toggle-info">
              <Eye size={13} color="var(--accent-cyan)" />
              <span>Variable Depth Slice</span>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={layers.modelSlice}
              onChange={() => onToggleLayer('modelSlice')}
            />
          </div>

          <div className="layer-toggle-row">
            <div className="layer-toggle-info">
              <Navigation size={13} color="var(--accent-emerald)" />
              <span>Current Velocity Vectors</span>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={layers.currentVectors}
              onChange={() => onToggleLayer('currentVectors')}
            />
          </div>

          <div className="layer-toggle-row">
            <div className="layer-toggle-info">
              <Anchor size={13} color="#ffb800" />
              <span>Argo Profiling Floats ({floatsCount})</span>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={layers.argoFloats}
              onChange={() => onToggleLayer('argoFloats')}
            />
          </div>

          <div className="layer-toggle-row">
            <div className="layer-toggle-info">
              <Navigation size={13} color="#ff5376" />
              <span>Underwater Gliders ({glidersCount})</span>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={layers.gliders}
              onChange={() => onToggleLayer('gliders')}
            />
          </div>

          <div className="layer-toggle-row">
            <div className="layer-toggle-info">
              <Database size={13} color="var(--text-muted)" />
              <span>Geographic Bounding Grid</span>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={layers.wireframe}
              onChange={() => onToggleLayer('wireframe')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
