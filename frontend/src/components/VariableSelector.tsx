import React from 'react';
import { OceanVariable } from '../types/ocean';
import { Thermometer, Droplets, Wind, ArrowUpDown, Info } from 'lucide-react';

interface VariableSelectorProps {
  selectedVariable: OceanVariable;
  onSelectVariable: (variable: OceanVariable) => void;
  variableRange?: { min: number; max: number; units: string };
  currentDepth: number;
  currentTimeLabel: string;
}

export const VariableSelector: React.FC<VariableSelectorProps> = ({
  selectedVariable,
  onSelectVariable,
  variableRange,
  currentDepth,
  currentTimeLabel
}) => {
  const variables: Array<{
    id: OceanVariable;
    name: string;
    unit: string;
    icon: React.ReactNode;
    desc: string;
    storyTitle: string;
    storyText: string;
  }> = [
    {
      id: 'temperature',
      name: 'Temperature',
      unit: '°C',
      icon: <Thermometer size={14} color="#ff5376" />,
      desc: 'Seawater temperature across water column',
      storyTitle: 'TEMPERATURE FIELD',
      storyText: 'Shows the modeled ocean temperature field across depth.'
    },
    {
      id: 'salinity',
      name: 'Salinity',
      unit: 'PSU',
      icon: <Droplets size={14} color="#00f0ff" />,
      desc: 'Practical salinity (haline gradient)',
      storyTitle: 'SALINITY DISTRIBUTION',
      storyText: 'Shows modeled salinity distribution and freshwater-influenced regions.'
    },
    {
      id: 'velocity',
      name: 'Currents',
      unit: 'm/s',
      icon: <Wind size={14} color="#00e5a3" />,
      desc: 'Horizontal current velocity magnitude',
      storyTitle: 'CURRENT VELOCITY FIELD',
      storyText: 'Derived from HYCOM U/V velocity components.'
    },
    {
      id: 'ssh',
      name: 'Sea Surface Height',
      unit: 'm',
      icon: <ArrowUpDown size={14} color="#ffb800" />,
      desc: 'Sea surface elevation anomaly (surface z = 0m)',
      storyTitle: 'SEA SURFACE HEIGHT ANOMALY',
      storyText: 'Modeled sea-surface height anomaly/elevation from HYCOM surf_el.'
    }
  ];

  const activeVar = variables.find(v => v.id === selectedVariable) || variables[0];

  const depthContext = selectedVariable === 'ssh'
    ? 'SURFACE ONLY (z = 0m)'
    : `${currentDepth} m`;

  return (
    <div className="glass-panel" style={{ pointerEvents: 'auto' }}>
      <div className="panel-header">
        <span className="panel-title">Model Variables</span>
        {variableRange && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-cyan)' }}>
            [{variableRange.min} — {variableRange.max} {variableRange.units}]
          </span>
        )}
      </div>

      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Active Variable & Spatiotemporal Context Banner */}
        <div className="active-variable-banner">
          <div className="active-var-title">ACTIVE: {activeVar.storyTitle}</div>
          <div className="active-var-meta">
            <span>Depth: <strong>{depthContext}</strong></span>
            <span className="dot-divider">•</span>
            <span>Time: <strong>{currentTimeLabel}</strong></span>
          </div>
        </div>

        {/* Variable Selection Buttons */}
        <div className="var-tabs-grid">
          {variables.map((v) => {
            const isActive = selectedVariable === v.id;
            return (
              <button
                key={v.id}
                className={`var-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => onSelectVariable(v.id)}
                title={v.desc}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {v.icon}
                  <span className="var-tab-name">{v.name}</span>
                </div>
                <span className="var-tab-unit">{v.unit}</span>
              </button>
            );
          })}
        </div>

        {/* Phase 3D Requirement 4: Lightweight Variable Story Card */}
        <div className="variable-story-card">
          <div className="story-card-header">
            <Info size={11} color="var(--accent-cyan)" />
            <span className="story-card-title">{activeVar.name} Story</span>
          </div>
          <div className="story-card-body">
            "{activeVar.storyText}"
          </div>
        </div>
      </div>
    </div>
  );
};
