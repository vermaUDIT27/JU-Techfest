import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, 
  Truck, 
  Settings2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Weight, 
  Building2, 
  Compass, 
  RotateCcw,
  Info
} from 'lucide-react';
import { getAllWards, getAllZones, PUNE_DEPOTS } from '../../data/puneData';
import { 
  generatePunePlanningScenario, 
  DEFAULT_PLANNING_CONFIG 
} from '../../services/planningEngine';
import { PlanningScenarioConfig } from '../../types';

export const RoutePlanningView: React.FC = () => {
  const wards = useMemo(() => getAllWards(), []);
  const zones = useMemo(() => getAllZones(), []);

  const [config, setConfig] = useState<PlanningScenarioConfig>(DEFAULT_PLANNING_CONFIG);
  const [activeTab, setActiveTab] = useState<'allocations' | 'unassigned' | 'assumptions'>('allocations');

  // Compute planning scenario
  const planResult = useMemo(
    () => generatePunePlanningScenario(wards, config),
    [wards, config]
  );

  const handleResetConfig = () => {
    setConfig(DEFAULT_PLANNING_CONFIG);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="border-b border-monsoon-200 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-saffron-100 text-saffron-800 border border-saffron-200">
            Decision-Support Simulation
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sahyadri-100 text-sahyadri-800 border border-sahyadri-300">
            Proposed Scenario
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-basalt-900 mt-1 font-sans">
          Ward Workload & Route Planning Scenario Engine
        </h1>
        <p className="text-xs sm:text-sm text-basalt-600 mt-0.5">
          Formulate data-driven vehicle allocation scenarios based on reported ward waste tonnages. Configure fleet limits, vehicle capacity, and depot assignments.
        </p>
      </div>

      {/* Prominent Planning Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-monsoon-100 border border-monsoon-300 text-xs text-basalt-800 shadow-civic flex items-start gap-3">
        <Info className="w-5 h-5 text-saffron-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold text-basalt-900">
            Planning Framework Only — Data Limitations & Scope Notice:
          </strong>
          <span className="text-[11px] text-basalt-600 leading-relaxed block mt-0.5">
            The PMC master dataset supplies ward-level daily waste quantities (TPD), but does not contain individual street-level bin coordinates, road turn restrictions, or geocoded truck GPS telemetry. Therefore, this engine models <strong>macro-level vehicle workload feasibility</strong> and trip requirements. It does <em>not</em> claim real optimal street routing, turn-by-turn ETAs, or verified 100% door-to-door coverage.
          </span>
        </div>
      </div>

      {/* Scenario Configuration Controls Panel */}
      <div className="p-5 rounded-2xl bg-white border border-monsoon-200 shadow-civic space-y-4">
        <div className="flex items-center justify-between border-b border-monsoon-200 pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-saffron-600" />
            <h3 className="font-bold text-basalt-900 text-sm">
              Scenario Parameters Configuration
            </h3>
          </div>
          <button
            type="button"
            onClick={handleResetConfig}
            className="flex items-center gap-1 text-xs font-semibold text-basalt-500 hover:text-basalt-800"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Parameter 1: Available Vehicles */}
          <div>
            <label className="font-bold text-basalt-700 block mb-1">
              Assumed Fleet Count: <span className="text-saffron-700 font-mono text-sm">{config.availableVehiclesCount}</span>
            </label>
            <input
              type="range"
              min={20}
              max={300}
              step={5}
              value={config.availableVehiclesCount}
              onChange={(e) => setConfig({ ...config, availableVehiclesCount: Number(e.target.value) })}
              className="w-full accent-saffron-600"
            />
            <span className="text-[10px] text-basalt-500 block">
              Configurable pool of operational tippers
            </span>
          </div>

          {/* Parameter 2: Truck Payload Capacity */}
          <div>
            <label className="font-bold text-basalt-700 block mb-1">
              Vehicle Payload Capacity:
            </label>
            <select
              value={config.truckCapacityTonnes}
              onChange={(e) => setConfig({ ...config, truckCapacityTonnes: Number(e.target.value) })}
              className="w-full p-2 rounded-xl border border-monsoon-300 bg-monsoon-50 text-basalt-800 font-medium focus:ring-1 focus:ring-saffron-500 text-xs"
            >
              <option value={1.0}>1.0 Tonne (Chota Haati / Mini)</option>
              <option value={3.0}>3.0 Tonnes (Ghanta Gadi Medium)</option>
              <option value={5.0}>5.0 Tonnes (Tata 1618 Standard Compactor)</option>
              <option value={8.0}>8.0 Tonnes (Heavy Hydraulic Tipper)</option>
            </select>
            <span className="text-[10px] text-basalt-500 block mt-0.5">
              Target payload per collection trip
            </span>
          </div>

          {/* Parameter 3: Shift Duration & Service Time */}
          <div>
            <label className="font-bold text-basalt-700 block mb-1">
              Shift Duration:
            </label>
            <select
              value={config.shiftDurationHours}
              onChange={(e) => setConfig({ ...config, shiftDurationHours: Number(e.target.value) })}
              className="w-full p-2 rounded-xl border border-monsoon-300 bg-monsoon-50 text-basalt-800 font-medium focus:ring-1 focus:ring-saffron-500 text-xs"
            >
              <option value={6}>6 Hours (Single Peak Sweep)</option>
              <option value={8}>8 Hours (Standard Municipal Shift)</option>
              <option value={10}>10 Hours (Extended Operations)</option>
            </select>
            <span className="text-[10px] text-basalt-500 block mt-0.5">
              Service + transit window
            </span>
          </div>

          {/* Parameter 4: Target Zone Scope */}
          <div>
            <label className="font-bold text-basalt-700 block mb-1">
              Target Geographic Scope:
            </label>
            <select
              value={config.selectedZone}
              onChange={(e) => setConfig({ ...config, selectedZone: e.target.value })}
              className="w-full p-2 rounded-xl border border-monsoon-300 bg-monsoon-50 text-basalt-800 font-medium focus:ring-1 focus:ring-saffron-500 text-xs"
            >
              <option value="all">All 15 Administrative Zones (1,592 TPD)</option>
              {zones.map((z) => (
                <option key={z.zone_id} value={z.name}>
                  {z.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-basalt-500 block mt-0.5">
              Focus scenario on specific zone
            </span>
          </div>
        </div>
      </div>

      {/* Scenario Results Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        {/* Card 1: Total Workload */}
        <div className="p-4 rounded-2xl bg-white border border-monsoon-200 shadow-civic">
          <span className="text-[10px] font-bold uppercase text-basalt-500 block">Total Target Workload</span>
          <div className="text-xl sm:text-2xl font-black text-basalt-900 mt-1 font-mono">
            {planResult.totalWorkloadTpd} <span className="text-xs font-normal text-basalt-500">TPD</span>
          </div>
          <span className="text-[10px] text-basalt-500 mt-1 block">
            {planResult.totalTripsRequired} required trips
          </span>
        </div>

        {/* Card 2: Allocated Workload */}
        <div className="p-4 rounded-2xl bg-white border border-monsoon-200 shadow-civic">
          <span className="text-[10px] font-bold uppercase text-sahyadri-700 block">Allocated Workload</span>
          <div className="text-xl sm:text-2xl font-black text-sahyadri-800 mt-1 font-mono">
            {planResult.allocatedWorkloadTpd} <span className="text-xs font-normal text-basalt-500">TPD</span>
          </div>
          <span className="text-[10px] text-sahyadri-700 mt-1 block">
            {Math.round((planResult.allocatedWorkloadTpd / (planResult.totalWorkloadTpd || 1)) * 100)}% workload served
          </span>
        </div>

        {/* Card 3: Unassigned Workload */}
        <div className="p-4 rounded-2xl bg-white border border-monsoon-200 shadow-civic">
          <span className="text-[10px] font-bold uppercase text-amber-700 block">Unassigned Workload</span>
          <div className="text-xl sm:text-2xl font-black text-amber-800 mt-1 font-mono">
            {planResult.unassignedWorkloadTpd} <span className="text-xs font-normal text-basalt-500">TPD</span>
          </div>
          <span className="text-[10px] text-amber-700 mt-1 block">
            {planResult.unassignedWards.length} wards with unserved tonnage
          </span>
        </div>

        {/* Card 4: Fleet Balance */}
        <div className="p-4 rounded-2xl bg-white border border-monsoon-200 shadow-civic">
          <span className="text-[10px] font-bold uppercase text-basalt-500 block">Fleet Needed vs Pool</span>
          <div className="text-xl sm:text-2xl font-black text-basalt-900 mt-1 font-mono">
            {planResult.vehiclesNeeded} <span className="text-xs font-normal text-basalt-500">/ {planResult.vehiclesAvailable} v</span>
          </div>
          <span className="text-[10px] mt-1 block font-bold">
            {planResult.deficitVehicles > 0 ? (
              <span className="text-amber-700">Deficit: {planResult.deficitVehicles} vehicles</span>
            ) : (
              <span className="text-emerald-700">Surplus: {planResult.vehiclesAvailable - planResult.vehiclesNeeded} vehicles</span>
            )}
          </span>
        </div>
      </div>

      {/* Tabs for Allocations vs Unassigned vs Assumptions */}
      <div className="flex items-center gap-2 border-b border-monsoon-200 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('allocations')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
            activeTab === 'allocations'
              ? 'bg-basalt-800 text-white'
              : 'bg-monsoon-100 text-basalt-700 hover:bg-monsoon-200'
          }`}
        >
          Proposed Ward Allocations ({planResult.allocations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('unassigned')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
            activeTab === 'unassigned'
              ? 'bg-amber-700 text-white'
              : 'bg-monsoon-100 text-basalt-700 hover:bg-monsoon-200'
          }`}
        >
          Unassigned Workload ({planResult.unassignedWards.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assumptions')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
            activeTab === 'assumptions'
              ? 'bg-basalt-700 text-white'
              : 'bg-monsoon-100 text-basalt-700 hover:bg-monsoon-200'
          }`}
        >
          Model Assumptions ({planResult.assumptions.length})
        </button>
      </div>

      {/* Tab 1: Proposed Allocations Table */}
      {activeTab === 'allocations' && (
        <div className="bg-white rounded-2xl border border-monsoon-200 shadow-civic overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-monsoon-100 text-basalt-600 uppercase text-[10px] font-bold border-b border-monsoon-200">
                <tr>
                  <th className="px-4 py-3">Ward Name & Zone</th>
                  <th className="px-4 py-3 text-right">Waste TPD</th>
                  <th className="px-4 py-3 text-center">Required Trips</th>
                  <th className="px-4 py-3">Assigned Vehicle(s)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Allocation Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-monsoon-100">
                {planResult.allocations.map((alloc) => (
                  <tr key={alloc.internalWardId} className="hover:bg-monsoon-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-basalt-900">{alloc.wardName}</div>
                      <div className="text-[10px] text-basalt-500">
                        {alloc.zoneName} • Ward #{alloc.wardNumberRaw}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-saffron-800">
                      {alloc.wasteTpd.toFixed(1)} TPD
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-basalt-700">
                      {alloc.requiredTrips}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-basalt-800">
                      {alloc.assignedTruckId || (
                        <span className="text-amber-700 italic">None (Unassigned)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {alloc.status === 'allocated' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          Allocated
                        </span>
                      )}
                      {alloc.status === 'capacity_exceeded' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          Partial
                        </span>
                      )}
                      {alloc.status === 'unassigned' && (
                        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold">
                          Deficit
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-basalt-600 max-w-xs">
                      {alloc.rationale}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Unassigned Wards Callout */}
      {activeTab === 'unassigned' && (
        <div className="space-y-3">
          {planResult.unassignedWards.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-monsoon-200 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-basalt-900 text-sm">100% Workload Allocated</h4>
              <p className="text-basalt-500 mt-1">
                The current scenario fleet pool is sufficient to cover all target ward tonnages.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-monsoon-200 shadow-civic p-4 space-y-2">
              <h4 className="font-bold text-basalt-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Unassigned / Deficit Wards List
              </h4>
              <p className="text-xs text-basalt-500">
                The following wards cannot be fully cleared under the current fleet assumption of {config.availableVehiclesCount} vehicles.
              </p>

              <div className="divide-y divide-monsoon-100 mt-2">
                {planResult.unassignedWards.map((un, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-basalt-900">{un.wardName}</span>
                      <span className="block text-[11px] text-basalt-500">{un.reason}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {un.wasteTpd} TPD unserved
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Model Assumptions */}
      {activeTab === 'assumptions' && (
        <div className="p-5 rounded-2xl bg-white border border-monsoon-200 shadow-civic space-y-3 text-xs">
          <h4 className="font-bold text-basalt-900 text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-saffron-600" />
            Documented Scenario Assumptions & Rules
          </h4>
          <ul className="space-y-2 text-basalt-700 list-disc list-inside">
            {planResult.assumptions.map((assump, i) => (
              <li key={i} className="leading-relaxed">
                {assump}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
