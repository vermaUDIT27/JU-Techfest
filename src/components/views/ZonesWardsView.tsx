import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Layers, 
  Trash2, 
  Users, 
  ArrowUpDown,
  Info
} from 'lucide-react';
import { getAllWards, getAllZones, calculateZoneAggregations } from '../../data/puneData';
import { PuneWardRecord } from '../../types';

export const ZonesWardsView: React.FC = () => {
  const allWards = useMemo(() => getAllWards(), []);
  const zones = useMemo(() => getAllZones(), []);
  const { unassignedWards } = useMemo(() => calculateZoneAggregations(), []);

  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWardForModal, setSelectedWardForModal] = useState<PuneWardRecord | null>(null);
  const [sortBy, setSortBy] = useState<'waste' | 'households' | 'd2d' | 'bins'>('waste');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtered & sorted wards
  const filteredWards = useMemo(() => {
    let result = [...allWards];

    if (selectedZone !== 'all') {
      if (selectedZone === 'unassigned') {
        result = result.filter((w) => !w.zone_name);
      } else {
        result = result.filter(
          (w) => w.zone_name?.toLowerCase() === selectedZone.toLowerCase()
        );
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.ward_name.toLowerCase().includes(q) ||
          w.ward_number_raw.toLowerCase().includes(q) ||
          (w.zone_name && w.zone_name.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === 'waste') {
        valA = a.waste.reported_total_waste_tonnes_per_day;
        valB = b.waste.reported_total_waste_tonnes_per_day;
      } else if (sortBy === 'households') {
        valA = a.households.reported_total_households;
        valB = b.households.reported_total_households;
      } else if (sortBy === 'd2d') {
        valA = a.households.d2d_listed_share_of_reported_households_pct;
        valB = b.households.d2d_listed_share_of_reported_households_pct;
      } else if (sortBy === 'bins') {
        valA = a.bins.street_bin_count;
        valB = b.bins.street_bin_count;
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return result;
  }, [allWards, selectedZone, searchQuery, sortBy, sortOrder]);

  const toggleSort = (field: 'waste' | 'households' | 'd2d' | 'bins') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="border-b border-monsoon-200 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-saffron-100 text-saffron-800 border border-saffron-200">
            Administrative Registry
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-monsoon-100 text-basalt-600 border border-monsoon-300">
            42 Ward Records
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-basalt-900 mt-1 font-sans">
          Pune Zones & Ward Directory
        </h1>
        <p className="text-xs sm:text-sm text-basalt-600 mt-0.5">
          Comprehensive administrative records, waste generation baselines, D2D listing shares, and data-integrity flags across all 15 Pune zones.
        </p>
      </div>

      {/* Filtering and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-monsoon-200 shadow-civic">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-basalt-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ward name, ward number, or zone..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-monsoon-300 text-xs text-basalt-800 bg-monsoon-50 focus:outline-none focus:ring-1 focus:ring-saffron-500"
          />
        </div>

        {/* Zone Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-basalt-500 shrink-0" />
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="text-xs rounded-xl border border-monsoon-300 bg-monsoon-50 px-3 py-1.5 text-basalt-800 font-medium focus:outline-none focus:ring-1 focus:ring-saffron-500"
          >
            <option value="all">All Zones (42 Records)</option>
            {zones.map((z) => (
              <option key={z.zone_id} value={z.name}>
                {z.name}
              </option>
            ))}
            <option value="unassigned">Unassigned / Composite (Ward 42)</option>
          </select>
        </div>
      </div>

      {/* Main Ward Table */}
      <div className="bg-white rounded-2xl border border-monsoon-200 shadow-civic overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-monsoon-100 text-basalt-600 uppercase text-[10px] font-bold border-b border-monsoon-200">
              <tr>
                <th className="px-4 py-3">Ward Identifier</th>
                <th className="px-4 py-3">Zone Affiliation</th>
                <th 
                  className="px-4 py-3 text-right cursor-pointer hover:bg-monsoon-200"
                  onClick={() => toggleSort('waste')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Waste (TPD)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-right cursor-pointer hover:bg-monsoon-200"
                  onClick={() => toggleSort('households')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total HH</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-right cursor-pointer hover:bg-monsoon-200"
                  onClick={() => toggleSort('d2d')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>D2D Listed %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-right cursor-pointer hover:bg-monsoon-200"
                  onClick={() => toggleSort('bins')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Street Bins</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center">Data Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-monsoon-100">
              {filteredWards.map((w) => (
                <tr key={w.internal_id} className="hover:bg-monsoon-50 transition-colors">
                  {/* Ward Name & Number */}
                  <td className="px-4 py-3">
                    <div className="font-bold text-basalt-900">{w.ward_name}</div>
                    <div className="text-[10px] font-mono text-basalt-500">
                      Raw Ward #{w.ward_number_raw} • ID: {w.internal_id}
                    </div>
                  </td>

                  {/* Zone Affiliation */}
                  <td className="px-4 py-3 text-basalt-700">
                    {w.zone_name ? (
                      <span className="font-medium">{w.zone_name}</span>
                    ) : (
                      <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10.5px]">
                        Ambiguous Composite (Ward 42)
                      </span>
                    )}
                  </td>

                  {/* Waste Quantity */}
                  <td className="px-4 py-3 text-right font-mono font-black text-saffron-800 text-sm">
                    {w.waste.reported_total_waste_tonnes_per_day.toFixed(1)}
                  </td>

                  {/* Total Households */}
                  <td className="px-4 py-3 text-right font-mono text-basalt-800">
                    {w.households.reported_total_households.toLocaleString()}
                  </td>

                  {/* D2D Listed Share */}
                  <td className="px-4 py-3 text-right font-mono">
                    <span className="font-bold text-sahyadri-800">
                      {w.households.d2d_listed_share_of_reported_households_pct}%
                    </span>
                    <span className="block text-[10px] text-basalt-500">
                      ({w.households.d2d_households_listed.toLocaleString()} HH)
                    </span>
                  </td>

                  {/* Street Bins */}
                  <td className="px-4 py-3 text-right font-mono text-basalt-800">
                    {w.bins.street_bin_count}
                    <span className="block text-[10px] text-basalt-500">
                      @{w.bins.street_bin_size_litres}L
                    </span>
                  </td>

                  {/* Data Status Badges */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {w.has_conflict ? (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          Conflict: {w.conflict_type === 'duplicate_ward_number' ? 'Duplicate #39' : 'Composite #42'}
                        </span>
                      ) : (
                        <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Verified Record
                        </span>
                      )}

                      {w.collection_fleet.vehicle_count_reported === null && (
                        <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-monsoon-200 text-basalt-600">
                          Fleet: Unknown
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedWardForModal(w)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-monsoon-100 hover:bg-monsoon-200 text-basalt-800 transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-monsoon-50 border-t border-monsoon-200 flex items-center justify-between text-xs text-basalt-500">
          <span>Showing {filteredWards.length} of 42 source records</span>
          <span className="font-mono">Total Filtered Waste: {filteredWards.reduce((sum, w) => sum + w.waste.reported_total_waste_tonnes_per_day, 0).toFixed(2)} TPD</span>
        </div>
      </div>

      {/* Ward Detail Modal */}
      {selectedWardForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-basalt-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-monsoon-300 shadow-civic-lg max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-monsoon-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-saffron-700">
                  {selectedWardForModal.zone_name || 'Ambiguous Composite'} • Raw #{selectedWardForModal.ward_number_raw}
                </span>
                <h3 className="text-xl font-bold text-basalt-900">{selectedWardForModal.ward_name}</h3>
                <span className="text-xs font-mono text-basalt-500">
                  Internal ID: {selectedWardForModal.internal_id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWardForModal(null)}
                className="p-1 rounded-lg hover:bg-monsoon-100 text-basalt-500"
              >
                ✕
              </button>
            </div>

            {/* Conflict Banner if applicable */}
            {selectedWardForModal.has_conflict && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Data Conflict / Ambiguity Advisory:</strong>
                  <span>{selectedWardForModal.conflict_description}</span>
                </div>
              </div>
            )}

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
                <span className="text-basalt-500 block text-[10px] uppercase">Daily Waste</span>
                <span className="text-lg font-bold text-saffron-800">
                  {selectedWardForModal.waste.reported_total_waste_tonnes_per_day} TPD
                </span>
                <span className="block text-[10px] text-basalt-500">
                  Street sweeping: {selectedWardForModal.waste.street_sweeping_waste_tpd} TPD
                </span>
              </div>

              <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
                <span className="text-basalt-500 block text-[10px] uppercase">Reported Households</span>
                <span className="text-lg font-bold text-basalt-900">
                  {selectedWardForModal.households.reported_total_households.toLocaleString()}
                </span>
                <span className="block text-[10px] text-basalt-500">
                  D2D Listed: {selectedWardForModal.households.d2d_households_listed.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
                <span className="text-basalt-500 block text-[10px] uppercase">Street Bins</span>
                <span className="text-lg font-bold text-basalt-900">
                  {selectedWardForModal.bins.street_bin_count}
                </span>
                <span className="block text-[10px] text-basalt-500">
                  Capacity: {selectedWardForModal.bins.street_bin_size_litres} Litres
                </span>
              </div>

              <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
                <span className="text-basalt-500 block text-[10px] uppercase">Collection Fleet</span>
                <span className="text-lg font-bold text-basalt-900">
                  {selectedWardForModal.collection_fleet.vehicle_count_reported !== null 
                    ? `${selectedWardForModal.collection_fleet.vehicle_count_reported} vehicles` 
                    : 'Unknown (Null)'}
                </span>
                <span className="block text-[10px] text-basalt-500">
                  Types: {selectedWardForModal.collection_fleet.vehicle_types_raw}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
                <span className="text-basalt-500 block text-[10px] uppercase">User Charges</span>
                <span className="text-lg font-bold text-basalt-900">
                  ₹{selectedWardForModal.user_charges.monthly_revenue_raw.toLocaleString()}
                </span>
                <span className="block text-[10px] text-basalt-500">
                  Rate: INR {selectedWardForModal.user_charges.rate_inr_raw}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
                <span className="text-basalt-500 block text-[10px] uppercase">Segregation Reported</span>
                <span className="text-lg font-bold text-emerald-800">
                  100%
                </span>
                <span className="block text-[10px] text-amber-700">
                  Source anomaly: exactly equals total HH
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-monsoon-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedWardForModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-basalt-800 text-white hover:bg-basalt-900"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
