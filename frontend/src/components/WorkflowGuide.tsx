import React, { useState } from 'react';
import { OceanVariable } from '../types/ocean';
import { Compass, Layers, Droplets, Anchor, Activity, ChevronRight, AlertTriangle, X, Check } from 'lucide-react';

interface WorkflowGuideProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
  selectedCycle?: number;
  onOpenComparison: () => void;
  onSwitchCycle: (cycle: number) => void;
  activeVariable: OceanVariable;
  currentDepth: number;
  selectedFloatId: string | null;
}

export const WorkflowGuide: React.FC<WorkflowGuideProps> = ({
  currentStep,
  onSelectStep,
  selectedCycle = 217,
  onOpenComparison,
  onSwitchCycle,
  activeVariable,
  currentDepth,
  selectedFloatId
}) => {
  const [showMismatchPrompt, setShowMismatchPrompt] = useState(false);

  const steps = [
    { id: 1, label: 'Explore Ocean', icon: <Compass size={11} /> },
    { id: 2, label: 'Select Depth', icon: <Layers size={11} /> },
    { id: 3, label: 'Select Variable', icon: <Droplets size={11} /> },
    { id: 4, label: 'Select Argo', icon: <Anchor size={11} /> },
    { id: 5, label: 'Compare HYCOM', icon: <Activity size={11} /> }
  ];

  const handleStepClick = (stepId: number) => {
    if (stepId === 5) {
      // If comparing and cycle is mismatched (Cycle 228), show prompt first
      if (selectedCycle === 228) {
        setShowMismatchPrompt(true);
        return;
      }
      onOpenComparison();
      onSelectStep(5);
    } else {
      onSelectStep(stepId);
    }
  };

  const handleProceedWithMismatch = () => {
    setShowMismatchPrompt(false);
    onOpenComparison();
    onSelectStep(5);
  };

  const handleSwitchToSynopticAndCompare = () => {
    setShowMismatchPrompt(false);
    onSwitchCycle(217);
    onOpenComparison();
    onSelectStep(5);
  };

  return (
    <>
      <div className="workflow-guide-bar" style={{ pointerEvents: 'auto' }}>
        <span className="workflow-title-label">WORKFLOW:</span>
        <div className="workflow-steps-container">
          {steps.map((s, idx) => {
            const isActive = currentStep === s.id;
            const isCompleted = currentStep > s.id;
            return (
              <React.Fragment key={s.id}>
                <button
                  className={`workflow-step-btn ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => handleStepClick(s.id)}
                  title={`Step ${s.id}: ${s.label}`}
                >
                  <span className="step-num">{s.id}</span>
                  <span className="step-icon">{s.icon}</span>
                  <span className="step-label">{s.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <ChevronRight size={11} className="workflow-arrow" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Cycle 228 Mismatch Warning Modal before comparison */}
      {showMismatchPrompt && (
        <div className="comparison-modal-backdrop" style={{ zIndex: 110 }} onClick={() => setShowMismatchPrompt(false)}>
          <div className="workflow-mismatch-modal" onClick={(e) => e.stopPropagation()}>
            <div className="workflow-mismatch-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="#ffb800" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                  TEMPORAL MISMATCH PRE-COMPARISON ADVISORY
                </span>
              </div>
              <button className="close-btn" onClick={() => setShowMismatchPrompt(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="workflow-mismatch-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5 }}>
                You have selected <strong style={{ color: '#fff' }}>Argo Float 2902088 • Cycle 228</strong> (observed on <strong>10 Mar 2019 • 03:49 UTC</strong>).
              </p>
              <div className="warning-callout" style={{ margin: '12px 0', padding: '10px 12px', background: 'rgba(255, 184, 0, 0.12)', border: '1px solid rgba(255, 184, 0, 0.35)', borderRadius: '6px' }}>
                <div style={{ color: '#ffb800', fontWeight: 700, fontSize: '11px', marginBottom: '4px' }}>
                  TEMPORAL OFFSET: +110 DAYS
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  The active HYCOM numerical model snapshot is dated <strong>20 Nov 2018</strong>. This comparison evaluates multi-cycle profile structure but is <strong>NOT</strong> a near-synoptic model verification.
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                Would you like to switch to near-synoptic Cycle 217 (20 Nov 2018, &Delta;t = 3.5h) or proceed with Cycle 228?
              </p>
            </div>

            <div className="workflow-mismatch-actions">
              <button
                className="btn-switch-synoptic"
                onClick={handleSwitchToSynopticAndCompare}
                style={{
                  background: 'rgba(0, 240, 255, 0.25)',
                  border: '1px solid var(--accent-cyan)',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Check size={13} color="var(--accent-cyan)" />
                Switch to Cycle 217 (Recommended Synoptic)
              </button>
              <button
                className="btn-proceed-mismatch"
                onClick={handleProceedWithMismatch}
                style={{
                  background: 'rgba(255, 184, 0, 0.15)',
                  border: '1px solid rgba(255, 184, 0, 0.4)',
                  color: '#ffb800',
                  borderRadius: '6px',
                  padding: '7px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Proceed with Cycle 228
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
