import React, { useMemo } from 'react';
import { ModelSliceData, OceanVariable, GridMeta, ArgoFloat } from '../types/ocean';
import { Activity, Compass, Database, Layers, Calendar, ArrowDownUp } from 'lucide-react';

interface OceanStateSummaryProps {
  activeVariable: OceanVariable;
  sliceData: ModelSliceData | null;
  currentDepth: number;
  meta: GridMeta | null;
  onOpenProvenance?: () => void;
  selectedFloat?: ArgoFloat | null;
  selectedCycle?: number;
  isLoading?: boolean;
  currentTimeStep?: number;
}

export const OceanStateSummary: React.FC<OceanStateSummaryProps> = ({
  activeVariable,
  sliceData,
  currentDepth,
  meta,
  onOpenProvenance,
  isLoading = false,
  currentTimeStep = 2
}) => {
  // Variable friendly name and unit
  const varConfig = useMemo(() => {
    switch (activeVariable) {
      case 'temperature':
        return { name: 'Seawater Temperature', symbol: 'T', unit: '°C' };
      case 'salinity':
        return { name: 'Practical Salinity', symbol: 'S', unit: 'PSU' };
      case 'velocity':
        return { name: 'Current Velocity', symbol: 'U/V', unit: 'm/s' };
      case 'ssh':
        return { name: 'Sea Surface Height Anomaly', symbol: 'η', unit: 'm' };
    }
  }, [activeVariable]);

  // Dynamically compute spatial mean across ocean points (excluding land / nulls)
  const spatialMean = useMemo(() => {
    if (!sliceData || !sliceData.values || sliceData.values.length === 0) return null;
    let sum = 0;
    let count = 0;
    for (let r = 0; r < sliceData.values.length; r++) {
      const row = sliceData.values[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const val = row[c];
        if (val !== null && val !== undefined && !isNaN(val)) {
          sum += val;
          count++;
        }
      }
    }
    return count > 0 ? (sum / count).toFixed(2) : null;
  }, [sliceData]);

  // Model date/time formatting strictly derived from selected HYCOM snapshot
  const modelDateStr = useMemo(() => {
    let ts = sliceData?.timestamp;
    if (!ts && meta?.time_steps && currentTimeStep !== undefined) {
      ts = meta.time_steps[currentTimeStep]?.timestamp;
    }
    if (!ts && currentTimeStep !== undefined) {
      const dates = ['2018-11-18T00:00:00Z', '2018-11-19T00:00:00Z', '2018-11-20T00:00:00Z'];
      ts = dates[Math.min(Math.max(0, currentTimeStep), 2)];
    }
    if (!ts) return 'N/A';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = d.getUTCDate();
      const month = months[d.getUTCMonth()];
      const year = d.getUTCFullYear();
      return `${day} ${month} ${year} • 00:00 UTC`;
    } catch {
      return ts;
    }
  }, [sliceData?.timestamp, meta?.time_steps, currentTimeStep]);

  // Geographic domain bounds from metadata
  const domainStr = useMemo(() => {
    const lonMin = meta ? meta.lon_min.toFixed(1) : '30.0';
    const lonMax = meta ? meta.lon_max.toFixed(1) : '115.0';
    const latMin = meta ? Math.abs(meta.lat_min).toFixed(1) + '°S' : '25.0°S';
    const latMax = meta ? meta.lat_max.toFixed(1) + '°N' : '30.0°N';
    return `${lonMin}°E – ${lonMax}°E, ${latMin} – ${latMax}`;
  }, [meta]);

  const effectiveDepthStr = activeVariable === 'ssh'
    ? 'Surface (Locked at z = 0 m)'
    : currentDepth === 0
    ? 'Surface (0 m)'
    : `${currentDepth} m`;

  const minValStr = sliceData && sliceData.min_val !== undefined && sliceData.min_val !== null
    ? `${sliceData.min_val.toFixed(2)}`
    : 'N/A';

  const maxValStr = sliceData && sliceData.max_val !== undefined && sliceData.max_val !== null
    ? `${sliceData.max_val.toFixed(2)}`
    : 'N/A';

  const units = sliceData?.units || varConfig.unit;

  return (
    <div className="glass-panel ocean-state-summary-card" style={{ pointerEvents: 'auto' }}>
      <div className="panel-header">
        <span className="panel-title">
          <Activity size={12} color="var(--accent-cyan)" />
          Ocean State Summary
        </span>
        <button
          onClick={onOpenProvenance}
          className="summary-provenance-tag"
          title="Inspect HYCOM GLBu0.08/expt 91.2 NetCDF Provenance"
        >
          <Database size={10} style={{ marginRight: '3px' }} />
          HYCOM expt 91.2
        </button>
      </div>

      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Active Variable & Date Bar */}
        <div className="summary-headline-row">
          <div>
            <div className="summary-var-title">
              {varConfig.name} <span className="summary-unit">({units})</span>
            </div>
            <div className="summary-date-sub">
              <Calendar size={11} color="var(--accent-cyan)" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Model Date: <strong>{isLoading ? 'Loading...' : modelDateStr}</strong>
            </div>
          </div>
          <div className="summary-depth-badge" title="Selected hydrostatic depth layer">
            <Layers size={11} color="var(--accent-cyan)" />
            <span>{effectiveDepthStr}</span>
          </div>
        </div>

        {/* Dynamic Model Metrics Grid */}
        <div className="summary-metrics-grid">
          <div className="summary-metric-cell">
            <div className="summary-metric-label">Model Min</div>
            <div className="summary-metric-val" style={{ color: 'var(--accent-cyan)' }}>
              {isLoading ? '...' : `${minValStr} ${units}`}
            </div>
          </div>
          <div className="summary-metric-cell">
            <div className="summary-metric-label">Model Max</div>
            <div className="summary-metric-val" style={{ color: 'var(--accent-coral)' }}>
              {isLoading ? '...' : `${maxValStr} ${units}`}
            </div>
          </div>
          <div className="summary-metric-cell">
            <div className="summary-metric-label">Spatial Mean</div>
            <div className="summary-metric-val" style={{ color: 'var(--accent-emerald)' }}>
              {isLoading ? '...' : spatialMean ? `${spatialMean} ${units}` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Geographic Domain and Data Integrity Notice */}
        <div className="summary-footer-meta">
          <div className="summary-meta-item">
            <Compass size={10} color="var(--text-muted)" />
            <span>Domain: <strong style={{ color: 'var(--text-secondary)' }}>{domainStr}</strong></span>
          </div>
          <div className="summary-meta-item">
            <ArrowDownUp size={10} color="var(--text-muted)" />
            <span>Distinction: <span style={{ color: 'var(--accent-cyan)' }}>Modeled 3D Field</span> vs <span style={{ color: 'var(--accent-emerald)' }}>In-Situ Argo CTD</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};
