import React, { useState } from 'react';
import { 
  Truck, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Layers, 
  ShieldAlert, 
  Info,
  Calendar,
  Weight
} from 'lucide-react';
import { getAllWards } from '../../data/puneData';

export const FleetAllocationView: React.FC = () => {
  const wards = getAllWards();
  const [filterMode, setFilterMode] = useState<'all' | 'populated' | 'unknown'>('all');

  const populatedCount = wards.filter((w) => w.collection_fleet.vehicle_count_reported !== null).length;
  const unknownCount = wards.filter((w) => w.collection_fleet.vehicle_count_reported === null).length;
  const totalReportedVehicles = wards.reduce(
    (sum, w) => sum + (w.collection_fleet.vehicle_count_reported ?? 0),
    0
  );

  const filteredWards = wards.filter((w) => {
    if (filterMode === 'populated') return w.collection_fleet.vehicle_count_reported !== null;
    if (filterMode === 'unknown') return w.collection_fleet.vehicle_count_reported === null;
    return true;
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="border-b border-monsoon-200 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-saffron-100 text-saffron-800 border border-saffron-200">
            Fleet Telemetry & Inventory
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-monsoon-100 text-basalt-600 border border-monsoon-300">
            Source Audit
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-basalt-900 mt-1 font-sans">
          Municipal Collection Fleet & Vehicle Inventory
        </h1>
        <p className="text-xs sm:text-sm text-basalt-600 mt-0.5">
          Source vehicle allocations, reported capacity categories, and telemetry completeness across PMC wards.
        </p>
      </div>

      {/* Fleet Completeness Alert Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-civic">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-950">
              Fleet Telemetry Completeness Notice: 27 of 42 Wards Not Populated
            </h4>
            <p className="text-amber-900 text-[11px] mt-0.5">
              The municipal source dataset reports active vehicle counts for exactly <strong>15 wards</strong> (totaling 2,125 vehicles). The remaining <strong>27 wards</strong> contain null/missing values. In accordance with data-integrity principles, these missing values are preserved as <em>Unknown</em> and are never converted to zero.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono font-bold text-xs shrink-0">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
            15 Reported
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
            27 Unknown
          </span>
        </div>
      </div>

      {/* Fleet Statistics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reported Vehicles */}
        <div className="p-4 rounded-2xl bg-white border border-monsoon-200 shadow-civic">
          <div className="flex items-center justify-between text-basalt-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Reported Fleet Sum</span>
            <Truck className="w-4 h-4 text-saffron-600" />
          </div>
          <div className="text-2xl font-black text-basalt-900 font-mono">
            {totalReportedVehicles.toLocaleString()}
          </div>
          <div className="text-[10px] text-basalt-500 mt-1">
            Across 15 populated wards (avg ~141 v/ward)
          </div>
        </div>

        {/* Vehicle Types */}
        <div className="p-4 rounded-2xl bg-white border border-monsoon-200 shadow-civic">
          <div className="flex items-center justify-between text-basalt-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Vehicle Types</span>
            <Layers className="w-4 h-4 text-sahyadri-600" />
          </div>
          <div className="text-sm font-bold text-basalt-900 mt-1">
            Ghanta Gadi, Chota Haati, Tipper
          </div>
          <div className="text-[10px] text-basalt-500 mt-1">
            Source classification reported across all 42 wards
          </div>
        </div>

        {/* Payload Capacities */}
        <div className="p-4 rounded-2xl bg-white border border-monsoon-200 shadow-civic">
          <div className="flex items-center justify-between text-basalt-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Payload Capacities</span>
            <Weight className="w-4 h-4 text-basalt-600" />
          </div>
          <div className="text-sm font-bold text-basalt-900 mt-1">
            1,000 / 3,000 / 5,000 kg
          </div>
          <div className="text-[10px] text-basalt-500 mt-1">
            1.0T (Mini), 3.0T (Tipper), 5.0T (Compactor)
          </div>
        </div>

        {/* Fleet Vintage */}
        <div className="p-4 rounded-2xl bg-white border border-monsoon-200 shadow-civic">
          <div className="flex items-center justify-between text-basalt-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Fleet Vintage</span>
            <Calendar className="w-4 h-4 text-saffron-600" />
          </div>
          <div className="text-sm font-bold text-basalt-900 mt-1 font-mono">
            2014 – 2021
          </div>
          <div className="text-[10px] text-basalt-500 mt-1">
            Trip frequency: Daily across all wards
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-monsoon-200 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
            filterMode === 'all'
              ? 'bg-basalt-800 text-white'
              : 'bg-monsoon-100 text-basalt-700 hover:bg-monsoon-200'
          }`}
        >
          All 42 Wards
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('populated')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
            filterMode === 'populated'
              ? 'bg-emerald-700 text-white'
              : 'bg-monsoon-100 text-basalt-700 hover:bg-monsoon-200'
          }`}
        >
          Populated Records ({populatedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('unknown')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
            filterMode === 'unknown'
              ? 'bg-amber-700 text-white'
              : 'bg-monsoon-100 text-basalt-700 hover:bg-monsoon-200'
          }`}
        >
          Unknown / Unreported ({unknownCount})
        </button>
      </div>

      {/* Ward Fleet Inventory Table */}
      <div className="bg-white rounded-2xl border border-monsoon-200 shadow-civic overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-monsoon-100 text-basalt-600 uppercase text-[10px] font-bold border-b border-monsoon-200">
              <tr>
                <th className="px-4 py-3">Ward Name</th>
                <th className="px-4 py-3">Zone</th>
                <th className="px-4 py-3 text-center">Vehicle Count</th>
                <th className="px-4 py-3">Vehicle Types</th>
                <th className="px-4 py-3">Capacities (kg)</th>
                <th className="px-4 py-3">Purchase Range</th>
                <th className="px-4 py-3 text-right">Daily Waste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-monsoon-100">
              {filteredWards.map((w) => {
                const count = w.collection_fleet.vehicle_count_reported;
                const isPopulated = count !== null;

                return (
                  <tr key={w.internal_id} className="hover:bg-monsoon-50">
                    <td className="px-4 py-3 font-bold text-basalt-900">
                      {w.ward_name}
                      <span className="block text-[10px] text-basalt-400 font-mono">
                        Ward #{w.ward_number_raw}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-basalt-700">
                      {w.zone_name || 'Ambiguous Composite'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isPopulated ? (
                        <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {count} vehicles
                        </span>
                      ) : (
                        <span className="font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10.5px]">
                          Unknown (Null)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-basalt-600 text-[11px]">
                      {w.collection_fleet.vehicle_types_raw}
                    </td>
                    <td className="px-4 py-3 text-basalt-600 font-mono text-[11px]">
                      {w.collection_fleet.vehicle_capacities_raw}
                    </td>
                    <td className="px-4 py-3 text-basalt-600 font-mono text-[11px]">
                      {w.collection_fleet.purchase_year_range_raw}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-saffron-800">
                      {w.waste.reported_total_waste_tonnes_per_day} TPD
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
