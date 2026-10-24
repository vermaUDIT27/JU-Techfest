import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Radio, 
  Truck, 
  MapPin, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  Search, 
  ArrowUpRight, 
  Layers, 
  Info,
  SlidersHorizontal,
  FileText,
  Activity,
  AlertCircle
} from 'lucide-react';
import { BinRecord, OverviewMetrics } from '../../types';
import { ProvenanceSourceBanner } from '../common/SimulationBadge';
import { JaaliDivider, JharokhaCardHeader } from '../common/JharokhaFrame';
import { PILOT_METADATA } from '../../data/jaipurBins';

interface OverviewViewProps {
  bins: BinRecord[];
  metrics: OverviewMetrics;
  onSelectBin: (bin: BinRecord) => void;
  onNavigateToMap: (bin?: BinRecord) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  bins,
  metrics,
  onSelectBin,
  onNavigateToMap,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterQuality, setFilterQuality] = useState<string>('all');

  // Filter priority list
  const filteredBins = bins.filter((b) => {
    const matchesSearch = 
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.hindiName && b.hindiName.includes(searchTerm)) ||
      (b.marathiName && b.marathiName.includes(searchTerm)) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.location.landmark.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = 
      filterPriority === 'all' ? true : b.riskCategory === filterPriority;

    const matchesQuality = 
      filterQuality === 'all' 
        ? true 
        : filterQuality === 'stale'
        ? (b.dataFreshness.toLowerCase().includes('stale') || b.dataFreshness.toLowerCase().includes('fault'))
        : true;

    return matchesSearch && matchesPriority && matchesQuality;
  });

  return (
    <div className="space-y-6">
      {/* Simulation Notice Banner */}
      <div className="p-4 rounded-2xl bg-sand-100 border border-sand-300 shadow-civic">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-terracotta-100 border border-terracotta-200 flex items-center justify-center text-terracotta-700 flex-shrink-0 mt-0.5">
              <Activity className="w-5 h-5 text-terracotta-600 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-charcoal-900 text-sm">
                  Jaipur Ward 84 Operational Decision Support Pilot
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-sand-200 text-charcoal-800 border border-sand-300">
                  Operations Suite
                </span>
              </div>
              <p className="text-xs text-charcoal-600 mt-0.5 leading-relaxed">
                WasteWise assists ward supervisors in prioritizing municipal collection when sensor telemetry is <strong>incomplete or stale</strong>. All bin telemetry and fill rates below are calibrated for municipal operations.
              </p>
            </div>
          </div>

          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={() => onNavigateToMap()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-terracotta-600 hover:bg-terracotta-700 text-sand-50 transition-colors shadow-civic"
            >
              <MapPin className="w-3.5 h-3.5" />
              Open Jagatpura Operations Map
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Metric 1: Total Bins */}
        <div className="p-4 rounded-xl bg-sand-50 border border-sand-200 shadow-civic">
          <div className="flex items-center justify-between text-xs text-charcoal-500 mb-1">
            <span className="font-medium">Monitored Bins</span>
            <span className="text-[10px] font-mono px-1 rounded bg-sand-200 text-charcoal-600">Ward 84</span>
          </div>
          <div className="text-2xl font-bold text-charcoal-900 tracking-tight">
            {metrics.totalBins}
          </div>
          <div className="text-[11px] text-charcoal-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-charcoal-700">~{metrics.totalEstimatedWasteKg.toLocaleString()} kg</span>
            <span>est. total waste</span>
          </div>
        </div>

        {/* Metric 2: Critical / Overflow Risk */}
        <div className="p-4 rounded-xl bg-terracotta-50/70 border border-terracotta-200 shadow-civic">
          <div className="flex items-center justify-between text-xs text-terracotta-800 mb-1">
            <span className="font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-terracotta-600" />
              Critical Bins
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-terracotta-200 text-terracotta-900">Urgent</span>
          </div>
          <div className="text-2xl font-bold text-terracotta-700 tracking-tight">
            {metrics.criticalBins}
          </div>
          <div className="text-[11px] text-terracotta-800 mt-1 font-medium">
            Immediate dispatch required
          </div>
        </div>

        {/* Metric 3: Stale / Incomplete Telemetry */}
        <div className="p-4 rounded-xl bg-ochre-50/70 border border-ochre-200 shadow-civic">
          <div className="flex items-center justify-between text-xs text-ochre-800 mb-1">
            <span className="font-bold flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-ochre-600" />
              Stale Telemetry
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-ochre-200 text-ochre-900">Alert</span>
          </div>
          <div className="text-2xl font-bold text-ochre-700 tracking-tight">
            {metrics.staleTelemetryBins}
          </div>
          <div className="text-[11px] text-ochre-800 mt-1 font-medium">
            Incomplete sensor feeds
          </div>
        </div>

        {/* Metric 4: Sensitive Zones */}
        <div className="p-4 rounded-xl bg-sand-50 border border-sand-200 shadow-civic">
          <div className="flex items-center justify-between text-xs text-charcoal-500 mb-1">
            <span className="font-medium flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              Sensitive Zones
            </span>
            <span className="text-[10px] font-mono px-1 rounded bg-rose-100 text-rose-800">4 sites</span>
          </div>
          <div className="text-2xl font-bold text-charcoal-900 tracking-tight">
            {metrics.sensitiveZoneBins}
          </div>
          <div className="text-[11px] text-charcoal-500 mt-1">
            Hospitals, temples & transit
          </div>
        </div>

        {/* Metric 5: Fleet Readiness */}
        <div className="p-4 rounded-xl bg-sand-50 border border-sand-200 shadow-civic col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-xs text-charcoal-500 mb-1">
            <span className="font-medium flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-sage-600" />
              Tipper Fleet
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sage-100 text-sage-800">Active</span>
          </div>
          <div className="text-2xl font-bold text-charcoal-900 tracking-tight">
            {metrics.activeTippers} / 4
          </div>
          <div className="text-[11px] text-sage-700 mt-1 font-semibold">
            Ready at Sector 26 Depot
          </div>
        </div>
      </div>

      {/* Telemetry Integrity & Data-Quality Indicator Section */}
      <div className="p-5 rounded-2xl bg-sand-100 border border-sand-300 shadow-civic space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sand-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-charcoal-800 text-sm tracking-tight font-sans">
                Telemetry Health & Data-Quality Distribution
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sand-200 text-charcoal-600 uppercase">
                Simulated Telemetry Feed
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Live breakdown of sensor communication freshness across Jagatpura Ward 84 assets
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-charcoal-500">Overall Telemetry Integrity:</span>
            <span className="font-bold text-charcoal-900 text-sm">
              {metrics.telemetryIntegrityPercent}% Live IoT
            </span>
          </div>
        </div>

        {/* Data Quality Stacked Meter */}
        <div>
          <div className="h-3 w-full bg-sand-200 rounded-full overflow-hidden flex shadow-inner">
            <div 
              style={{ width: `${(metrics.highConfidenceBins / metrics.totalBins) * 100}%` }}
              className="bg-sage-600 h-full transition-all duration-300" 
              title="High Confidence: Fresh IoT updates (< 2h)"
            />
            <div 
              style={{ width: `${((metrics.totalBins - metrics.highConfidenceBins - metrics.staleTelemetryBins) / metrics.totalBins) * 100}%` }}
              className="bg-ochre-400 h-full transition-all duration-300" 
              title="Moderate Confidence: Citizen reports & recent pings"
            />
            <div 
              style={{ width: `${(metrics.staleTelemetryBins / metrics.totalBins) * 100}%` }}
              className="bg-terracotta-500 h-full transition-all duration-300" 
              title="Stale / Incomplete Telemetry (> 10h disconnect)"
            />
          </div>

          {/* Meter Legend */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-sage-600 flex-shrink-0" />
              <div>
                <span className="font-semibold text-charcoal-800">{metrics.highConfidenceBins} Bins</span>
                <span className="text-charcoal-500 block text-[11px]">Live Ultrasonic IoT (&lt; 2h fresh)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-ochre-400 flex-shrink-0" />
              <div>
                <span className="font-semibold text-charcoal-800">
                  {metrics.totalBins - metrics.highConfidenceBins - metrics.staleTelemetryBins} Bins
                </span>
                <span className="text-charcoal-500 block text-[11px]">Citizen Verified / Historical Model</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-terracotta-500 flex-shrink-0" />
              <div>
                <span className="font-semibold text-charcoal-800">{metrics.staleTelemetryBins} Bins</span>
                <span className="text-charcoal-500 block text-[11px]">Stale Telemetry (&gt; 10h disconnect)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Supervisor Incomplete Data Advisory */}
        <div className="p-3 rounded-xl bg-sand-50 border border-sand-300 flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-terracotta-600 flex-shrink-0 mt-0.5" />
          <div className="text-charcoal-700 leading-relaxed text-[11.5px]">
            <strong className="text-charcoal-900">Ward Supervisor Advisory:</strong> 3 bins in the Mahal Road and Model Town commercial corridors currently experience stale sensor feeds. WasteWise has factored in weekend citizen reports and historical footfall spikes to boost their operational rank, preventing public overflow before sensor maintenance can occur.
          </div>
        </div>
      </div>

      {/* Operational Priority List (Core Decision Support Feature) */}
      <div className="p-5 rounded-2xl bg-sand-50 border border-sand-300 shadow-civic space-y-4">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-sand-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-charcoal-900 text-base tracking-tight font-sans">
                Operational Collection Priority List
              </h3>
              <span className="text-xs text-charcoal-500 font-normal">
                (परिचालन प्राथमिकता सूची)
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Ranked collection queue explaining the operational trade-offs behind each bin's priority
            </p>
          </div>

          {/* Search & Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search street, code, landmark..."
                className="pl-8 pr-3 py-1.5 text-xs bg-sand-100 border border-sand-300 rounded-lg text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:ring-1 focus:ring-terracotta-500 w-48 sm:w-60"
              />
            </div>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-xs bg-sand-100 border border-sand-300 rounded-lg px-2.5 py-1.5 text-charcoal-700 focus:outline-none"
              aria-label="Filter Priority"
            >
              <option value="all">All Priorities</option>
              <option value="immediate">Immediate Only</option>
              <option value="high">High & Above</option>
              <option value="medium">Medium Only</option>
              <option value="low">Low Only</option>
            </select>

            <select
              value={filterQuality}
              onChange={(e) => setFilterQuality(e.target.value)}
              className="text-xs bg-sand-100 border border-sand-300 rounded-lg px-2.5 py-1.5 text-charcoal-700 focus:outline-none"
              aria-label="Filter Data Quality"
            >
              <option value="all">All Data Qualities</option>
              <option value="high">High Confidence (Live IoT)</option>
              <option value="stale">Stale / Disconnected Only</option>
            </select>
          </div>
        </div>

        {/* Priority List Cards */}
        <div className="space-y-3">
          {filteredBins.length === 0 ? (
            <div className="text-center py-10 text-charcoal-500 text-xs">
              No bins matched the active filter criteria.
            </div>
          ) : (
            filteredBins.map((bin, index) => {
              const isCritical = bin.riskCategory === 'critical';
              const isStale = bin.dataFreshness.toLowerCase().includes('stale') || bin.dataFreshness.toLowerCase().includes('fault');

              return (
                <div
                  key={bin.id}
                  className={`p-4 rounded-xl border transition-all duration-150 hover:shadow-civic ${
                    isCritical
                      ? 'bg-terracotta-50/50 border-terracotta-200'
                      : 'bg-sand-100/70 border-sand-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Left: Code, Name, Badges */}
                    <div className="space-y-1.5 max-w-2xl min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-sand-200 text-charcoal-800 border border-sand-300">
                          #{index + 1} {bin.code}
                        </span>

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            bin.riskCategory === 'critical'
                              ? 'bg-red-600 text-sand-50 border-red-700'
                              : bin.riskCategory === 'high'
                              ? 'bg-orange-100 text-orange-800 border-orange-300'
                              : bin.riskCategory === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                              : 'bg-green-100 text-green-800 border-green-300'
                          }`}
                        >
                          {bin.riskCategory} Priority
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

                      <h4 className="font-bold text-charcoal-900 text-sm leading-snug">
                        {bin.name}{' '}
                        <span className="text-xs text-charcoal-500 font-normal">
                          ({bin.hindiName})
                        </span>
                      </h4>

                      <p className="text-xs text-charcoal-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-terracotta-600 flex-shrink-0" />
                        <span>{bin.location.address} • {bin.location.landmark}</span>
                      </p>

                      {/* Primary Decision Support Explanation */}
                      <div className="p-2.5 rounded-lg bg-sand-50 border border-sand-200/80 text-xs text-charcoal-700 leading-relaxed mt-2">
                        <strong className="text-terracotta-800 text-[11px] block mb-0.5">
                          Supervisor Decision Rationale:
                        </strong>
                        {bin.supervisorTradeoffReason}
                      </div>
                    </div>

                    {/* Right: Fill Gauge, Weight & Inspection Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 flex-shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-sand-200">
                      <div className="text-left lg:text-right w-full sm:w-auto">
                        <div className="flex items-center lg:justify-end gap-2 text-xs">
                          <span className="text-charcoal-500">Fill:</span>
                          <span className="font-bold text-charcoal-900 text-sm">
                            {bin.currentFillPercent}% ({bin.estimatedKg} kg)
                          </span>
                        </div>
                        <div className="w-36 bg-sand-200 h-2 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              bin.currentFillPercent >= 90 ? 'bg-red-600' : bin.currentFillPercent >= 75 ? 'bg-orange-500' : bin.currentFillPercent >= 50 ? 'bg-yellow-500' : 'bg-green-600'
                            }`}
                            style={{ width: `${bin.currentFillPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-charcoal-400 block mt-0.5">
                          Sensor: {bin.dataFreshness}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => onNavigateToMap(bin)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-sand-200 hover:bg-sand-300 text-charcoal-700 transition-colors flex items-center gap-1"
                          title="View on Map"
                        >
                          <MapPin className="w-3.5 h-3.5 text-terracotta-600" />
                          <span>Map</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectBin(bin)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-terracotta-600 hover:bg-terracotta-700 text-sand-50 transition-colors shadow-civic flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Small Source & Provenance Area */}
      <ProvenanceSourceBanner />
    </div>
  );
};
