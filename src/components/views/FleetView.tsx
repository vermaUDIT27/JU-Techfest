import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  Layers, 
  ShieldAlert, 
  Compass, 
  Weight, 
  AlertCircle, 
  CheckCircle2,
  Filter,
  User,
  Phone
} from 'lucide-react';
import { TruckRecord } from '../../types';
import { INITIAL_PUNE_TRUCKS } from '../../data/puneFleet';
import { getAllWards } from '../../data/puneData';

interface FleetViewProps {
  trucks?: TruckRecord[];
  onSelectTruck?: (truck: TruckRecord) => void;
}

export const FleetView: React.FC<FleetViewProps> = ({
  trucks = INITIAL_PUNE_TRUCKS,
  onSelectTruck
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'macro'>('live');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Available' | 'Assigned' | 'Collecting' | 'Offline'>('all');

  const wards = getAllWards();

  const filteredTrucks = trucks.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  const availableCount = trucks.filter((t) => t.status === 'Available').length;
  const assignedCount = trucks.filter((t) => t.status === 'Assigned').length;
  const collectingCount = trucks.filter((t) => t.status === 'Collecting').length;
  const offlineCount = trucks.filter((t) => t.status === 'Offline').length;

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-monsoon-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-basalt-900 font-sans">
              Municipal Collection Fleet Directory
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-saffron-100 text-saffron-800 border border-saffron-200">
              {trucks.length} Vehicles
            </span>
          </div>
          <p className="text-xs text-basalt-500 mt-0.5">
            Operational status, supported payload limits, depot locations, and driver assignments across Pune fleet.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-lg bg-monsoon-100 p-1 text-xs font-bold border border-monsoon-200">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'live' ? 'bg-white text-basalt-900 shadow-xs' : 'text-basalt-600 hover:text-basalt-900'
            }`}
          >
            Operational Fleet ({trucks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('macro')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'macro' ? 'bg-white text-basalt-900 shadow-xs' : 'text-basalt-600 hover:text-basalt-900'
            }`}
          >
            Ward Allocations Source (42)
          </button>
        </div>
      </div>

      {activeTab === 'live' ? (
        <div className="space-y-4">
          {/* Status Filter Row */}
          <div className="p-3 rounded-xl bg-white border border-monsoon-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-basalt-400 text-[11px] font-medium mr-1">Status:</span>
              {[
                { id: 'all', label: `All (${trucks.length})` },
                { id: 'Available', label: `Available (${availableCount})` },
                { id: 'Assigned', label: `Assigned (${assignedCount})` },
                { id: 'Collecting', label: `Collecting (${collectingCount})` },
                { id: 'Offline', label: `Offline (${offlineCount})` },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatusFilter(s.id as any)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    statusFilter === s.id
                      ? 'bg-basalt-900 text-white'
                      : 'bg-monsoon-100 text-basalt-600 hover:bg-monsoon-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <span className="text-basalt-400 text-[11px]">
              Click vehicle card to inspect live telemetry
            </span>
          </div>

          {/* Vehicle Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredTrucks.map((truck) => {
              const loadPct = Math.round((truck.currentLoadKg / truck.capacityKg) * 100);
              const assignedCount = (truck.assignedBinIds || []).length;
              const completedCount = (truck.completedBinIds || []).length;

              return (
                <div
                  key={truck.id}
                  onClick={() => onSelectTruck?.(truck)}
                  className="p-4 rounded-xl bg-white border border-monsoon-200 hover:border-saffron-300 transition-all shadow-xs cursor-pointer space-y-3"
                >
                  {/* Top: ID & Status */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: truck.color || '#D3832B' }}
                        />
                        <span className="font-mono font-bold text-basalt-900 text-sm">{truck.id}</span>
                      </div>
                      <span className="text-xs font-semibold text-basalt-700 block mt-0.5">{truck.name}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        truck.status === 'Available'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : truck.status === 'Assigned'
                          ? 'bg-saffron-50 text-saffron-800 border-saffron-200'
                          : truck.status === 'Collecting'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-monsoon-100 text-basalt-600 border-monsoon-300'
                      }`}
                    >
                      {truck.status}
                    </span>
                  </div>

                  {/* Driver & Depot Details */}
                  <div className="p-2.5 rounded-lg bg-monsoon-50 border border-monsoon-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-basalt-800 font-medium">
                      <User className="w-3.5 h-3.5 text-basalt-500 shrink-0" />
                      <span>{truck.driverName}</span>
                      <span className="text-basalt-400 font-mono text-[10.5px]">({truck.driverPhone})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-basalt-600 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-saffron-600 shrink-0" />
                      <span className="truncate">{truck.depotName}</span>
                    </div>
                  </div>

                  {/* Supported Capacity & Current Payload */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-basalt-500 flex items-center gap-1">
                        <Weight className="w-3.5 h-3.5 text-basalt-400" />
                        Supported Payload:
                      </span>
                      <span className="font-mono font-bold text-basalt-900">
                        {truck.currentLoadKg} / {truck.capacityKg} kg ({loadPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-monsoon-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, loadPct)}%`,
                          backgroundColor: loadPct > 90 ? '#E11D48' : truck.color || '#D3832B',
                        }}
                      />
                    </div>
                  </div>

                  {/* Active Stops Summary */}
                  <div className="pt-2 border-t border-monsoon-100 flex items-center justify-between text-xs">
                    <span className="text-basalt-500 text-[11px]">
                      Assigned Stops: <strong className="text-basalt-800">{assignedCount}</strong>
                    </span>
                    <span className="font-mono text-[11px] font-bold text-sahyadri-700">
                      {completedCount} Cleared
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Tab 2: Ward Fleet Macro Allocations from Master Dataset */
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-start gap-2.5 text-amber-900 shadow-xs">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Source Telemetry Completeness Notice:</strong>
              <span className="text-[11px] text-amber-800 block mt-0.5">
                The municipal master dataset reports active vehicle counts for exactly 15 wards (totaling 2,125 vehicles). The remaining 27 wards are null/missing and are preserved as Unknown.
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-monsoon-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-monsoon-50 border-b border-monsoon-200 text-basalt-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">Ward # & Name</th>
                  <th className="px-3.5 py-2.5">Zone</th>
                  <th className="px-3.5 py-2.5 text-right">Reported Vehicles</th>
                  <th className="px-3.5 py-2.5">Reported Vehicle Types</th>
                  <th className="px-3.5 py-2.5 text-right">Reported Waste (TPD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-monsoon-100 text-basalt-800">
                {wards.map((w) => (
                  <tr key={w.internal_id} className="hover:bg-monsoon-50/70 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <span className="font-mono font-bold text-basalt-900 block">Ward {w.ward_number_raw}</span>
                      <span className="text-[11px] text-basalt-600 block">{w.ward_name}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-basalt-700">
                      {w.zone_name || <span className="text-amber-800 font-bold">Unassigned</span>}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono">
                      {w.collection_fleet.vehicle_count_reported !== null ? (
                        <span className="font-bold text-basalt-900">{w.collection_fleet.vehicle_count_reported}</span>
                      ) : (
                        <span className="text-basalt-400 italic">Unknown</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-basalt-600 text-[11px]">
                      {w.collection_fleet.vehicle_types_raw || <span className="text-basalt-400 italic">Not listed</span>}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-saffron-800">
                      {w.waste.reported_total_waste_tonnes_per_day.toFixed(1)} TPD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
