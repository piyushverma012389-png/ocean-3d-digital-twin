import React from 'react';
import { DataProvenance } from '../types/ocean';
import { X, Database, CheckCircle2, AlertTriangle, Globe, Waves, Anchor, Info } from 'lucide-react';

interface ProvenanceModalProps {
  provenance: DataProvenance | null;
  onClose: () => void;
}

export const ProvenanceModal: React.FC<ProvenanceModalProps> = ({ provenance, onClose }) => {
  if (!provenance) return null;

  return (
    <div className="comparison-modal-backdrop" onClick={onClose}>
      <div className="comparison-modal-card provenance-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="comparison-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={18} color="var(--accent-cyan)" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                Scientific Data Provenance & Ingestion Directory
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Operational Datasets Verified for SIH26067 Indian Ocean Digital Twin
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} title="Close Provenance Panel">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="comparison-body" style={{ gap: '16px' }}>
          {/* Overview Banner */}
          <div style={{
            background: 'rgba(0, 240, 255, 0.06)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '11.5px',
            color: 'var(--text-primary)'
          }}>
            <Info size={18} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
            <span>
              All numerical hydrodynamic fields, seafloor bathymetry, and in-situ CTD profiles in this twin are parsed directly from authoritative oceanic NetCDF archives without interpolation fabrication.
            </span>
          </div>

          {/* Dataset Cards Grid */}
          <div className="provenance-grid">
            {/* HYCOM Card */}
            <div className="provenance-card">
              <div className="provenance-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Waves size={16} color="var(--accent-cyan)" />
                  <span className="provenance-card-title">{provenance.hycom.name}</span>
                </div>
                <span className={`provenance-auth-tag ${provenance.hycom.is_authentic ? 'authentic' : 'synthetic'}`}>
                  {provenance.hycom.is_authentic ? <><CheckCircle2 size={11} /> AUTHENTIC NETCDF</> : <><AlertTriangle size={11} /> SYNTHETIC FALLBACK</>}
                </span>
              </div>
              <div className="provenance-card-body">
                <div className="prov-row">
                  <span className="prov-key">Product:</span>
                  <span className="prov-val">{provenance.hycom.product}</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">Source Archive:</span>
                  <span className="prov-val">{provenance.hycom.source}</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">Spatial Domain:</span>
                  <span className="prov-val">{provenance.hycom.spatial_coverage}</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">Depth Coverage:</span>
                  <span className="prov-val">{provenance.hycom.depth_coverage}</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">Temporal Coverage:</span>
                  <span className="prov-val">{provenance.hycom.temporal_coverage}</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">Variables:</span>
                  <span className="prov-val">{provenance.hycom.variables.join(', ')}</span>
                </div>
              </div>
            </div>

            {/* GEBCO Card */}
            <div className="provenance-card">
              <div className="provenance-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={16} color="#00e5a3" />
                  <span className="provenance-card-title">{provenance.gebco.name}</span>
                </div>
                <span className={`provenance-auth-tag ${provenance.gebco.is_authentic ? 'authentic' : 'synthetic'}`}>
                  {provenance.gebco.is_authentic ? <><CheckCircle2 size={11} /> AUTHENTIC GEBCO</> : <><AlertTriangle size={11} /> SYNTHETIC FALLBACK</>}
                </span>
              </div>
              <div className="provenance-card-body">
                <div className="prov-row">
                  <span className="prov-key">Product:</span>
                  <span className="prov-val">{provenance.gebco.product}</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">Source Archive:</span>
                  <span className="prov-val">{provenance.gebco.source}</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">Spatial Domain:</span>
                  <span className="prov-val">{provenance.gebco.spatial_coverage}</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">Elevation Range:</span>
                  <span className="prov-val">{provenance.gebco.vertical_range}</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">Quality Control:</span>
                  <span className="prov-val">{provenance.gebco.qc}</span>
                </div>
              </div>
            </div>

            {/* Argo Card */}
            <div className="provenance-card">
              <div className="provenance-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Anchor size={16} color="#ffb800" />
                  <span className="provenance-card-title">{provenance.argo.name} WMO {provenance.argo.platform_wmo}</span>
                </div>
                <span className={`provenance-auth-tag ${provenance.argo.is_authentic ? 'authentic' : 'synthetic'}`}>
                  {provenance.argo.is_authentic ? <><CheckCircle2 size={11} /> AUTHENTIC ARGO</> : <><AlertTriangle size={11} /> SYNTHETIC FALLBACK</>}
                </span>
              </div>
              <div className="provenance-card-body">
                <div className="prov-row">
                  <span className="prov-key">Source Archive:</span>
                  <span className="prov-val">{provenance.argo.source}</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">Ascent Cycles:</span>
                  <span className="prov-val">{provenance.argo.cycles_available} historical cycles (Target: Cycle #{provenance.argo.target_cycle})</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">Synoptic Cycle Obs:</span>
                  <span className="prov-val">{provenance.argo.observation_time}</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">Location:</span>
                  <span className="prov-val">{provenance.argo.location}</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">Depth Range:</span>
                  <span className="prov-val">{provenance.argo.depth_range} ({provenance.argo.qc_levels} collocated levels)</span>
                </div>
                <div className="prov-row">
                  <span className="prov-key">QC Filtering:</span>
                  <span className="prov-val">{provenance.argo.qc_flags}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
