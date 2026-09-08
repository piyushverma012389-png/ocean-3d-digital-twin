import React from 'react';
import { OceanVariable } from '../types/ocean';
import { Anchor, Clock, MapPin, CheckCircle, AlertTriangle, Activity, Database } from 'lucide-react';

interface ArgoStoryCardProps {
  selectedCycle: number;
  onCycleSwitch: (cycle: number) => void;
  activeVariable: OceanVariable;
  onOpenComparison: () => void;
  onOpenProvenance?: () => void;
  currentTimeStep: number;
}

export const ArgoStoryCard: React.FC<ArgoStoryCardProps> = ({
  selectedCycle,
  onCycleSwitch,
  activeVariable,
  onOpenComparison,
  onOpenProvenance,
  currentTimeStep
}) => {
  const isSynoptic = selectedCycle === 217 && currentTimeStep === 2;
  const isCycle217 = selectedCycle === 217;

  const timestampStr = isCycle217
    ? '20 Nov 2018 • 03:29 UTC'
    : '10 Mar 2019 • 03:49 UTC';

  const lagStr = isCycle217
    ? (currentTimeStep === 2 ? '+3h 29m (Near-Synoptic)' : currentTimeStep === 1 ? '+27h 29m' : '+51h 29m')
    : '+110 days (Mismatched)';

  const variableLabel = activeVariable === 'salinity' ? 'Salinity (PSU)' : 'Temperature (°C)';

  return (
    <div className="glass-panel argo-story-card" style={{ pointerEvents: 'auto' }}>
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Anchor size={13} color="var(--accent-emerald)" />
          <span className="panel-title" style={{ color: '#fff' }}>Argo In-Situ Observation</span>
        </div>
        <span className="argo-observation-tag">
          OBSERVED CTD
        </span>
      </div>

      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Float Header Identity */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.3px' }}>
              WMO Float 2902088
            </div>
            <div style={{ fontSize: '10px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              Apex Autonomous Profiling CTD Float
            </div>
          </div>
          <span className={`temporal-match-pill ${isSynoptic ? 'synoptic' : 'mismatched'}`}>
            {isSynoptic ? 'NEAR-SYNOPTIC' : 'MISMATCHED'}
          </span>
        </div>

        {/* Cycle Switcher Tabs */}
        <div className="argo-cycle-tabs">
          <button
            className={`argo-cycle-tab ${isCycle217 ? 'active' : ''}`}
            onClick={() => onCycleSwitch(217)}
            title="Cycle 217: Recorded 20 Nov 2018 (Near-synoptic baseline with HYCOM model)"
          >
            Cycle 217 (Synoptic Baseline)
          </button>
          <button
            className={`argo-cycle-tab ${!isCycle217 ? 'active' : ''}`}
            onClick={() => onCycleSwitch(228)}
            title="Cycle 228: Recorded 10 Mar 2019 (Temporally mismatched by ~110 days)"
          >
            Cycle 228 (Mismatched)
          </button>
        </div>

        {/* Observation Specifications Grid */}
        <div className="argo-specs-grid">
          <div className="argo-spec-item">
            <span className="argo-spec-label"><Clock size={9} style={{ marginRight: '3px' }} /> Observation Time</span>
            <span className="argo-spec-val">{timestampStr}</span>
          </div>
          <div className="argo-spec-item">
            <span className="argo-spec-label"><MapPin size={9} style={{ marginRight: '3px' }} /> Geographic Location</span>
            <span className="argo-spec-val">4.15°S, 86.00°E</span>
          </div>
          <div className="argo-spec-item">
            <span className="argo-spec-label"><CheckCircle size={9} style={{ marginRight: '3px' }} /> Valid QC Levels</span>
            <span className="argo-spec-val" style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>138 Levels (QC 1, 2)</span>
          </div>
          <div className="argo-spec-item">
            <span className="argo-spec-label">Depth Coverage</span>
            <span className="argo-spec-val">5.6 m – 1966.6 m</span>
          </div>
          <div className="argo-spec-item">
            <span className="argo-spec-label">Comparison Target</span>
            <span className="argo-spec-val" style={{ color: 'var(--accent-cyan)' }}>{variableLabel}</span>
          </div>
          <div className="argo-spec-item">
            <span className="argo-spec-label">Temporal Lag (Δt)</span>
            <span className="argo-spec-val" style={{ color: isSynoptic ? 'var(--accent-emerald)' : '#ffb800' }}>
              {lagStr}
            </span>
          </div>
        </div>

        {/* Explicit Caution if Cycle 228 is Active */}
        {!isCycle217 && (
          <div className="argo-mismatch-alert">
            <AlertTriangle size={12} color="#ffb800" style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              <strong>Temporal Mismatch:</strong> Cycle 228 was observed ~110 days after the HYCOM snapshot. Useful for multi-cycle profile comparison, not synoptic validation.
            </span>
          </div>
        )}

        {/* Action Buttons: Compare & Provenance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', marginTop: '2px' }}>
          <button
            className="btn-compare-argo-action"
            onClick={onOpenComparison}
            title="Open collocated vertical CTD profile comparison with HYCOM numerical model"
          >
            <Activity size={13} style={{ marginRight: '6px' }} />
            Compare with HYCOM
          </button>
          {onOpenProvenance && (
            <button
              className="btn-icon"
              onClick={onOpenProvenance}
              title="Inspect Argo GDAC NetCDF Dataset Provenance"
              style={{ width: '30px', height: '30px' }}
            >
              <Database size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
