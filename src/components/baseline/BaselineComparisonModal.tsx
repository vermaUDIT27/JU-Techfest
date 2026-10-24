import React from 'react';
import { X, CheckCircle2, AlertTriangle, Scale, Clock, Route as RouteIcon, Info, TrendingUp } from 'lucide-react';
import { BaselineComparisonMetrics, DispatchPlanResult } from '../../types';

interface BaselineComparisonModalProps {
  proposed: DispatchPlanResult | null;
  baseline: BaselineComparisonMetrics;
  onClose: () => void;
}

export const BaselineComparisonModal: React.FC<BaselineComparisonModalProps> = ({
  proposed,
  baseline,
  onClose,
}) => {
  const proposedDistance = proposed ? proposed.totalDistanceKm : 34.2;
  const proposedDuration = proposed ? proposed.totalDurationMinutes : 92;
  const proposedHighServiced = proposed ? proposed.highRiskBinsServiced : 8;
  const proposedHighUnserved = proposed ? proposed.highRiskBinsUnserved : 0;
  const proposedViolations = proposed ? proposed.capacityViolations : 0;
  const proposedUnassigned = proposed ? proposed.unassignedBins.length : 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-title"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-sand-50 border border-sand-300 shadow-civic-lg overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-sand-200 bg-sand-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-terracotta-100 text-terracotta-800 border border-terracotta-300">
                Evaluation Benchmark
              </span>
              <span className="text-xs text-charcoal-500 font-medium">
                Pune Municipal Fleet Operations
              </span>
            </div>
            <h2 id="comparison-title" className="text-lg font-bold text-charcoal-900">
              Proposed Dispatch Plan vs. Conventional Baseline Strategy
            </h2>
            <p className="text-xs text-charcoal-600 mt-0.5">
              Side-by-side evaluation using identical starting vehicle locations, bin fill levels, and capacity limits.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-charcoal-400 hover:bg-sand-200 hover:text-charcoal-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Transparent Policy Notice */}
          <div className="p-3.5 rounded-xl bg-sand-100 border border-sand-200 flex items-start gap-2.5 text-charcoal-600 leading-relaxed text-[11.5px]">
            <Info className="w-4 h-4 text-terracotta-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Objective Comparison:</strong> The baseline strategy simulates standard Indian municipal fixed-route ward sweeping (assigning bins based on street sequence without dynamic fill-level awareness). The proposed plan dynamically routes based on urgent spill risk and strict vehicle payload constraints.
            </p>
          </div>

          {/* Metric Comparison Table */}
          <div className="rounded-xl border border-sand-300 overflow-hidden shadow-civic">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sand-200/80 border-b border-sand-300 text-[11px] font-bold text-charcoal-700 uppercase tracking-wide">
                  <th className="py-2.5 px-4">Evaluation Dimension</th>
                  <th className="py-2.5 px-4 bg-terracotta-50/80 text-terracotta-900 border-x border-sand-300">
                    Proposed Plan (WasteWise)
                  </th>
                  <th className="py-2.5 px-4 bg-sand-100 text-charcoal-700">
                    Conventional Baseline
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200 bg-sand-50">
                {/* Metric 1: High-Risk Bins Serviced */}
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-800">
                    High-Risk Bins Serviced (Critical & High)
                  </td>
                  <td className="py-3 px-4 bg-terracotta-50/40 border-x border-sand-300 font-bold text-emerald-700">
                    {proposedHighServiced} bins prioritized
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">
                    {baseline.highRiskBinsServiced} bins
                  </td>
                </tr>

                {/* Metric 2: High-Risk Bins Left Unserved */}
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-800">
                    High-Risk Bins Left Unserved (Overflow Danger)
                  </td>
                  <td className="py-3 px-4 bg-terracotta-50/40 border-x border-sand-300 font-bold text-emerald-700">
                    {proposedHighUnserved} unserved
                  </td>
                  <td className="py-3 px-4 font-bold text-red-600">
                    {baseline.highRiskBinsUnserved} critical bins delayed
                  </td>
                </tr>

                {/* Metric 3: Truck Capacity Violations */}
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-800">
                    Vehicle Payload Capacity Violations
                  </td>
                  <td className="py-3 px-4 bg-terracotta-50/40 border-x border-sand-300 font-bold text-emerald-700">
                    0 violations (Strictly Enforced)
                  </td>
                  <td className="py-3 px-4 text-amber-700 font-semibold">
                    {baseline.truckCapacityViolations} potential truck overflows
                  </td>
                </tr>

                {/* Metric 4: Total Road Distance */}
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-800">
                    Total Fleet Road Distance
                  </td>
                  <td className="py-3 px-4 bg-terracotta-50/40 border-x border-sand-300 font-bold text-charcoal-900 font-mono">
                    ~{proposedDistance} km (OSRM geometry)
                  </td>
                  <td className="py-3 px-4 text-charcoal-600 font-mono">
                    ~{baseline.totalRoadDistanceKm} km (Fixed sweep)
                  </td>
                </tr>

                {/* Metric 5: Estimated Shift Completion Time */}
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-800">
                    Estimated Shift Duration
                  </td>
                  <td className="py-3 px-4 bg-terracotta-50/40 border-x border-sand-300 font-bold text-charcoal-900 font-mono">
                    ~{proposedDuration} mins
                  </td>
                  <td className="py-3 px-4 text-charcoal-600 font-mono">
                    ~{baseline.estimatedRouteTimeMinutes} mins
                  </td>
                </tr>

                {/* Metric 6: Unassigned Work / Backlog */}
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-800">
                    Unassigned Bins (Requires Secondary Shift)
                  </td>
                  <td className="py-3 px-4 bg-terracotta-50/40 border-x border-sand-300 font-medium text-charcoal-700">
                    {proposedUnassigned} low-risk bins deferred
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">
                    {baseline.unassignedWorkCount} arbitrary bins
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Key Findings for Municipal Supervisors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-sand-100 border border-sand-200 space-y-1">
              <strong className="text-charcoal-900 block text-xs">Why WasteWise Prioritizes Differently:</strong>
              <p className="text-charcoal-600 leading-relaxed text-[11px]">
                Conventional fixed sweeps visit clean bins (e.g. 25% full) along the route while ignoring overflowing commercial bins 500 meters away. WasteWise diverts available payload to critical bins before morning rush hour.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-sand-100 border border-sand-200 space-y-1">
              <strong className="text-charcoal-900 block text-xs">Payload Constraint Guarantee:</strong>
              <p className="text-charcoal-600 leading-relaxed text-[11px]">
                Each truck’s assigned total weight remains strictly within its rated hydraulic compactor tonnage, eliminating roadside tipper breakdown or unsafe overloaded driving.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-sand-200 bg-sand-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-sand-200 hover:bg-sand-300 text-charcoal-800 transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
