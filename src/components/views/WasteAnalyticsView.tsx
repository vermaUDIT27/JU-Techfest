import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Database, 
  ShieldAlert, 
  DollarSign, 
  Layers, 
  Building2, 
  CheckCircle2 
} from 'lucide-react';
import { 
  getHistoricalRecycling, 
  calculateZoneAggregations, 
  getDisposalSites, 
  getAllWards 
} from '../../data/puneData';

export const WasteAnalyticsView: React.FC = () => {
  const historical = getHistoricalRecycling();
  const { zones, unassignedWards } = calculateZoneAggregations();
  const disposalSites = getDisposalSites();
  const wards = getAllWards();

  const totalUserChargeRevenue = wards.reduce((sum, w) => sum + w.user_charges.monthly_revenue_raw, 0);
  const totalStreetSweepingTpd = Math.round(wards.reduce((sum, w) => sum + w.waste.street_sweeping_waste_tpd, 0) * 100) / 100;
  const totalCommercialWasteTpd = Math.round(wards.reduce((sum, w) => sum + w.waste.commercial_waste_tpd_raw, 0) * 100) / 100;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="border-b border-monsoon-200 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-saffron-100 text-saffron-800 border border-saffron-200">
            Analytics & Longitudinal Trends
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-monsoon-100 text-basalt-600 border border-monsoon-300">
            2011–2020 Series
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-basalt-900 mt-1 font-sans">
          Municipal Waste Generation & Recycling Analytics
        </h1>
        <p className="text-xs sm:text-sm text-basalt-600 mt-0.5">
          Longitudinal recycling growth series, street sweeping allocations, and user charge revenue recovery across PMC wards.
        </p>
      </div>

      {/* Historical Recycling Series Section */}
      <div className="p-5 rounded-2xl bg-white border border-monsoon-200 shadow-civic space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-monsoon-200 pb-3">
          <div>
            <h3 className="font-bold text-basalt-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-saffron-600" />
              Citywide Historical Recycling Trend (2011–2020)
            </h3>
            <p className="text-xs text-basalt-500">
              Reported citywide recycling output over a 10-year period.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-monsoon-100 text-basalt-600 font-bold">
            10 Annual Observations
          </span>
        </div>

        {/* Explicit Source Unit Caveat Banner */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Source-Unit Ambiguity Caveat:</strong>
            <span className="text-[11px] leading-relaxed">
              Source column header label states <em>&quot;million tonnes&quot;</em>, but data entries are recorded as <em>&quot;165 MT/day&quot;</em> through <em>&quot;310 MT/day&quot;</em>. Values are preserved in raw textual form until authoritative municipal unit confirmation is received.
            </span>
          </div>
        </div>

        {/* Visual Bar Progression for Historical Recycling */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 pt-2">
          {historical.map((rec) => {
            const rawVal = parseFloat(rec.reported_recycled_quantity_raw);
            const heightPct = Math.round((rawVal / 220) * 100);

            return (
              <div key={rec.year} className="flex flex-col items-center justify-end p-2 bg-monsoon-50 rounded-xl border border-monsoon-200 text-center">
                <div className="w-full flex items-end justify-center h-24 mb-2">
                  <div 
                    className="w-full max-w-[28px] bg-saffron-600 rounded-t-md transition-all hover:bg-saffron-700" 
                    style={{ height: `${heightPct}%` }}
                    title={`${rec.year}: ${rec.reported_recycled_quantity_raw}`}
                  />
                </div>
                <span className="font-bold text-basalt-900 font-mono text-xs">
                  {rawVal}
                </span>
                <span className="text-[10px] text-basalt-500 font-mono">
                  {rec.year}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Middle Section: Waste Streams & Revenue Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stream 1: Street Sweeping vs Total Waste */}
        <div className="p-5 rounded-2xl bg-white border border-monsoon-200 shadow-civic space-y-3">
          <h4 className="font-bold text-basalt-900 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-saffron-600" />
            Waste Stream Composition
          </h4>

          <div className="space-y-3 text-xs pt-2">
            <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
              <span className="text-basalt-500 block text-[10px] uppercase">Total Waste Reported</span>
              <span className="text-xl font-black text-basalt-900 font-mono">1,592.43 TPD</span>
              <span className="text-[10px] text-basalt-500 block mt-0.5">Sum of all 42 ward records</span>
            </div>

            <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
              <span className="text-basalt-500 block text-[10px] uppercase">Street Sweeping Waste</span>
              <span className="text-xl font-black text-sahyadri-800 font-mono">{totalStreetSweepingTpd} TPD</span>
              <span className="text-[10px] text-sahyadri-700 block mt-0.5">
                ~{Math.round((totalStreetSweepingTpd / 1592.43) * 100)}% of total daily volume
              </span>
            </div>

            <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
              <span className="text-basalt-500 block text-[10px] uppercase">Commercial Waste Reported</span>
              <span className="text-xl font-black text-basalt-700 font-mono">{totalCommercialWasteTpd} TPD</span>
              <span className="text-[10px] text-amber-700 block mt-0.5">
                Reported as 0 across all ward spreadsheets (Source value preserved)
              </span>
            </div>
          </div>
        </div>

        {/* Stream 2: Monthly User Charges Recovery */}
        <div className="p-5 rounded-2xl bg-white border border-monsoon-200 shadow-civic space-y-3">
          <h4 className="font-bold text-basalt-900 text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-sahyadri-600" />
            Monthly User Charges Recovery
          </h4>

          <div className="space-y-3 text-xs pt-2">
            <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
              <span className="text-basalt-500 block text-[10px] uppercase">Total Monthly Revenue</span>
              <span className="text-xl font-black text-emerald-800 font-mono">
                ₹{(totalUserChargeRevenue / 10000000).toFixed(2)} Cr
              </span>
              <span className="text-[10px] text-basalt-500 block mt-0.5">
                Exact sum: ₹{totalUserChargeRevenue.toLocaleString()} / month
              </span>
            </div>

            <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
              <span className="text-basalt-500 block text-[10px] uppercase">User Charges Imposed</span>
              <span className="text-lg font-bold text-basalt-900 font-mono">
                Yes (&apos;Y&apos;) across all 42 Wards
              </span>
              <span className="text-[10px] text-basalt-500 block mt-0.5">
                Rate tiers: INR 50 / 70 / 140
              </span>
            </div>
          </div>
        </div>

        {/* Stream 3: Disposal Site Destination */}
        <div className="p-5 rounded-2xl bg-white border border-monsoon-200 shadow-civic space-y-3">
          <h4 className="font-bold text-basalt-900 text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-saffron-600" />
            Disposal Destination
          </h4>

          {disposalSites.map((ds) => (
            <div key={ds.site_id} className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200 text-xs space-y-1.5">
              <span className="font-bold text-basalt-900 block text-sm">{ds.location_raw}</span>
              <p className="text-[11px] text-basalt-600">{ds.site_type_raw}</p>
              <div className="pt-1 border-t border-monsoon-200 text-[10px] text-basalt-500 space-y-0.5">
                <div>Distance: <strong>{ds.distance_from_city_center_raw}</strong> from city center</div>
                <div>Operational since: <strong>{ds.operational_since_raw}</strong></div>
                <div>Reported quantity: <strong className="text-saffron-800">{ds.reported_quantity_tpd_raw}</strong></div>
                <div>Waste streams: {ds.waste_types_raw}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
