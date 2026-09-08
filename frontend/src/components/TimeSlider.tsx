import React, { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, CheckCircle } from 'lucide-react';

interface TimeSliderProps {
  currentTimeStep: number;
  onTimeStepChange: (step: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  timeSteps?: Array<{ index: number; timestamp: string; label: string }>;
  isSynopticMatch?: boolean;
}

function formatDateLabel(isoStr: string): string {
  if (isoStr.startsWith('2018-11-18')) return 'Nov 18';
  if (isoStr.startsWith('2018-11-19')) return 'Nov 19';
  if (isoStr.startsWith('2018-11-20')) return 'Nov 20';
  return isoStr.slice(0, 10);
}

function formatFullDate(isoStr: string): string {
  if (isoStr.startsWith('2018-11-18')) return '18 Nov 2018 • 00:00 UTC';
  if (isoStr.startsWith('2018-11-19')) return '19 Nov 2018 • 00:00 UTC';
  if (isoStr.startsWith('2018-11-20')) return '20 Nov 2018 • 00:00 UTC';
  return isoStr;
}

export const TimeSlider: React.FC<TimeSliderProps> = ({
  currentTimeStep,
  onTimeStepChange,
  isPlaying,
  onTogglePlay,
  timeSteps = [
    { index: 0, timestamp: '2018-11-18T00:00:00Z', label: '18 Nov 2018' },
    { index: 1, timestamp: '2018-11-19T00:00:00Z', label: '19 Nov 2018' },
    { index: 2, timestamp: '2018-11-20T00:00:00Z', label: '20 Nov 2018' }
  ],
  isSynopticMatch = false
}) => {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        onTimeStepChange((currentTimeStep + 1) % timeSteps.length);
      }, 2400);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentTimeStep, timeSteps.length, onTimeStepChange]);

  const activeStep = timeSteps[currentTimeStep] || timeSteps[0];
  const dateFormatted = formatFullDate(activeStep.timestamp);

  // Time slice descriptions for Phase 3D storytelling
  const timeSlices = [
    { index: 0, day: 'Nov 18', role: 'PREVIOUS', note: 'Model T-2' },
    { index: 1, day: 'Nov 19', role: 'INTERMEDIATE', note: 'Model T-1' },
    { index: 2, day: 'Nov 20', role: 'CURRENT', note: 'Synoptic Baseline ★' }
  ];

  return (
    <div className="glass-panel" style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '14px', pointerEvents: 'auto' }}>
      {/* Play / Step Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <button
          className="btn-icon"
          title="Previous Model Day (Nov 18)"
          onClick={() => onTimeStepChange(Math.max(0, currentTimeStep - 1))}
          style={{ width: '30px', height: '30px' }}
        >
          <SkipBack size={13} />
        </button>

        <button
          className={`btn-icon ${isPlaying ? 'active' : ''}`}
          title={isPlaying ? 'Pause Simulation' : 'Play 4D Temporal Animation'}
          onClick={onTogglePlay}
          style={{ width: '34px', height: '34px' }}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
        </button>

        <button
          className="btn-icon"
          title="Next Model Day (Nov 20)"
          onClick={() => onTimeStepChange((currentTimeStep + 1) % timeSteps.length)}
          style={{ width: '30px', height: '30px' }}
        >
          <SkipForward size={13} />
        </button>
      </div>

      {/* Discrete Time-Slice Storytelling Buttons */}
      <div className="time-slice-story-group" style={{ display: 'flex', gap: '6px' }}>
        {timeSlices.map((ts) => {
          const isSelected = currentTimeStep === ts.index;
          const isSynopticBaseline = ts.index === 2;
          return (
            <button
              key={ts.index}
              className={`time-slice-btn ${isSelected ? 'active' : ''}`}
              onClick={() => onTimeStepChange(ts.index)}
              title={`${ts.day} 2018 (${ts.role}) — ${isSynopticBaseline ? 'Near-synoptic temporal match with Argo Float 2902088 Cycle 217' : 'Preceding model state'}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '3px 8px',
                borderRadius: '6px',
                border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isSelected ? 'rgba(0, 240, 255, 0.18)' : 'rgba(0, 0, 0, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '78px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '11px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#fff' : 'var(--text-secondary)' }}>
                  {ts.day}
                </span>
                {isSynopticBaseline && (
                  <span style={{ fontSize: '9px', color: 'var(--accent-emerald)' }}>★</span>
                )}
              </div>
              <span style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                {ts.role}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scrubber and Active Details */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={12} color="var(--accent-cyan)" />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff' }}>
              Model Date: <strong>{dateFormatted}</strong>
            </span>
            {isSynopticMatch && (
              <span className="synoptic-match-pill" title="Near-synoptic temporal collocation (<3.5h lag) with Argo Float 2902088 Cycle 217">
                <CheckCircle size={10} style={{ marginRight: '3px' }} />
                Synoptic Match
              </span>
            )}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: 'var(--accent-cyan)' }}>
            Snapshot {currentTimeStep + 1}/3
          </span>
        </div>

        <input
          type="range"
          className="custom-range"
          min={0}
          max={timeSteps.length - 1}
          step={1}
          value={currentTimeStep}
          onChange={(e) => onTimeStepChange(parseInt(e.target.value, 10))}
        />
      </div>
    </div>
  );
};
