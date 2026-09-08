import { Waves, Activity, RefreshCw, Database, BookOpen, Maximize2, Minimize2 } from 'lucide-react';
import { DataProvenance } from '../types/ocean';

interface NavbarProps {
  isBackendConnected: boolean;
  activeLayersCount: number;
  onResetCamera: () => void;
  onOpenComparison: () => void;
  selectedFloatId: string | null;
  provenance: DataProvenance | null;
  onOpenProvenance: () => void;
  temporalStatus?: 'NEAR_SYNOPTIC' | 'TEMPORALLY_MISMATCHED';
  onToggleGuidedStory?: () => void;
  isGuidedStoryActive?: boolean;
  isPresentationMode?: boolean;
  onTogglePresentationMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onResetCamera,
  onOpenComparison,
  provenance,
  onOpenProvenance,
  temporalStatus,
  onToggleGuidedStory,
  isGuidedStoryActive = false,
  isPresentationMode = false,
  onTogglePresentationMode
}) => {
  const isHycomActive = provenance?.hycom.is_authentic ?? false;
  const isGebcoActive = provenance?.gebco.is_authentic ?? false;
  const isArgoActive = provenance?.argo.is_authentic ?? false;

  return (
    <header className="glass-panel navbar-header">
      {/* Scientific Header & Subtitle */}
      <div className="brand-section">
        <div className="brand-title">
          <Waves size={20} color="var(--accent-cyan)" />
          <span className="brand-heading">Ocean Digital Twin — Indian Ocean</span>
        </div>
        <div className="brand-subtitle">
          3D Numerical Model + In-Situ Observation Explorer
        </div>
      </div>

      {/* Live Data Sources Indicator */}
      <div
        className="data-sources-indicator"
        onClick={onOpenProvenance}
        title="Click to inspect authentic dataset provenance and scientific validation records"
      >
        <span className="sources-label">DATA SOURCES</span>
        <span className={`source-item ${isHycomActive ? 'authentic' : 'synthetic'}`}>
          {isHycomActive ? '✓' : '⚠'} HYCOM (3D + SSH)
        </span>
        <span className={`source-item ${isGebcoActive ? 'authentic' : 'synthetic'}`}>
          {isGebcoActive ? '✓' : '⚠'} GEBCO 2020
        </span>
        <span className={`source-item ${isArgoActive ? 'authentic' : 'synthetic'}`}>
          {isArgoActive ? '✓' : '⚠'} Argo
        </span>
      </div>

      {/* Nav Actions */}
      <div className="nav-actions">
        {/* Phase 3D: Guided Story Walkthrough */}
        {onToggleGuidedStory && (
          <button
            id="guided-story-toggle"
            className={`btn-story-mode ${isGuidedStoryActive ? 'active' : ''}`}
            onClick={onToggleGuidedStory}
            title="Start Guided Scientific Presentation Walkthrough"
          >
            <BookOpen size={14} />
            <span>Guided Story</span>
          </button>
        )}

        {/* Phase 4: SIH Presentation Mode Trigger */}
        {onTogglePresentationMode && (
          <button
            id="presentation-mode-toggle"
            className={`btn-story-mode ${isPresentationMode ? 'active' : ''}`}
            onClick={onTogglePresentationMode}
            title={isPresentationMode ? "Exit Presentation Mode" : "Enter Presentation Mode (Maximize 3D View)"}
            style={{
              borderColor: isPresentationMode ? 'var(--accent-cyan)' : 'var(--border-glass)',
              background: isPresentationMode ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)'
            }}
          >
            {isPresentationMode ? <Minimize2 size={14} color="var(--accent-cyan)" /> : <Maximize2 size={14} />}
            <span>{isPresentationMode ? 'Exit View' : 'Presentation'}</span>
          </button>
        )}

        {/* Model vs In-Situ Observation Action Button */}
        <button
          className="btn-compare-action"
          onClick={onOpenComparison}
          title="Open Collocated Model vs In-Situ Observation CTD Comparison"
        >
          <Activity size={15} color="var(--accent-emerald)" />
          <span style={{ fontWeight: 700 }}>MODEL vs OBSERVATION</span>
          {temporalStatus && (
            <span className={`sync-pill ${temporalStatus === 'NEAR_SYNOPTIC' ? 'synoptic' : 'mismatched'}`}>
              {temporalStatus === 'NEAR_SYNOPTIC' ? 'NEAR-SYNOPTIC' : 'TEMPORALLY MISMATCHED'}
            </span>
          )}
        </button>

        {/* Provenance Details Shortcut */}
        <button
          className="btn-icon"
          onClick={onOpenProvenance}
          title="Inspect Dataset Provenance & Product Metadata"
        >
          <Database size={15} />
        </button>

        {/* Reset Camera View */}
        <button
          className="btn-icon"
          onClick={onResetCamera}
          title="Reset Camera to Indian Ocean Basin View"
        >
          <RefreshCw size={15} />
        </button>
      </div>
    </header>
  );
};
