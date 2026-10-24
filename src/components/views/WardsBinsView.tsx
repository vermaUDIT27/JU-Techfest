import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Trash2, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  MapPinOff, 
  Radio, 
  Clock, 
  ShieldAlert,
  ArrowUpDown,
  ExternalLink
} from 'lucide-react';
import { BinRecord, PuneWardRecord } from '../../types';
import { getAllWards, getAllZones } from '../../data/puneData';
import { INITIAL_PUNE_BINS } from '../../data/puneBins';
import { getRiskBadgeClasses } from '../../services/riskEngine';

interface WardsBinsViewProps {
  bins?: BinRecord[];
  onInspectBin?: (bin: BinRecord) => void;
}

export const WardsBinsView: React.FC<WardsBinsViewProps> = ({
  bins = INITIAL_PUNE_BINS,
  onInspectBin
}) => {
  const [activeTab, setActiveTab] = useState<'bins' | 'wards'>('bins');
  const [searchQuery, setSearchQuery] = useState('');
  const [fillFilter, setFillFilter] = useState<'all' | 'critical' | 'high' | 'normal' | 'unmapped'>('all');
  const [zoneFilter, setZoneFilter] = useState('all');

  const allWards = useMemo(() => getAllWards(), []);
  const allZones = useMemo(() => getAllZones(), []);

  // Filtered Dustbins
  const filteredBins = useMemo(() => {
    return bins.filter((bin) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery = 
          bin.code.toLowerCase().includes(q) ||
          bin.name.toLowerCase().includes(q) ||
          (bin.colonyName && bin.colonyName.toLowerCase().includes(q)) ||
          (bin.location.address && bin.location.address.toLowerCase().includes(q)) ||
          (bin.location.sector && bin.location.sector.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // Fill / Location filter
      if (fillFilter === 'critical') return bin.currentFillPercent >= 85;
      if (fillFilter === 'high') return bin.currentFillPercent >= 70 && bin.currentFillPercent < 85;
      if (fillFilter === 'normal') return bin.currentFillPercent < 70;
      if (fillFilter === 'unmapped') return bin.locationUnavailable;

      return true;
    });
  }, [bins, searchQuery, fillFilter]);

  // Filtered Wards
  const filteredWards = useMemo(() => {
    return allWards.filter((w) => {
      if (zoneFilter !== 'all') {
        if (zoneFilter === 'unassigned') {
          if (w.zone_name) return false;
        } else if (w.zone_name?.toLowerCase() !== zoneFilter.toLowerCase()) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          w.ward_name.toLowerCase().includes(q) ||
          w.ward_number_raw.toLowerCase().includes(q) ||
          (w.zone_name && w.zone_name.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [allWards, zoneFilter, searchQuery]);

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-monsoon-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-basalt-900 font-sans">
              Wards & Dustbin Inventory Directory
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-monsoon-100 text-basalt-700 border border-monsoon-300">
              {activeTab === 'bins' ? `${bins.length} Bins` : '42 Wards'}
            </span>
          </div>
          <p className="text-xs text-basalt-500 mt-0.5">
            Searchable civic inventory of dustbin telemetries, location mapping statuses, and administrative ward baselines.
          </p>
        </div>

        {/* Sub-Tabs: Bins Inventory vs Wards Registry */}
        <div className="flex rounded-lg bg-monsoon-100 p-1 text-xs font-bold border border-monsoon-200">
          <button
            type="button"
            onClick={() => setActiveTab('bins')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'bins' ? 'bg-white text-basalt-900 shadow-xs' : 'text-basalt-600 hover:text-basalt-900'
            }`}
          >
            Dustbins Inventory ({bins.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wards')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'wards' ? 'bg-white text-basalt-900 shadow-xs' : 'text-basalt-600 hover:text-basalt-900'
            }`}
          >
            Administrative Wards ({allWards.length})
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-3 rounded-xl bg-white border border-monsoon-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-basalt-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'bins' ? 'Search by code, colony, sector, landmark...' : 'Search by ward name or number...'}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-monsoon-50 border border-monsoon-300 text-basalt-900 placeholder-basalt-400 focus:outline-none focus:ring-1 focus:ring-saffron-500 text-xs"
          />
        </div>

        {/* Filters according to active tab */}
        {activeTab === 'bins' ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-basalt-400 text-[11px] font-medium mr-1">Filter:</span>
            {[
              { id: 'all', label: 'All Bins' },
              { id: 'critical', label: 'Critical (≥85%)' },
              { id: 'high', label: 'High (70-84%)' },
              { id: 'normal', label: 'Normal (<70%)' },
              { id: 'unmapped', label: 'Unmapped GPS' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFillFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  fillFilter === f.id
                    ? 'bg-basalt-900 text-white'
                    : 'bg-monsoon-100 text-basalt-600 hover:bg-monsoon-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-basalt-500 text-[11px]">Zone:</span>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="py-1 px-2.5 rounded-md bg-monsoon-50 border border-monsoon-300 text-basalt-800 text-xs focus:outline-none"
            >
              <option value="all">All 15 Zones</option>
              <option value="unassigned">Unassigned (Ward 42)</option>
              {allZones.map((z) => (
                <option key={z.zone_id} value={z.name}>{z.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Dustbin Table */}
      {activeTab === 'bins' && (
        <div className="rounded-xl bg-white border border-monsoon-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-monsoon-50 border-b border-monsoon-200 text-basalt-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">Code & Landmark</th>
                  <th className="px-3.5 py-2.5">Sector & Colony</th>
                  <th className="px-3.5 py-2.5 text-center">Fill Status</th>
                  <th className="px-3.5 py-2.5 text-right">Est. Weight</th>
                  <th className="px-3.5 py-2.5">Reading Source</th>
                  <th className="px-3.5 py-2.5">Location Status</th>
                  <th className="px-3.5 py-2.5">Assigned Vehicle</th>
                  <th className="px-3.5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-monsoon-100 text-basalt-800">
                {filteredBins.length > 0 ? (
                  filteredBins.map((bin) => {
                    const isCritical = bin.currentFillPercent >= 85;
                    const isFull = bin.currentFillPercent === 100;
                    return (
                      <tr key={bin.id} className="hover:bg-monsoon-50/70 transition-colors">
                        <td className="px-3.5 py-2.5">
                          <span className="font-mono font-bold text-basalt-900 block">{bin.code}</span>
                          <span className="text-[11px] text-basalt-600 block truncate max-w-xs">{bin.name}</span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="font-semibold text-basalt-800 block">{bin.location.sector}</span>
                          <span className="text-[10.5px] text-basalt-500 block truncate max-w-xs">{bin.colonyName || bin.location.address}</span>
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getRiskBadgeClasses(bin.riskCategory)}`}>
                            {bin.currentFillPercent}% {isFull ? '• FULL' : isCritical ? '• CRIT' : ''}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-semibold">
                          ~{bin.estimatedKg} kg
                          <span className="text-[10px] text-basalt-400 block font-normal">{bin.capacityLiters} L cap</span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-monsoon-100 text-basalt-700 block w-fit">
                            {bin.readingSource === 'sensor' ? 'IOT SENSOR' : 'SIMULATED'}
                          </span>
                          <span className="text-[10px] text-basalt-400 block mt-0.5">{bin.dataFreshness || 'Just now'}</span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          {bin.locationUnavailable ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <MapPinOff className="w-3 h-3 text-amber-600" />
                              Unmapped Sector
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-sahyadri-800 font-mono bg-sahyadri-50 px-1.5 py-0.5 rounded">
                              <MapPin className="w-3 h-3 text-sahyadri-600" />
                              {bin.location.lat.toFixed(4)}, {bin.location.lng.toFixed(4)}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px]">
                          {bin.assignedTruckId ? (
                            <span className="font-bold text-saffron-800 bg-saffron-50 px-1.5 py-0.5 rounded border border-saffron-200">
                              {bin.assignedTruckId.replace('MH-12-PMC-', '#')}
                            </span>
                          ) : (
                            <span className="text-basalt-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => onInspectBin?.(bin)}
                            className="px-2 py-1 text-[11px] font-semibold text-saffron-700 hover:text-saffron-900 hover:bg-saffron-50 rounded cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-basalt-400 text-xs italic">
                      No dustbins matching the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Wards Registry Table */}
      {activeTab === 'wards' && (
        <div className="space-y-3">
          {/* Integrity Warning for Ward 39 Duplicate & Ward 42 Ambiguous */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-start gap-2.5 text-amber-900 shadow-xs">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Administrative Integrity Rules Applied:</strong>
              <span className="text-[11px] text-amber-800 block mt-0.5">
                Two separate records share Ward #39 (Dhankawadi vs Navi Peth) and are preserved with distinct internal IDs. Composite Ward 42 spans five zones and is left unassigned until demarcation maps are formalized.
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-monsoon-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-monsoon-50 border-b border-monsoon-200 text-basalt-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5">Ward # & Name</th>
                    <th className="px-3.5 py-2.5">Administrative Zone</th>
                    <th className="px-3.5 py-2.5 text-right">Reported Waste (TPD)</th>
                    <th className="px-3.5 py-2.5 text-right">Households</th>
                    <th className="px-3.5 py-2.5 text-right">D2D Listed %</th>
                    <th className="px-3.5 py-2.5 text-right">Street Bins</th>
                    <th className="px-3.5 py-2.5">Caveats / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-monsoon-100 text-basalt-800">
                  {filteredWards.map((w) => (
                    <tr key={w.internal_id} className="hover:bg-monsoon-50/70 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <span className="font-mono font-bold text-basalt-900 block">Ward {w.ward_number_raw}</span>
                        <span className="text-[11px] text-basalt-600 block">{w.ward_name}</span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        {w.zone_name ? (
                          <span className="font-semibold text-basalt-800">{w.zone_name}</span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            Unassigned (Multi-Zone)
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-saffron-800">
                        {w.waste.reported_total_waste_tonnes_per_day.toFixed(2)} TPD
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono">
                        {w.households.reported_total_households.toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono">
                        {w.households.d2d_listed_share_of_reported_households_pct}%
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-basalt-600">
                        {w.bins.street_bin_count}
                      </td>
                      <td className="px-3.5 py-2.5 text-[11px]">
                        {w.conflict_description ? (
                          <span className="text-amber-800 font-medium block max-w-xs">{w.conflict_description}</span>
                        ) : w.data_quality_flags?.length > 0 ? (
                          <span className="text-amber-800 font-medium block max-w-xs">{w.data_quality_flags[0]}</span>
                        ) : (
                          <span className="text-basalt-400">Standard record</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
