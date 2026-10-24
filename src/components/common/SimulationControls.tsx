import React from 'react';
import { Play, Pause, RotateCcw, FastForward, StepForward, AlertCircle } from 'lucide-react';

interface SimulationControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: 1 | 2 | 5;
  onChangeSpeed: (speed: 1 | 2 | 5) => void;
  onStepForward: () => void;
  onResetDemo: () => void;
  className?: string;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isPlaying,
  onTogglePlay,
  speed,
  onChangeSpeed,
  onStepForward,
  onResetDemo,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 flex-wrap text-xs ${className}`}>
      {/* Persistent Demo Simulation Badge */}
      <div 
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ochre-100 text-ochre-900 border border-ochre-300 font-bold select-none text-[11px]"
        title="All dustbin fill levels and truck movements are synthetically generated for testing"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ochre-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-ochre-600"></span>
        </span>
        <span className="tracking-wide">FLEET DISPATCH SIMULATION</span>
      </div>

      {/* Play / Pause Toggle */}
      <button
        type="button"
        onClick={onTogglePlay}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors border shadow-civic ${
          isPlaying
            ? 'bg-amber-600 hover:bg-amber-700 text-sand-50 border-amber-700'
            : 'bg-sage-600 hover:bg-sage-700 text-sand-50 border-sage-700'
        }`}
        title={isPlaying ? 'Pause truck road movement simulation' : 'Start simulating truck movement along roads'}
      >
        {isPlaying ? (
          <>
            <Pause className="w-3.5 h-3.5" />
            <span>Pause</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" />
            <span>Simulate Fleet</span>
          </>
        )}
      </button>

      {/* Manual Step Forward */}
      <button
        type="button"
        onClick={onStepForward}
        className="p-1.5 rounded-lg bg-sand-100 hover:bg-sand-200 text-charcoal-700 border border-sand-300 transition-colors shadow-civic"
        title="Advance simulation by 1 step"
      >
        <StepForward className="w-3.5 h-3.5" />
      </button>

      {/* Speed Controls: 1x, 2x, 5x */}
      <div className="flex items-center bg-sand-100 rounded-lg border border-sand-300 p-0.5 shadow-civic">
        {([1, 2, 5] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChangeSpeed(s)}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
              speed === s
                ? 'bg-terracotta-600 text-sand-50 shadow-xs'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Reset Simulation Demo Button */}
      <button
        type="button"
        onClick={onResetDemo}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sand-100 hover:bg-sand-200 text-charcoal-700 border border-sand-300 transition-colors shadow-civic font-medium"
        title="Reset all trucks, bins and routes to pristine starting demo scenario"
      >
        <RotateCcw className="w-3 h-3 text-terracotta-600" />
        <span>Reset Baseline</span>
      </button>
    </div>
  );
};
