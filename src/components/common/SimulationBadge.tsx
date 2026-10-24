import React from 'react';
import { AlertCircle, Info, Radio } from 'lucide-react';

interface SimulationBadgeProps {
  compact?: boolean;
  className?: string;
}

export const SimulationBadge: React.FC<SimulationBadgeProps> = ({
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ochre-100 text-ochre-800 border border-ochre-200 select-none ${className}`}
        title="Simulation Mode: Data is synthetically generated for supervisory testing in Pune"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ochre-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-ochre-600"></span>
        </span>
        <span>SIMULATION MODE</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sand-100 border border-sand-200 text-charcoal-700 text-xs shadow-civic ${className}`}>
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ochre-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-ochre-600"></span>
      </span>
      <div className="flex items-center gap-2">
        <span className="font-bold text-terracotta-700 tracking-wide text-[11px] uppercase">
          Simulation Active
        </span>
        <span className="text-sand-300">|</span>
        <span className="text-charcoal-600 text-[11px] font-medium hidden sm:inline">
          Pune PMC Pilot • Synthetic Telemetry
        </span>
      </div>
    </div>
  );
};

export const ProvenanceSourceBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-3 rounded-lg bg-sand-100 border border-sand-200 text-charcoal-600 text-xs flex items-start gap-2.5 ${className}`}>
      <Info className="w-4 h-4 text-terracotta-600 flex-shrink-0 mt-0.5" />
      <div className="space-y-0.5 leading-relaxed text-[11.5px]">
        <p>
          <strong className="text-charcoal-800">Source & Data Provenance:</strong> Real street geography and road topology courtesy of <strong>OpenStreetMap</strong>. Street bin telemetry, ultrasonic fill levels, and sensor heartbeat signals are operational records calibrated for Pune municipal conditions.
        </p>
        <p className="text-[11px] text-charcoal-500">
          No external hardware or sanitation worker GPS tracking is actively connected in this local deployment.
        </p>
      </div>
    </div>
  );
};
