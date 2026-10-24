import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Layers, 
  Route, 
  FileText, 
  Building2, 
  Truck, 
  Weight, 
  ShieldAlert,
  ArrowUpDown,
  Search,
  MapPin,
  MapPinOff,
  AlertTriangle
} from 'lucide-react';
import { 
  BinRecord, 
  TruckRecord, 
  CollectionEvent, 
  ReportTab, 
  DateRangeFilter 
} from '../../types';
import { INITIAL_PUNE_BINS, calculateOverviewMetrics } from '../../data/puneBins';
import { INITIAL_PUNE_TRUCKS } from '../../data/puneFleet';
import { getAllWards, getAllZones } from '../../data/puneData';
import { complaintsApi } from '../../services/api';
import { getRiskBadgeClasses } from '../../services/riskEngine';

interface ReportsViewProps {
  bins?: BinRecord[];
  trucks?: TruckRecord[];
  events?: CollectionEvent[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  bins = INITIAL_PUNE_BINS,
  trucks = INITIAL_PUNE_TRUCKS,
  events = []
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily-collection');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('today');
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [complaints, setComplaints] = useState<any[]>([]);

  const allWards = useMemo(() => getAllWards(), []);
  const allZones = useMemo(() => getAllZones(), []);

  // Fetch complaints for complaint report
  useEffect(() => {
    complaintsApi.getComplaints().then((res) => {
      if (res?.complaints && Array.isArray(res.complaints)) {
        setComplaints(res.complaints);
      }
    }).catch(() => {
      // Offline fallback
    });
  }, []);

  // Filter bins by ward
  const scopedBins = useMemo(() => {
    if (selectedWard === 'all') return bins;
    return bins.filter((b) => b.wardId === selectedWard || b.location.ward === selectedWard);
  }, [bins, selectedWard]);

  // Filter trucks by ward
  const scopedTrucks = useMemo(() => {
    if (selectedWard === 'all') return trucks;
    return trucks.filter((t) => (t as any).assignedWardId === selectedWard || (t as any).wardId === selectedWard);
  }, [trucks, selectedWard]);

  // ==========================================
  // TAB A: Daily Collection Report Computations
  // ==========================================
  const totalEligibleStops = scopedBins.filter((b) => b.collectionStatus === 'assigned' || b.collectionStatus === 'collected').length || scopedBins.length;
  const completedStops = scopedBins.filter((b) => b.collectionStatus === 'collected').length;
  const missedStops = events.filter((e) => e.type === 'unable_to_collect' || (e as any).result === 'unable_to_collect').length;
  const pendingStops = Math.max(0, totalEligibleStops - completedStops - missedStops);
  const collectionCompletionPct = totalEligibleStops > 0 ? Math.round((completedStops / totalEligibleStops) * 100) : 0;
  
  // Real or simulated recorded weight sum
  const collectedWeightKg = scopedBins
    .filter((b) => b.collectionStatus === 'collected')
    .reduce((sum, b) => sum + (b.estimatedKg || 0), 0);

  // ==========================================
  // TAB B: Bin Status Report Computations
  // ==========================================
  const binMetrics = useMemo(() => calculateOverviewMetrics(scopedBins), [scopedBins]);

  // ==========================================
  // TAB C: Route Performance Report Computations
  // ==========================================
  const activeRoutesCount = trucks.filter((t) => t.status === 'Assigned' || (t.assignedBinIds && t.assignedBinIds.length > 0)).length;
  const completedRoutesCount = trucks.filter((t) => {
    const assigned = (t.assignedBinIds || []).length;
    const completed = (t.completedBinIds || []).length;
    return assigned > 0 && completed === assigned;
  }).length;
  const totalPlannedRouteStops = trucks.reduce((sum, t) => sum + (t.assignedBinIds || []).length, 0);
  const totalCompletedRouteStops = trucks.reduce((sum, t) => sum + (t.completedBinIds || []).length, 0);

  // ==========================================
  // TAB D: Complaint Report Computations
  // ==========================================
  const scopedComplaints = useMemo(() => {
    if (selectedWard === 'all') return complaints;
    return complaints.filter((c) => c.wardId === selectedWard);
  }, [complaints, selectedWard]);

  const newComplaints = scopedComplaints.filter((c) => c.status === 'submitted').length;
  const underReviewComplaints = scopedComplaints.filter((c) => c.status === 'under_review').length;
  const assignedComplaints = scopedComplaints.filter((c) => c.status === 'assigned').length;
  const resolvedComplaints = scopedComplaints.filter((c) => c.status === 'resolved').length;

  // Average resolution time in hours
  const avgResolutionTimeHours = useMemo(() => {
    const resolvedWithTimes = scopedComplaints.filter((c) => c.status === 'resolved' && c.createdAt && c.resolvedAt);
    if (resolvedWithTimes.length === 0) return null;
    const totalMs = resolvedWithTimes.reduce((sum, c) => {
      const start = new Date(c.createdAt).getTime();
      const end = new Date(c.resolvedAt).getTime();
      return sum + Math.max(0, end - start);
    }, 0);
    return Math.round((totalMs / resolvedWithTimes.length / (1000 * 3600)) * 10) / 10;
  }, [scopedComplaints]);

  // ==========================================
  // CSV Export Generator
  // ==========================================
  const handleExportCSV = () => {
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let headers: string[] = [];
    let rows: (string | number | boolean | null | undefined)[][] = [];
    const dateStamp = new Date().toISOString().slice(0, 10);

    if (activeTab === 'daily-collection') {
      headers = ['Shift Date', 'Bin Code', 'Bin Name', 'Ward', 'Sector', 'Fill %', 'Est Weight (kg)', 'Collection Status', 'Assigned Truck'];
      rows = scopedBins.map((b) => [
        dateStamp,
        b.code,
        b.name,
        b.location.ward,
        b.location.sector,
        b.currentFillPercent,
        b.estimatedKg,
        b.collectionStatus,
        b.assignedTruckId || 'Unassigned'
      ]);
    } else if (activeTab === 'bin-status') {
      headers = ['Bin Code', 'Bin Name', 'Ward', 'Sector', 'Fill %', 'Fill Threshold Band', 'Est Weight (kg)', 'Reading Source', 'Data Freshness', 'Location Status', 'Latitude', 'Longitude'];
      rows = scopedBins.map((b) => [
        b.code,
        b.name,
        b.location.ward,
        b.location.sector,
        b.currentFillPercent,
        b.fillThresholdStatus || (b.currentFillPercent >= 85 ? 'Critical' : b.currentFillPercent >= 70 ? 'High' : 'Normal'),
        b.estimatedKg,
        b.readingSource,
        b.dataFreshness || 'Recent',
        b.locationUnavailable ? 'Unmapped' : 'Mapped GPS',
        b.location.lat,
        b.location.lng
      ]);
    } else if (activeTab === 'route-performance') {
      headers = ['Truck Registration ID', 'Vehicle Model', 'Driver Name', 'Driver Contact', 'Depot Hub', 'Status', 'Planned Stops', 'Completed Stops', 'Completion %', 'Payload (kg)', 'Supported Capacity (kg)', 'Route Distance (km)', 'Est Duration (min)'];
      rows = scopedTrucks.map((t) => {
        const planned = (t.assignedBinIds || []).length;
        const comp = (t.completedBinIds || []).length;
        const pct = planned > 0 ? Math.round((comp / planned) * 100) : 0;
        return [
          t.id,
          t.name,
          t.driverName,
          t.driverPhone,
          t.depotName,
          t.status,
          planned,
          comp,
          pct,
          t.currentLoadKg,
          t.capacityKg,
          t.assignedRoute?.totalDistanceKm || 'Not available',
          t.assignedRoute?.totalDurationMinutes || 'Not available'
        ];
      });
    } else if (activeTab === 'complaints') {
      headers = ['Reference Code', 'Ward ID', 'Description', 'Status', 'Created Timestamp', 'Resolved Timestamp', 'Resolution Notes'];
      rows = scopedComplaints.map((c) => [
        c.referenceCode,
        c.wardId,
        c.description,
        c.status,
        c.createdAt || 'N/A',
        c.resolvedAt || 'Pending',
        c.resolutionNotes || 'None'
      ]);
    } else if (activeTab === 'ward-comparison') {
      headers = ['Ward Number', 'Ward Name', 'Zone', 'Source Reported Waste (TPD)', 'Reported Households', 'D2D Coverage %', 'Street Bins Count', 'Active Monitored Bins', 'Cleared Stops Today'];
      rows = allWards.map((w) => {
        const wardBins = bins.filter((b) => b.wardId === w.internal_id || b.location.ward.includes(w.ward_number_raw));
        const cleared = wardBins.filter((b) => b.collectionStatus === 'collected').length;
        return [
          w.ward_number_raw,
          w.ward_name,
          w.zone_name || 'Unassigned (Multi-Zone)',
          w.waste.reported_total_waste_tonnes_per_day,
          w.households.reported_total_households,
          w.households.d2d_listed_share_of_reported_households_pct,
          w.bins.street_bin_count,
          wardBins.length,
          cleared
        ];
      });
    }

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map((r) => r.map(escapeCsv).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sanchaya_${activeTab}_report_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-monsoon-200 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-basalt-900 font-sans">
              Municipal Operations Reports & Analytics
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-saffron-100 text-saffron-800 border border-saffron-200">
              Verified Records
            </span>
          </div>
          <p className="text-xs text-basalt-500 mt-0.5">
            Operational telemetry reports, daily collection logs, vehicle route metrics, and municipal ward comparisons.
          </p>
        </div>

        {/* CSV Export Action Button */}
        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-basalt-900 hover:bg-black text-white transition-colors shadow-xs cursor-pointer active:scale-98"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV ↓</span>
        </button>
      </div>

      {/* 2. Filter Bar: Date Range + Ward Selector */}
      <div className="p-3 rounded-xl bg-white border border-monsoon-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-basalt-400 text-[11px] font-medium mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-basalt-500" />
            Period:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'last-7-days', label: 'Last 7 Days' },
            { id: 'month-to-date', label: 'Month to Date' },
            { id: 'all-time', label: 'All Recorded' },
          ].map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDateRange(d.id as any)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                dateRange === d.id
                  ? 'bg-basalt-900 text-white'
                  : 'bg-monsoon-100 text-basalt-600 hover:bg-monsoon-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Ward Selector */}
        <div className="flex items-center gap-2">
          <span className="text-basalt-500 text-[11px]">Ward Filter:</span>
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="py-1 px-2.5 rounded-md bg-monsoon-50 border border-monsoon-300 text-basalt-800 text-xs focus:outline-none"
          >
            <option value="all">All Wards (Pune Citywide)</option>
            <option value="pune-ward-15">Ward 15 — Kasba / Shaniwar Peth</option>
            <option value="pune-ward-8">Ward 8 — Shivajinagar / Aundh</option>
            <option value="pune-ward-10">Ward 10 — Kothrud / Karvenagar</option>
            <option value="pune-ward-22">Ward 22 — Hadapsar / Magarpatta</option>
            <option value="pune-ward-3">Ward 3 — Viman Nagar</option>
          </select>
        </div>
      </div>

      {/* 3. Report Sub-Tabs Navigation */}
      <div className="flex border-b border-monsoon-200 overflow-x-auto gap-2 text-xs font-bold">
        {[
          { id: 'daily-collection' as ReportTab, label: 'Daily Collection', count: `${completedStops}/${totalEligibleStops}` },
          { id: 'bin-status' as ReportTab, label: 'Bin Status', count: `${scopedBins.length}` },
          { id: 'route-performance' as ReportTab, label: 'Route Performance', count: `${activeRoutesCount} Active` },
          { id: 'complaints' as ReportTab, label: 'Complaints Resolution', count: `${scopedComplaints.length}` },
          { id: 'ward-comparison' as ReportTab, label: 'Ward & Zone Comparison', count: '42 Wards' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-3 border-b-2 font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'border-saffron-600 text-saffron-700 bg-saffron-50/50'
                : 'border-transparent text-basalt-600 hover:text-basalt-900 hover:border-monsoon-300'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-monsoon-100 text-basalt-600 border border-monsoon-200">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ==================================================== */}
      {/* REPORT CONTENT SECTIONS                              */}
      {/* ==================================================== */}

      {/* REPORT A: Daily Collection Report */}
      {activeTab === 'daily-collection' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-white border border-monsoon-200 shadow-xs">
              <span className="text-basalt-500 uppercase text-[10px] font-bold block">Eligible Stops</span>
              <span className="text-xl font-bold font-mono text-basalt-900 mt-0.5 block">{totalEligibleStops}</span>
              <span className="text-[10.5px] text-basalt-400">Scheduled targets</span>
            </div>
            <div className="p-3 rounded-xl bg-sahyadri-50 border border-sahyadri-200 shadow-xs">
              <span className="text-sahyadri-800 uppercase text-[10px] font-bold block">Completed</span>
              <span className="text-xl font-bold font-mono text-sahyadri-700 mt-0.5 block">{completedStops}</span>
              <span className="text-[10.5px] text-sahyadri-700">Verified cleared</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 shadow-xs">
              <span className="text-amber-800 uppercase text-[10px] font-bold block">Pending</span>
              <span className="text-xl font-bold font-mono text-amber-700 mt-0.5 block">{pendingStops}</span>
              <span className="text-[10.5px] text-amber-700">In route queue</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 shadow-xs">
              <span className="text-rose-800 uppercase text-[10px] font-bold block">Missed / Obstacles</span>
              <span className="text-xl font-bold font-mono text-rose-700 mt-0.5 block">{missedStops}</span>
              <span className="text-[10.5px] text-rose-700">Reported issues</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-monsoon-200 shadow-xs">
              <span className="text-basalt-500 uppercase text-[10px] font-bold block">Completion Rate</span>
              <span className="text-xl font-bold font-mono text-sahyadri-700 mt-0.5 block">{collectionCompletionPct}%</span>
              <span className="text-[10.5px] text-basalt-400">Shift performance</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-monsoon-200 shadow-xs">
              <span className="text-basalt-500 uppercase text-[10px] font-bold block">Collected Weight</span>
              <span className="text-xl font-bold font-mono text-saffron-800 mt-0.5 block">{collectedWeightKg} kg</span>
              <span className="text-[10.5px] text-basalt-400">Recorded payload</span>
            </div>
          </div>

          {/* Detailed Stops Table */}
          <div className="rounded-xl bg-white border border-monsoon-200 shadow-xs overflow-hidden text-xs">
            <div className="p-3 bg-monsoon-50 border-b border-monsoon-200 font-bold text-basalt-800 flex items-center justify-between">
              <span>Shift Stops Ledger & Event Telemetry</span>
              <span className="text-basalt-500 text-[11px] font-normal font-mono">{scopedBins.length} Records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-monsoon-100/60 text-basalt-600 font-bold uppercase text-[10px] tracking-wider border-b border-monsoon-200">
                  <tr>
                    <th className="px-3.5 py-2">Stop Code</th>
                    <th className="px-3.5 py-2">Location & Landmark</th>
                    <th className="px-3.5 py-2">Ward Corridor</th>
                    <th className="px-3.5 py-2 text-center">Fill %</th>
                    <th className="px-3.5 py-2 text-right">Recorded Weight</th>
                    <th className="px-3.5 py-2">Assigned Truck</th>
                    <th className="px-3.5 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-monsoon-100 text-basalt-800">
                  {scopedBins.map((bin) => {
                    const isCollected = bin.collectionStatus === 'collected';
                    return (
                      <tr key={bin.id} className="hover:bg-monsoon-50/70">
                        <td className="px-3.5 py-2 font-mono font-bold">{bin.code}</td>
                        <td className="px-3.5 py-2">
                          <span className="font-semibold block">{bin.name}</span>
                          <span className="text-[10.5px] text-basalt-500 block truncate max-w-xs">{bin.location.address}</span>
                        </td>
                        <td className="px-3.5 py-2 text-basalt-700">{bin.location.ward}</td>
                        <td className="px-3.5 py-2 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10.5px] font-bold ${getRiskBadgeClasses(bin.riskCategory)}`}>
                            {bin.currentFillPercent}%
                          </span>
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono font-semibold">
                          {isCollected ? `${bin.estimatedKg} kg` : <span className="text-basalt-400 italic">Pending</span>}
                        </td>
                        <td className="px-3.5 py-2 font-mono">
                          {bin.assignedTruckId || <span className="text-basalt-400 italic">Unassigned</span>}
                        </td>
                        <td className="px-3.5 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isCollected ? 'bg-sahyadri-100 text-sahyadri-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {bin.collectionStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT B: Bin Status Report */}
      {activeTab === 'bin-status' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-white border border-monsoon-200 shadow-xs">
              <span className="text-basalt-500 uppercase text-[10px] font-bold block">Total Bins</span>
              <span className="text-xl font-bold font-mono text-basalt-900 mt-0.5 block">{binMetrics.totalBins}</span>
              <span className="text-[10.5px] text-basalt-400">Inventory size</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs">
              <span className="text-emerald-800 uppercase text-[10px] font-bold block">Normal (&lt;70%)</span>
              <span className="text-xl font-bold font-mono text-emerald-700 mt-0.5 block">{binMetrics.normalBins}</span>
              <span className="text-[10.5px] text-emerald-600">Stable fill</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 shadow-xs">
              <span className="text-amber-800 uppercase text-[10px] font-bold block">High (70–84%)</span>
              <span className="text-xl font-bold font-mono text-amber-700 mt-0.5 block">{binMetrics.highBins}</span>
              <span className="text-[10.5px] text-amber-600">Monitor closely</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 shadow-xs">
              <span className="text-rose-800 uppercase text-[10px] font-bold block">Critical (85–99%)</span>
              <span className="text-xl font-bold font-mono text-rose-700 mt-0.5 block">{binMetrics.criticalBins}</span>
              <span className="text-[10.5px] text-rose-600">Urgent clearance</span>
            </div>
            <div className="p-3 rounded-xl bg-red-100 border border-red-300 shadow-xs">
              <span className="text-red-900 uppercase text-[10px] font-bold block">Full (100%)</span>
              <span className="text-xl font-bold font-mono text-red-800 mt-0.5 block">{binMetrics.fullBins}</span>
              <span className="text-[10.5px] text-red-700">Overflow risk</span>
            </div>
            <div className="p-3 rounded-xl bg-monsoon-100 border border-monsoon-300 shadow-xs">
              <span className="text-basalt-600 uppercase text-[10px] font-bold block">Unmapped GPS</span>
              <span className="text-xl font-bold font-mono text-basalt-800 mt-0.5 block">{binMetrics.locationUnavailableCount}</span>
              <span className="text-[10.5px] text-basalt-500">Unmapped sector</span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="rounded-xl bg-white border border-monsoon-200 shadow-xs overflow-hidden text-xs">
            <div className="p-3 bg-monsoon-50 border-b border-monsoon-200 font-bold text-basalt-800 flex items-center justify-between">
              <span>Ward & Colony Inventory Telemetry</span>
              <span className="text-basalt-500 text-[11px] font-normal font-mono">{scopedBins.length} Records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-monsoon-100/60 text-basalt-600 font-bold uppercase text-[10px] tracking-wider border-b border-monsoon-200">
                  <tr>
                    <th className="px-3.5 py-2">Code</th>
                    <th className="px-3.5 py-2">Area / Colony</th>
                    <th className="px-3.5 py-2">Ward Name</th>
                    <th className="px-3.5 py-2 text-center">Fill Band</th>
                    <th className="px-3.5 py-2 text-right">Est. Weight</th>
                    <th className="px-3.5 py-2">Source</th>
                    <th className="px-3.5 py-2">GPS Mapping Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-monsoon-100 text-basalt-800">
                  {scopedBins.map((bin) => (
                    <tr key={bin.id} className="hover:bg-monsoon-50/70">
                      <td className="px-3.5 py-2 font-mono font-bold text-basalt-900">{bin.code}</td>
                      <td className="px-3.5 py-2">
                        <span className="font-semibold block">{bin.colonyName || bin.name}</span>
                        <span className="text-[10.5px] text-basalt-500 block truncate max-w-xs">{bin.location.address}</span>
                      </td>
                      <td className="px-3.5 py-2 text-basalt-700">{bin.location.ward}</td>
                      <td className="px-3.5 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getRiskBadgeClasses(bin.riskCategory)}`}>
                          {bin.currentFillPercent}%
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-semibold">
                        ~{bin.estimatedKg} kg
                      </td>
                      <td className="px-3.5 py-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-monsoon-100 text-basalt-700">
                          {bin.readingSource === 'sensor' ? 'IOT SENSOR' : 'SIMULATED'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2">
                        {bin.locationUnavailable ? (
                          <span className="text-amber-800 font-bold text-[10.5px]">⚠️ Location Unavailable</span>
                        ) : (
                          <span className="text-sahyadri-800 font-mono text-[10.5px]">Mapped ({bin.location.lat.toFixed(3)}, {bin.location.lng.toFixed(3)})</span>
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

      {/* REPORT C: Route Performance Report */}
      {activeTab === 'route-performance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-monsoon-200 shadow-xs">
              <span className="text-basalt-500 uppercase text-[10px] font-bold block">Active Routes</span>
              <span className="text-2xl font-bold font-mono text-basalt-900 mt-0.5 block">{activeRoutesCount}</span>
              <span className="text-[10.5px] text-saffron-700">Dispatched corridors</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-monsoon-200 shadow-xs">
              <span className="text-basalt-500 uppercase text-[10px] font-bold block">Completed Routes</span>
              <span className="text-2xl font-bold font-mono text-sahyadri-700 mt-0.5 block">{completedRoutesCount}</span>
              <span className="text-[10.5px] text-sahyadri-700">100% stops cleared</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-monsoon-200 shadow-xs">
              <span className="text-basalt-500 uppercase text-[10px] font-bold block">Planned vs Completed</span>
              <span className="text-2xl font-bold font-mono text-basalt-900 mt-0.5 block">
                {totalCompletedRouteStops} / {totalPlannedRouteStops}
              </span>
              <span className="text-[10.5px] text-basalt-400">Total stops</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-monsoon-200 shadow-xs">
              <span className="text-basalt-500 uppercase text-[10px] font-bold block">Obstacles Logged</span>
              <span className="text-2xl font-bold font-mono text-rose-700 mt-0.5 block">{missedStops}</span>
              <span className="text-[10.5px] text-rose-700">Road blocks/access issues</span>
            </div>
          </div>

          {/* Route Performance Table */}
          <div className="rounded-xl bg-white border border-monsoon-200 shadow-xs overflow-hidden text-xs">
            <div className="p-3 bg-monsoon-50 border-b border-monsoon-200 font-bold text-basalt-800 flex items-center justify-between">
              <span>Vehicle Route Execution & Distance Telemetry</span>
              <span className="text-basalt-500 text-[11px] font-normal font-mono">{scopedTrucks.length} Vehicles</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-monsoon-100/60 text-basalt-600 font-bold uppercase text-[10px] tracking-wider border-b border-monsoon-200">
                  <tr>
                    <th className="px-3.5 py-2">Vehicle ID</th>
                    <th className="px-3.5 py-2">Driver</th>
                    <th className="px-3.5 py-2">Depot & Route</th>
                    <th className="px-3.5 py-2 text-center">Stops (Done/Total)</th>
                    <th className="px-3.5 py-2 text-right">Distance</th>
                    <th className="px-3.5 py-2 text-right">Est. Duration</th>
                    <th className="px-3.5 py-2 text-right">Payload Usage</th>
                    <th className="px-3.5 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-monsoon-100 text-basalt-800">
                  {scopedTrucks.map((truck) => {
                    const assigned = (truck.assignedBinIds || []).length;
                    const comp = (truck.completedBinIds || []).length;
                    const pct = assigned > 0 ? Math.round((comp / assigned) * 100) : 0;
                    return (
                      <tr key={truck.id} className="hover:bg-monsoon-50/70">
                        <td className="px-3.5 py-2 font-mono font-bold">{truck.id}</td>
                        <td className="px-3.5 py-2">
                          <span className="font-semibold block">{truck.driverName}</span>
                          <span className="text-[10.5px] text-basalt-500 font-mono">{truck.driverPhone}</span>
                        </td>
                        <td className="px-3.5 py-2 text-basalt-700">{truck.depotName}</td>
                        <td className="px-3.5 py-2 text-center font-mono font-bold">
                          {comp} / {assigned} ({pct}%)
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono">
                          {truck.assignedRoute?.totalDistanceKm ? `${truck.assignedRoute.totalDistanceKm} km` : <span className="text-basalt-400 italic">Not available</span>}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono">
                          {truck.assignedRoute?.totalDurationMinutes ? `${truck.assignedRoute.totalDurationMinutes} min` : <span className="text-basalt-400 italic">Not available</span>}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono font-semibold">
                          {truck.currentLoadKg} / {truck.capacityKg} kg
                        </td>
                        <td className="px-3.5 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            truck.status === 'Assigned' ? 'bg-saffron-100 text-saffron-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {truck.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT D: Complaints Resolution Report */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-white border border-monsoon-200 shadow-xs">
              <span className="text-basalt-500 uppercase text-[10px] font-bold block">Total Complaints</span>
              <span className="text-xl font-bold font-mono text-basalt-900 mt-0.5 block">{scopedComplaints.length}</span>
              <span className="text-[10.5px] text-basalt-400">All submissions</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 shadow-xs">
              <span className="text-rose-800 uppercase text-[10px] font-bold block">Submitted (New)</span>
              <span className="text-xl font-bold font-mono text-rose-700 mt-0.5 block">{newComplaints}</span>
              <span className="text-[10.5px] text-rose-600">Pending initial review</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 shadow-xs">
              <span className="text-amber-800 uppercase text-[10px] font-bold block">Under Review</span>
              <span className="text-xl font-bold font-mono text-amber-700 mt-0.5 block">{underReviewComplaints}</span>
              <span className="text-[10.5px] text-amber-600">Field assessment</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 shadow-xs">
              <span className="text-blue-800 uppercase text-[10px] font-bold block">Assigned</span>
              <span className="text-xl font-bold font-mono text-blue-700 mt-0.5 block">{assignedComplaints}</span>
              <span className="text-[10.5px] text-blue-600">Truck dispatched</span>
            </div>
            <div className="p-3 rounded-xl bg-sahyadri-50 border border-sahyadri-200 shadow-xs">
              <span className="text-sahyadri-800 uppercase text-[10px] font-bold block">Resolved</span>
              <span className="text-xl font-bold font-mono text-sahyadri-700 mt-0.5 block">{resolvedComplaints}</span>
              <span className="text-[10.5px] text-sahyadri-600">Verified cleared</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-monsoon-200 shadow-xs">
              <span className="text-basalt-500 uppercase text-[10px] font-bold block">Avg Resolution Time</span>
              <span className="text-xl font-bold font-mono text-basalt-900 mt-0.5 block">
                {avgResolutionTimeHours !== null ? `${avgResolutionTimeHours} hrs` : <span className="text-xs text-basalt-400">Not recorded</span>}
              </span>
              <span className="text-[10.5px] text-basalt-400">Timestamp delta</span>
            </div>
          </div>

          {/* Complaints Table */}
          <div className="rounded-xl bg-white border border-monsoon-200 shadow-xs overflow-hidden text-xs">
            <div className="p-3 bg-monsoon-50 border-b border-monsoon-200 font-bold text-basalt-800 flex items-center justify-between">
              <span>Public Grievances Log</span>
              <span className="text-basalt-500 text-[11px] font-normal font-mono">{scopedComplaints.length} Records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-monsoon-100/60 text-basalt-600 font-bold uppercase text-[10px] tracking-wider border-b border-monsoon-200">
                  <tr>
                    <th className="px-3.5 py-2">Ref Code</th>
                    <th className="px-3.5 py-2">Ward Corridor</th>
                    <th className="px-3.5 py-2">Grievance Description</th>
                    <th className="px-3.5 py-2">Submitted Time</th>
                    <th className="px-3.5 py-2">Resolution Time</th>
                    <th className="px-3.5 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-monsoon-100 text-basalt-800">
                  {scopedComplaints.map((c) => (
                    <tr key={c.id || c.referenceCode} className="hover:bg-monsoon-50/70">
                      <td className="px-3.5 py-2 font-mono font-bold">{c.referenceCode}</td>
                      <td className="px-3.5 py-2 text-basalt-700">{c.wardId}</td>
                      <td className="px-3.5 py-2">
                        <span className="line-clamp-2 leading-snug">{c.description}</span>
                        {c.resolutionNotes && (
                          <span className="text-[10.5px] text-sahyadri-800 font-medium block mt-0.5">
                            Resolution: {c.resolutionNotes}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 text-basalt-500 font-mono">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-3.5 py-2 text-basalt-500 font-mono">
                        {c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : <span className="text-basalt-400 italic">Pending</span>}
                      </td>
                      <td className="px-3.5 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.status === 'resolved' ? 'bg-sahyadri-100 text-sahyadri-800' :
                          c.status === 'under_review' ? 'bg-amber-100 text-amber-800' :
                          c.status === 'assigned' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT E: Ward & Zone Comparison Matrix */}
      {activeTab === 'ward-comparison' && (
        <div className="space-y-4">
          {/* Prominent Provenance Distinction Notice */}
          <div className="p-3.5 rounded-xl bg-monsoon-100 border border-monsoon-300 text-xs text-basalt-800 shadow-xs flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-saffron-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-basalt-900">
                Data Provenance Separation: Macro PMC Statistics vs Operational Event Telemetry
              </strong>
              <span className="text-[11px] text-basalt-600 block mt-0.5 leading-relaxed">
                Source waste quantities (TPD) and household counts reflect official Pune Municipal Corporation master dataset reporting across 42 wards. Active monitored bins and cleared stops reflect live operational events recorded in this session.
              </span>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="rounded-xl bg-white border border-monsoon-200 shadow-xs overflow-hidden text-xs">
            <div className="p-3 bg-monsoon-50 border-b border-monsoon-200 font-bold text-basalt-800 flex items-center justify-between">
              <span>Pune Municipal Ward Operational Comparison Matrix</span>
              <span className="text-basalt-500 text-[11px] font-normal font-mono">42 Administrative Wards</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-monsoon-100/60 text-basalt-600 font-bold uppercase text-[10px] tracking-wider border-b border-monsoon-200">
                  <tr>
                    <th className="px-3.5 py-2">Ward # & Name</th>
                    <th className="px-3.5 py-2">Zone</th>
                    <th className="px-3.5 py-2 text-right">Reported Waste (TPD)</th>
                    <th className="px-3.5 py-2 text-right">Reported Households</th>
                    <th className="px-3.5 py-2 text-right">D2D Listed %</th>
                    <th className="px-3.5 py-2 text-right">Street Bins</th>
                    <th className="px-3.5 py-2 text-center">Active Monitored Bins</th>
                    <th className="px-3.5 py-2 text-center">Cleared Stops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-monsoon-100 text-basalt-800">
                  {allWards.map((w) => {
                    const wardBins = bins.filter((b) => b.wardId === w.internal_id || b.location.ward.includes(w.ward_number_raw));
                    const cleared = wardBins.filter((b) => b.collectionStatus === 'collected').length;
                    return (
                      <tr key={w.internal_id} className="hover:bg-monsoon-50/70">
                        <td className="px-3.5 py-2">
                          <span className="font-mono font-bold text-basalt-900 block">Ward {w.ward_number_raw}</span>
                          <span className="text-[11px] text-basalt-600 block">{w.ward_name}</span>
                        </td>
                        <td className="px-3.5 py-2 text-basalt-700">
                          {w.zone_name || <span className="text-amber-800 font-bold">Unassigned (Multi-Zone)</span>}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono font-bold text-saffron-800">
                          {w.waste.reported_total_waste_tonnes_per_day.toFixed(2)} TPD
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono">
                          {w.households.reported_total_households.toLocaleString()}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono">
                          {w.households.d2d_listed_share_of_reported_households_pct}%
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono text-basalt-600">
                          {w.bins.street_bin_count}
                        </td>
                        <td className="px-3.5 py-2 text-center font-mono">
                          {wardBins.length > 0 ? (
                            <span className="font-bold text-saffron-800">{wardBins.length} bins</span>
                          ) : (
                            <span className="text-basalt-400 italic">0</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2 text-center font-mono font-bold text-sahyadri-700">
                          {cleared > 0 ? `${cleared} ✓` : <span className="text-basalt-400 font-normal">0</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
