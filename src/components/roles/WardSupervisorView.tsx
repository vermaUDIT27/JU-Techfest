import React, { useState } from 'react';
import { 
  BinRecord, 
  TruckRecord, 
  DispatchPlanResult, 
  RiskLevel 
} from '../../types';
import { OperationsMap } from '../map/OperationsMap';
import { TruckDetailsPanel } from '../map/TruckDetailsPanel';
import { SimulationControls } from '../common/SimulationControls';
import { 
  Sparkles, 
  AlertTriangle, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  FileSpreadsheet, 
  Radio, 
  ShieldAlert, 
  ArrowRight,
  Filter,
  Search,
  RotateCcw
} from 'lucide-react';
import { getRiskBadgeClasses, getRiskLabel } from '../../services/riskEngine';

interface WardSupervisorViewProps {
  bins: BinRecord[];
  trucks: TruckRecord[];
  selectedBin: BinRecord | null;
  selectedTruck: TruckRecord | null;
  onSelectBin: (bin: BinRecord) => void;
  onSelectTruck: (truck: TruckRecord) => void;
  onGenerateDispatch: () => void;
  isGeneratingDispatch: boolean;
  dispatchPlan: DispatchPlanResult | null;
  onOpenBaselineCompare: () => void;
  onReassignBin: (binId: string, newTruckId: string | null) => void;
  // Simulation controls
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: 1 | 2 | 5;
  onChangeSpeed: (s: 1 | 2 | 5) => void;
  onStepForward: () => void;
  onResetDemo: () => void;
}

export const WardSupervisorView: React.FC<WardSupervisorViewProps> = ({
  bins,
  trucks,
  selectedBin,
  selectedTruck,
  onSelectBin,
  onSelectTruck,
  onGenerateDispatch,
  isGeneratingDispatch,
  dispatchPlan,
  onOpenBaselineCompare,
  onReassignBin,
  isPlaying,
  onTogglePlay,
  speed,
  onChangeSpeed,
  onStepForward,
  onResetDemo,
}) => {
  const [queueSearch, setQueueSearch] = useState('');
  const [queueRiskFilter, setQueueRiskFilter] = useState<'all' | RiskLevel>('all');

  // Sorted collection queue: Critical > High > Medium > Low
  const sortedBins = [...bins].sort((a, b) => {
    const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return rank[b.riskCategory] - rank[a.riskCategory] || b.currentFillPercent - a.currentFillPercent;
  });

  const filteredQueueBins = sortedBins.filter((b) => {
    if (queueRiskFilter !== 'all' && b.riskCategory !== queueRiskFilter) return false;
    if (queueSearch) {
      const q = queueSearch.toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        (b.hindiName && b.hindiName.includes(q)) ||
        (b.marathiName && b.marathiName.includes(q)) ||
        b.code.toLowerCase().includes(q) ||
        b.location.address.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const availableTrucks = trucks.filter((t) => t.status !== 'Offline');
  const criticalCount = bins.filter((b) => b.riskCategory === 'critical').length;
  const highCount = bins.filter((b) => b.riskCategory === 'high').length;

  return (
    <div className="space-y-5">
      {/* Top Operational Command Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-2xl bg-sand-100 border border-sand-300 shadow-civic">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-charcoal-900 font-sans">
              Jagatpura Ward 84 — Supervisor Command Console
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-terracotta-100 text-terracotta-800 border border-terracotta-200 uppercase">
              Operations Center
            </span>
          </div>
          <p className="text-xs text-charcoal-600 mt-0.5">
            Real-time interactive road GIS with moving collection trucks, risk-prioritized multi-truck dispatch, and manual stop reassignment.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <button
            type="button"
            onClick={onGenerateDispatch}
            disabled={isGeneratingDispatch}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-terracotta-600 hover:bg-terracotta-700 text-white transition-all shadow-civic disabled:opacity-50"
            title="Run risk-prioritized heuristic to allocate all bins to available trucks respecting capacity"
          >
            <Sparkles className={`w-4 h-4 ${isGeneratingDispatch ? 'animate-spin' : ''}`} />
            <span>{isGeneratingDispatch ? 'Computing Routes...' : 'Generate Multi-Truck Dispatch'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenBaselineCompare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-sand-200 hover:bg-sand-300 text-charcoal-800 border border-sand-300 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-terracotta-600" />
            <span className="hidden sm:inline">Compare Baseline</span>
          </button>
        </div>
      </div>

      {/* Simulation Controls Bar */}
      <div className="p-3 rounded-xl bg-sand-50 border border-sand-300 shadow-civic flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SimulationControls
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          speed={speed}
          onChangeSpeed={onChangeSpeed}
          onStepForward={onStepForward}
          onResetDemo={onResetDemo}
        />

        <div className="text-xs text-charcoal-500 font-medium">
          Active Fleet: <strong className="text-charcoal-800">{availableTrucks.length}</strong> Trucks | High-Risk Bins: <strong className="text-red-700">{criticalCount + highCount}</strong>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Side Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Real Leaflet Map */}
        <div className="lg:col-span-3">
          <OperationsMap
            bins={bins}
            trucks={trucks}
            selectedBin={selectedBin}
            selectedTruck={selectedTruck}
            onSelectBin={onSelectBin}
            onSelectTruck={onSelectTruck}
          />
        </div>

        {/* Side Details Inspector Drawer */}
        <div className="lg:col-span-1 space-y-4">
          {selectedTruck ? (
            <TruckDetailsPanel
              truck={selectedTruck}
              bins={bins}
              onClose={() => onSelectTruck(null as any)}
              onSelectBin={onSelectBin}
            />
          ) : selectedBin ? (
            <div className="p-4 rounded-2xl bg-sand-50 border border-sand-300 shadow-civic space-y-3 text-xs">
              <div className="flex items-start justify-between border-b border-sand-200 pb-2">
                <div>
                  <span className="font-mono text-xs font-bold text-terracotta-800 bg-terracotta-100 px-2 py-0.5 rounded border border-terracotta-200">
                    {selectedBin.code}
                  </span>
                  <h3 className="font-bold text-charcoal-900 text-sm mt-1">
                    {selectedBin.name}
                  </h3>
                  <p className="text-[11px] text-charcoal-500">{selectedBin.hindiName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectBin(null as any)}
                  className="p-1 rounded-lg text-charcoal-400 hover:bg-sand-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5 p-2.5 rounded-xl bg-sand-100 border border-sand-200">
                <div className="flex justify-between">
                  <span>Fill Level:</span>
                  <strong className="text-charcoal-900 font-bold">{selectedBin.currentFillPercent}% (~{selectedBin.estimatedKg} kg)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Risk Category:</span>
                  <span className={`px-2 py-0.2 rounded font-bold uppercase ${getRiskBadgeClasses(selectedBin.riskCategory)}`}>
                    {selectedBin.riskCategory}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Collection Status:</span>
                  <strong className="capitalize text-charcoal-800">{selectedBin.collectionStatus}</strong>
                </div>
              </div>

              {/* Manual Reassignment Dropdown */}
              <div className="space-y-1.5 pt-1">
                <label className="font-bold text-charcoal-700 block text-[11px]">
                  Manual Vehicle Reassignment:
                </label>
                <select
                  value={selectedBin.assignedTruckId || ''}
                  onChange={(e) => onReassignBin(selectedBin.id, e.target.value || null)}
                  className="w-full bg-sand-100 border border-sand-300 rounded-lg p-2 text-charcoal-800 font-medium focus:outline-none"
                >
                  <option value="">-- Unassigned (Do not collect) --</option>
                  {availableTrucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} ({t.driverName}) — Load: {t.currentLoadKg}/{t.capacityKg} kg
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 rounded-xl bg-terracotta-50 border border-terracotta-200 text-[11px] text-charcoal-700 leading-relaxed">
                <strong>Trade-off Rationale:</strong> {selectedBin.supervisorTradeoffReason}
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-sand-50 border border-sand-300 shadow-civic text-center space-y-3 text-xs">
              <div className="w-10 h-10 rounded-xl bg-sand-200 border border-sand-300 flex items-center justify-center text-terracotta-600 mx-auto">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-charcoal-800 text-sm">
                No Marker Selected
              </h4>
              <p className="text-charcoal-500 leading-relaxed text-[11px]">
                Click any dustbin or moving truck marker on the map to inspect vehicle capacity, heading direction, or reassign stops.
              </p>
              <div className="text-[10.5px] text-terracotta-800 bg-terracotta-50 p-2 rounded-lg border border-terracotta-200">
                Tip: Click <strong>Generate Multi-Truck Dispatch</strong> above to calculate automated routes.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Risk-Ranked Collection Queue Table */}
      <div className="p-5 rounded-2xl bg-sand-50 border border-sand-300 shadow-civic space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sand-200 pb-3">
          <div>
            <h3 className="font-bold text-charcoal-900 text-base font-sans">
              Risk-Ranked Ward Collection Queue (Jagatpura Ward 84)
            </h3>
            <p className="text-xs text-charcoal-500">
              Prioritized roster showing fill risk, estimated payload, and real-time vehicle assignments
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                placeholder="Search street, code, or landmark..."
                className="pl-8 pr-3 py-1.5 text-xs bg-sand-100 border border-sand-300 rounded-lg text-charcoal-800 placeholder-charcoal-400 focus:outline-none w-48 sm:w-60"
              />
            </div>

            <select
              value={queueRiskFilter}
              onChange={(e) => setQueueRiskFilter(e.target.value as any)}
              className="text-xs bg-sand-100 border border-sand-300 rounded-lg px-2.5 py-1.5 text-charcoal-700 font-medium focus:outline-none"
              aria-label="Filter Queue by Risk"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical Only (90–100%)</option>
              <option value="high">High Only (75–89%)</option>
              <option value="medium">Medium Only (50–74%)</option>
              <option value="low">Low Only (0–49%)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sand-100 border-b border-sand-200 text-[11px] font-bold text-charcoal-600 uppercase tracking-wide">
                <th className="py-2.5 px-3">Bin Code & Name</th>
                <th className="py-2.5 px-3">Fill % & Weight</th>
                <th className="py-2.5 px-3">Risk Level</th>
                <th className="py-2.5 px-3">Collection Status</th>
                <th className="py-2.5 px-3">Assigned Truck</th>
                <th className="py-2.5 px-3">Manual Reassignment</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {filteredQueueBins.map((bin) => {
                const assignedTruck = trucks.find((t) => t.id === bin.assignedTruckId);
                const isCollected = bin.collectionStatus === 'collected';

                return (
                  <tr key={bin.id} className="hover:bg-sand-100/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <span className="font-mono text-[10px] font-bold text-terracotta-800 bg-terracotta-100 px-1.5 py-0.2 rounded border border-terracotta-200">
                          {bin.code}
                        </span>
                        <h4 className="font-bold text-charcoal-900 leading-snug">{bin.name}</h4>
                        <p className="text-[10.5px] text-charcoal-500">{bin.hindiName} • {bin.location.landmark}</p>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <span className="font-bold text-charcoal-900 text-sm">
                          {isCollected ? '5%' : `${bin.currentFillPercent}%`}
                        </span>
                        <span className="text-charcoal-500 block text-[10.5px]">
                          ~{bin.estimatedKg} kg
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getRiskBadgeClasses(bin.riskCategory)}`}>
                        {bin.riskCategory}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          isCollected
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : bin.collectionStatus === 'assigned'
                            ? 'bg-sky-100 text-sky-800 border-sky-300'
                            : bin.collectionStatus === 'unable_to_collect'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-sand-200 text-charcoal-700 border-sand-300'
                        }`}
                      >
                        {bin.collectionStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {assignedTruck ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: assignedTruck.color }}
                          />
                          <span className="font-mono font-bold text-charcoal-800">{assignedTruck.id}</span>
                          <span className="text-[10px] text-charcoal-400 font-mono">#{bin.assignedStopOrder || 1}</span>
                        </div>
                      ) : (
                        <span className="text-charcoal-400 italic">None</span>
                      )}
                    </td>

                    {/* Manual Reassignment Dropdown on each row */}
                    <td className="py-3 px-3">
                      <select
                        value={bin.assignedTruckId || ''}
                        disabled={isCollected}
                        onChange={(e) => onReassignBin(bin.id, e.target.value || null)}
                        className="text-[11px] bg-sand-50 border border-sand-300 rounded px-2 py-1 text-charcoal-800 font-medium focus:outline-none disabled:opacity-50"
                      >
                        <option value="">-- Unassign --</option>
                        {availableTrucks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id} ({t.driverName})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectBin(bin)}
                        className="px-2.5 py-1 rounded-lg bg-sand-200 hover:bg-sand-300 text-charcoal-800 font-semibold text-[11px] transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
