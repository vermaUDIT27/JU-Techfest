import React from 'react';
import { BinRecord, TruckRecord, DispatchPlanResult } from '../../types';
import { 
  Shield, 
  AlertTriangle, 
  Truck, 
  CheckCircle2, 
  Clock, 
  Scale, 
  TrendingUp, 
  Layers, 
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { RISK_COLORS } from '../../services/riskEngine';

interface MunicipalHeadViewProps {
  bins: BinRecord[];
  trucks: TruckRecord[];
  dispatchPlan: DispatchPlanResult | null;
  onOpenBaselineCompare: () => void;
  onSelectBin: (bin: BinRecord) => void;
}

export const MunicipalHeadView: React.FC<MunicipalHeadViewProps> = ({
  bins,
  trucks,
  dispatchPlan,
  onOpenBaselineCompare,
  onSelectBin,
}) => {
  const totalBins = bins.length;
  const criticalBins = bins.filter((b) => b.riskCategory === 'critical');
  const highRiskBins = bins.filter((b) => b.riskCategory === 'critical' || b.riskCategory === 'high');
  const collectedBins = bins.filter((b) => b.collectionStatus === 'collected');
  const unableBins = bins.filter((b) => b.collectionStatus === 'unable_to_collect');

  const progressPercent = totalBins > 0 ? Math.round((collectedBins.length / totalBins) * 100) : 0;

  const activeTrucks = trucks.filter((t) => t.status !== 'Offline');
  const assignedTrucks = trucks.filter((t) => t.assignedBinIds.length > 0 && t.status !== 'Offline');
  const availableTrucks = trucks.filter((t) => t.status === 'Available');

  const totalFleetCapacityKg = activeTrucks.reduce((sum, t) => sum + t.capacityKg, 0);
  const totalAllocatedLoadKg = activeTrucks.reduce((sum, t) => sum + t.currentLoadKg, 0);
  const fleetUtilizationPercent = totalFleetCapacityKg > 0
    ? Math.round((totalAllocatedLoadKg / totalFleetCapacityKg) * 100)
    : 0;

  // Unserved high-risk bins
  const unservedCritical = criticalBins.filter((b) => b.collectionStatus === 'unassigned');

  return (
    <div className="space-y-6">
      {/* Executive Municipal Header Banner */}
      <div className="p-5 rounded-2xl bg-sand-100 border border-sand-300 shadow-civic">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-terracotta-100 border border-terracotta-200 flex items-center justify-center text-terracotta-700 flex-shrink-0 mt-0.5">
              <Shield className="w-6 h-6 text-terracotta-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-charcoal-900 font-sans">
                  Jaipur Greater Municipal Corporation — Ward 84 Executive Overview
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sand-200 text-charcoal-700 uppercase border border-sand-300">
                  Municipal Head Console
                </span>
              </div>
              <p className="text-xs text-charcoal-600 mt-1 max-w-2xl leading-relaxed">
                Strategic oversight of collection progress, high-risk overflow hotspots, and multi-vehicle dispatch efficiency across Jagatpura arterials.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenBaselineCompare}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-terracotta-600 hover:bg-terracotta-700 text-white transition-colors shadow-civic flex-shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Compare Baseline Strategy</span>
          </button>
        </div>
      </div>

      {/* Ward Progress & Fleet Utilization Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Collection Progress */}
        <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 shadow-civic space-y-2">
          <div className="flex justify-between items-center text-xs text-charcoal-500">
            <span className="font-bold text-[11px] uppercase tracking-wide">Shift Collection Progress</span>
            <span className="font-mono font-bold text-charcoal-800">{collectedBins.length} / {totalBins} Bins</span>
          </div>

          <div className="text-2xl font-bold text-charcoal-900 font-sans">
            {progressPercent}% <span className="text-xs font-normal text-charcoal-500">Completed</span>
          </div>

          <div className="w-full bg-sand-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="text-[10.5px] text-charcoal-400 block">
            {totalBins - collectedBins.length} bins pending service in Jagatpura
          </span>
        </div>

        {/* Metric 2: Critical Bins Status */}
        <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 shadow-civic space-y-2">
          <div className="flex justify-between items-center text-xs text-charcoal-500">
            <span className="font-bold text-[11px] uppercase tracking-wide text-red-700">Critical Risk Points (90–100%)</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800">Urgent</span>
          </div>

          <div className="text-2xl font-bold text-red-600 font-sans">
            {criticalBins.length} <span className="text-xs font-normal text-charcoal-500">Total Bins</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-charcoal-600 pt-1">
            <span>Serviced: <strong>{criticalBins.filter((b) => b.collectionStatus === 'collected').length}</strong></span>
            <span className="text-red-700 font-bold">Unserved: {unservedCritical.length}</span>
          </div>
        </div>

        {/* Metric 3: Fleet Deployment */}
        <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 shadow-civic space-y-2">
          <div className="flex justify-between items-center text-xs text-charcoal-500">
            <span className="font-bold text-[11px] uppercase tracking-wide">Municipal Fleet Status</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800">8 Units</span>
          </div>

          <div className="text-2xl font-bold text-charcoal-900 font-sans">
            {assignedTrucks.length} <span className="text-xs font-normal text-charcoal-500">Assigned / {activeTrucks.length} Active</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-charcoal-600 pt-1">
            <span>Available: <strong>{availableTrucks.length}</strong></span>
            <span>Maintenance: <strong className="text-charcoal-400">1 unit</strong></span>
          </div>
        </div>

        {/* Metric 4: Total Payload Utilization */}
        <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 shadow-civic space-y-2">
          <div className="flex justify-between items-center text-xs text-charcoal-500">
            <span className="font-bold text-[11px] uppercase tracking-wide">Payload Capacity Used</span>
            <span className="font-mono font-bold text-charcoal-900">{fleetUtilizationPercent}%</span>
          </div>

          <div className="text-2xl font-bold text-charcoal-900 font-sans">
            ~{(totalAllocatedLoadKg / 1000).toFixed(1)} <span className="text-xs font-normal text-charcoal-500">Tons of {(totalFleetCapacityKg / 1000).toFixed(1)}T</span>
          </div>

          <div className="w-full bg-sand-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-terracotta-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${fleetUtilizationPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Critical Unserved Collection Points Advisory */}
      {unservedCritical.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-300 shadow-civic space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <h3 className="font-bold text-red-950 text-sm">
                High-Risk Unserved Collection Points Requiring Ward Supervisor Attention ({unservedCritical.length} Locations)
              </h3>
            </div>
            <span className="text-xs font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded">
              Overflow Hazard
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unservedCritical.map((bin) => (
              <div
                key={bin.id}
                onClick={() => onSelectBin(bin)}
                className="p-3 rounded-xl bg-white border border-red-200 shadow-xs cursor-pointer hover:border-red-400 transition-all text-xs space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-red-800">{bin.code}</span>
                  <span className="font-bold text-red-600">{bin.currentFillPercent}% Fill</span>
                </div>
                <h4 className="font-bold text-charcoal-900 leading-snug">{bin.name}</h4>
                <p className="text-[11px] text-charcoal-500 truncate">{bin.location.address}</p>
                <div className="text-[10.5px] text-red-800 pt-1 border-t border-red-100 leading-tight">
                  {bin.supervisorTradeoffReason.slice(0, 95)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fleet Utilization Table */}
      <div className="p-5 rounded-2xl bg-sand-50 border border-sand-300 shadow-civic space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sand-200 pb-3">
          <div>
            <h3 className="font-bold text-charcoal-900 text-base font-sans">
              Municipal Vehicle Allocation & Operational Status (Jagatpura Ward 84)
            </h3>
            <p className="text-xs text-charcoal-500">
              Live status of compactor tippers, current payload, and assigned road routes
            </p>
          </div>
          <span className="text-xs font-bold text-charcoal-600 bg-sand-100 px-3 py-1 rounded-lg border border-sand-200">
            Total Available Fleet: {activeTrucks.length} Trucks
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sand-100 border-b border-sand-200 text-[11px] font-bold text-charcoal-600 uppercase tracking-wide">
                <th className="py-2.5 px-3">Vehicle ID</th>
                <th className="py-2.5 px-3">Driver & Contact</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Payload Utilization</th>
                <th className="py-2.5 px-3">Assigned Stops</th>
                <th className="py-2.5 px-3">Home Depot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {trucks.map((truck) => {
                const remaining = Math.max(0, truck.capacityKg - truck.currentLoadKg);
                const loadPct = Math.min(100, Math.round((truck.currentLoadKg / truck.capacityKg) * 100));

                return (
                  <tr key={truck.id} className="hover:bg-sand-100/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: truck.color }}
                        />
                        <div>
                          <strong className="font-mono text-charcoal-900 block">{truck.id}</strong>
                          <span className="text-[10px] text-charcoal-500">{truck.name}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-medium text-charcoal-800 block">{truck.driverName}</span>
                      <span className="text-[10.5px] text-charcoal-500">{truck.driverPhone}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          truck.status === 'Available'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : truck.status === 'Collecting' || truck.status === 'En route'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : truck.status === 'Offline'
                            ? 'bg-charcoal-200 text-charcoal-700 border-charcoal-300'
                            : 'bg-sand-200 text-charcoal-700 border-sand-300'
                        }`}
                      >
                        {truck.status}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="space-y-1 w-36">
                        <div className="flex justify-between text-[10.5px]">
                          <span className="font-mono font-bold text-charcoal-900">{truck.currentLoadKg} kg</span>
                          <span className="text-charcoal-500">{loadPct}%</span>
                        </div>
                        <div className="w-full bg-sand-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              loadPct >= 90 ? 'bg-red-600' : loadPct >= 70 ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${loadPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-charcoal-400 block">Cap: {truck.capacityKg} kg</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-bold text-charcoal-800">
                        {truck.completedBinIds.length} / {truck.assignedBinIds.length} stops
                      </span>
                      {truck.assignedRoute && (
                        <span className="text-[10.5px] text-charcoal-500 block">
                          ~{truck.assignedRoute.totalDistanceKm} km road route
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-charcoal-600 text-[11px]">
                      {truck.depotName}
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
