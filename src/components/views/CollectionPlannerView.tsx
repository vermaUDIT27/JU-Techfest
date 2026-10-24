import React, { useState } from 'react';
import { 
  ClipboardList, 
  Truck, 
  Scale, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  ArrowRight, 
  Info, 
  Sparkles, 
  Sliders, 
  CheckCircle2, 
  Radio, 
  ShieldAlert,
  Clock,
  Printer
} from 'lucide-react';
import { BinRecord } from '../../types';
import { ProvenanceSourceBanner } from '../common/SimulationBadge';

interface CollectionPlannerViewProps {
  bins: BinRecord[];
  onSelectBin: (bin: BinRecord) => void;
}

export const CollectionPlannerView: React.FC<CollectionPlannerViewProps> = ({
  bins,
  onSelectBin,
}) => {
  // Candidate bins pre-sorted by urgency
  const sortedCandidates = [...bins].sort((a, b) => {
    const priorityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityRank[b.riskCategory] - priorityRank[a.riskCategory] || b.currentFillPercent - a.currentFillPercent;
  });

  // State of selected bins for today's proposed shift
  const [selectedBinIds, setSelectedBinIds] = useState<string[]>([
    'WW-JGT-84-01', // Jagatpura Station Market
    'WW-JGT-84-02', // Ramnagariya Mandi
    'WW-JGT-84-03', // Jagatpura Overbridge
    'WW-JGT-84-05', // Mahal Road Commercial (Stale telemetry)
    'WW-JGT-84-09', // Bombay Hospital Link (Sensitive)
  ]);

  const [truckCapacityKg] = useState(4500); // 4.5 ton compactor tipper
  const [manifestNotes, setManifestNotes] = useState('Morning commercial & sensitive hospital arterial sweep. Includes Mahal Road bin based on predictive complaint overlay.');
  const [manifestGenerated, setManifestGenerated] = useState(false);

  const toggleBinSelection = (binId: string) => {
    setSelectedBinIds((prev) =>
      prev.includes(binId) ? prev.filter((id) => id !== binId) : [...prev, binId]
    );
  };

  const selectedBins = bins.filter((b) => selectedBinIds.includes(b.id));
  const deferredBins = bins.filter((b) => !selectedBinIds.includes(b.id));

  const totalAllocatedKg = selectedBins.reduce((sum, b) => sum + b.estimatedKg, 0);
  const capacityPercent = Math.min(100, Math.round((totalAllocatedKg / truckCapacityKg) * 100));

  return (
    <div className="space-y-6">
      {/* Simulation & Architecture Ready Banner */}
      <div className="p-4 rounded-2xl bg-sand-100 border border-sand-300 shadow-civic">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-charcoal-900 text-sm">
                Collection Manifest Staging & Trade-off Workspace
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sand-200 text-charcoal-700 uppercase border border-sand-300">
                Supervisor Staging Mode
              </span>
            </div>
            <p className="text-xs text-charcoal-600 mt-1 max-w-3xl leading-relaxed">
              Ward supervisors select and review candidates for upcoming collection shifts. The system highlights the operational consequences of including or deferring individual locations when data is incomplete.
            </p>
          </div>

          <div className="text-xs font-medium text-terracotta-800 bg-terracotta-50 px-3 py-2 rounded-xl border border-terracotta-200 flex-shrink-0">
            Route Optimization: Reserved for Phase 2
          </div>
        </div>
      </div>

      {/* Fleet Allocation & Payload Utilization Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Truck Specs */}
        <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 shadow-civic space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-charcoal-700 uppercase tracking-wide border-b border-sand-200 pb-2">
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-terracotta-600" />
              Assigned Municipal Vehicle
            </span>
            <span className="text-sage-700 bg-sage-100 px-2 py-0.5 rounded text-[10px]">
              Ready
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-charcoal-500">Vehicle Unit:</span>
              <strong className="text-charcoal-900 font-mono">RJ-14-GA-4821</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-500">Vehicle Type:</span>
              <span className="font-medium text-charcoal-800">Tata 1618 Hydraulic Compactor</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-500">Home Depot:</span>
              <span className="font-medium text-charcoal-800">Sector 26 Jagatpura Depot</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-500">Shift Window:</span>
              <span className="font-medium text-charcoal-800">06:00 - 10:30 IST</span>
            </div>
          </div>
        </div>

        {/* Payload Utilization Meter */}
        <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 shadow-civic space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between text-xs font-bold text-charcoal-700 uppercase tracking-wide border-b border-sand-200 pb-2">
            <span className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-terracotta-600" />
              Manifest Payload Utilization
            </span>
            <span className="text-xs font-mono font-bold text-charcoal-900">
              {totalAllocatedKg.toLocaleString()} / {truckCapacityKg.toLocaleString()} kg ({capacityPercent}%)
            </span>
          </div>

          <div>
            <div className="w-full bg-sand-200 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  capacityPercent > 90 ? 'bg-terracotta-600' : capacityPercent > 65 ? 'bg-ochre-500' : 'bg-sage-600'
                }`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-charcoal-500 mt-1.5">
              <span>{selectedBins.length} bins scheduled for this manifest</span>
              <span>Available payload reserve: {Math.max(0, truckCapacityKg - totalAllocatedKg).toLocaleString()} kg</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11.5px] text-charcoal-600">
              Status: {capacityPercent > 85 ? 'Optimally Loaded' : 'Capacity Available'}
            </div>
            <button
              type="button"
              onClick={() => setManifestGenerated(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-terracotta-600 hover:bg-terracotta-700 text-sand-50 transition-colors shadow-civic flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate Staging Manifest</span>
            </button>
          </div>
        </div>
      </div>

      {manifestGenerated && (
        <div className="p-4 rounded-xl bg-sage-50 border border-sage-300 text-xs text-sage-900 flex items-start justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-sage-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Staging Manifest Generated:</strong> Ward 84 Morning Shift manifest ready for review. Assigned 5 stops ({totalAllocatedKg} kg) to Driver Crew #4.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setManifestGenerated(false)}
            className="text-sage-700 hover:text-sage-900 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Candidate Staging List with Selection Checkboxes */}
      <div className="p-5 rounded-2xl bg-sand-50 border border-sand-300 shadow-civic space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sand-200 pb-3">
          <div>
            <h3 className="font-bold text-charcoal-900 text-base font-sans">
              Collection Candidate Selection & Trade-off Assessment
            </h3>
            <p className="text-xs text-charcoal-500">
              Check bins to include in today's manifest. Review trade-offs below each item.
            </p>
          </div>
          <div className="text-xs text-charcoal-500">
            Selected: <strong className="text-charcoal-900">{selectedBins.length}</strong> / {bins.length}
          </div>
        </div>

        <div className="space-y-3">
          {sortedCandidates.map((bin) => {
            const isSelected = selectedBinIds.includes(bin.id);
            const isCritical = bin.riskCategory === 'critical';
            const isStale = bin.dataFreshness.toLowerCase().includes('stale') || bin.dataFreshness.toLowerCase().includes('fault');

            return (
              <div
                key={bin.id}
                className={`p-4 rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-sand-100 border-terracotta-300 shadow-civic'
                    : 'bg-sand-50 border-sand-200 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleBinSelection(bin.id)}
                    className="mt-1 text-terracotta-600 hover:text-terracotta-700 flex-shrink-0"
                    aria-label={`Toggle selection for ${bin.name}`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-terracotta-600" />
                    ) : (
                      <Square className="w-5 h-5 text-sand-400" />
                    )}
                  </button>

                  {/* Bin Info & Decision Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-terracotta-700 bg-terracotta-100 px-2 py-0.5 rounded border border-terracotta-200">
                        {bin.code}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        bin.riskCategory === 'critical'
                          ? 'bg-red-600 text-sand-50 border-red-700'
                          : bin.riskCategory === 'high'
                          ? 'bg-orange-100 text-orange-800 border-orange-300'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}>
                        {bin.riskCategory}
                      </span>

                      {isStale && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-ochre-100 text-ochre-800 border border-ochre-300 flex items-center gap-1">
                          <Radio className="w-3 h-3 text-ochre-600" />
                          Stale Telemetry
                        </span>
                      )}

                      {bin.sensitiveZone && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          Sensitive Zone
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="font-bold text-charcoal-900 text-sm">
                        {bin.name}{' '}
                        <span className="text-xs text-charcoal-500 font-normal">
                          ({bin.hindiName})
                        </span>
                      </h4>
                      <div className="text-xs font-bold text-charcoal-800 flex-shrink-0">
                        {bin.currentFillPercent}% Fill • ~{bin.estimatedKg} kg
                      </div>
                    </div>

                    <p className="text-xs text-charcoal-500">
                      {bin.location.address} • {bin.location.landmark}
                    </p>

                    {/* Trade-off Rationale Box */}
                    <div className="mt-2 p-2.5 rounded-lg bg-sand-50 border border-sand-200 text-xs leading-relaxed">
                      <span className="font-bold text-charcoal-900 block mb-0.5 text-[11px]">
                        {isSelected ? 'Why Prioritized for Collection:' : 'Operational Context:'}
                      </span>
                      <span className="text-charcoal-700">
                        {bin.supervisorTradeoffReason}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Architecture-Ready Section: Future Multi-factor Route Optimization Integration */}
      <div className="p-5 rounded-2xl bg-sand-100 border border-sand-300 shadow-civic space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-terracotta-600" />
          <h4 className="font-bold text-charcoal-900 text-sm">
            Architecture-Ready: Explainable Risk Scoring & Route Trade-off Comparison
          </h4>
        </div>
        <p className="text-xs text-charcoal-600 leading-relaxed max-w-4xl">
          The WasteWise foundation has been architected to receive the <strong>Explainable Risk Engine</strong> in subsequent milestones. When integrated, the planner will calculate a multi-factor risk coefficient factoring in:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-sand-50 border border-sand-200 space-y-1">
            <span className="font-bold text-charcoal-800 block text-xs">1. Telemetry Uncertainty</span>
            <p className="text-charcoal-600 text-[11px] leading-relaxed">
              Penalizes stale or disconnected sensors by projecting worst-case accumulation curves based on day-of-week patterns.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-sand-50 border border-sand-200 space-y-1">
            <span className="font-bold text-charcoal-800 block text-xs">2. Civic Sensitivity Multiplier</span>
            <p className="text-charcoal-600 text-[11px] leading-relaxed">
              Weights hospital perimeters, temple pilgrim routes, and transit gates 1.8x higher to avoid public health risks.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-sand-50 border border-sand-200 space-y-1">
            <span className="font-bold text-charcoal-800 block text-xs">3. Baseline vs Proposed Comparison</span>
            <p className="text-charcoal-600 text-[11px] leading-relaxed">
              Compares conventional fixed-route servicing against priority-based dispatch, displaying explicit trade-offs.
            </p>
          </div>
        </div>
      </div>

      <ProvenanceSourceBanner />
    </div>
  );
};
