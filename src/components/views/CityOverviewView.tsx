import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Building2, 
  Trash2, 
  Truck, 
  Layers, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  ArrowUpRight,
  Radio,
  Clock,
  Zap,
  Route,
  RefreshCw,
  AlertCircle,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { 
  getCitySummary, 
  getAllWards, 
  PUNE_MUNICIPAL_METADATA 
} from '../../data/puneData';
import { 
  INITIAL_PUNE_BINS, 
  calculateOverviewMetrics 
} from '../../data/puneBins';
import { INITIAL_PUNE_TRUCKS } from '../../data/puneFleet';
import { PuneOperationsMap } from '../map/PuneOperationsMap';
import { NavigationView, BinRecord, TruckRecord } from '../../types';
import { dispatchApi, complaintsApi } from '../../services/api';

interface CityOverviewViewProps {
  onNavigateView: (view: NavigationView) => void;
  bins?: BinRecord[];
  trucks?: TruckRecord[];
  onInspectBin?: (bin: BinRecord) => void;
  onSelectTruck?: (truck: TruckRecord) => void;
}

export const CityOverviewView: React.FC<CityOverviewViewProps> = ({ 
  onNavigateView,
  bins = INITIAL_PUNE_BINS,
  trucks = INITIAL_PUNE_TRUCKS,
  onInspectBin,
  onSelectTruck
}) => {
  // Activity stream & live simulation state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isSpiking, setIsSpiking] = useState(false);
  const [spikeMessage, setSpikeMessage] = useState<string | null>(null);
  const [complaintsCount, setComplaintsCount] = useState<number>(2); // Default fallback

  // Calculate coherent bin metrics from active inventory
  const binMetrics = useMemo(() => calculateOverviewMetrics(bins), [bins]);

  // Fetch recent activities from backend
  const fetchActivities = useCallback(async () => {
    try {
      const res = await dispatchApi.getActivityStream(8);
      if (res.activities && Array.isArray(res.activities)) {
        setActivityLogs(res.activities);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  // Fetch open complaints count
  const fetchComplaints = useCallback(async () => {
    try {
      const res = await complaintsApi.getComplaints();
      if (res && Array.isArray(res.complaints)) {
        const open = res.complaints.filter((c: any) => c.status !== 'resolved' && c.status !== 'rejected').length;
        setComplaintsCount(open);
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    fetchComplaints();
    const interval = setInterval(fetchActivities, 12000);
    return () => clearInterval(interval);
  }, [fetchActivities, fetchComplaints]);

  const handleTriggerSpike = async (binId: string, fill = 96) => {
    if (isSpiking) return;
    setIsSpiking(true);
    try {
      const res = await dispatchApi.simulateSensorSpike(binId, fill);
      setSpikeMessage(res.message || `Sensor telemetry: bin ${binId} updated to ${fill}%`);
      await fetchActivities();
      setTimeout(() => setSpikeMessage(null), 6000);
    } catch (err: any) {
      console.warn('Spike trigger error:', err);
    } finally {
      setIsSpiking(false);
    }
  };

  // Fleet operational segmentation
  const assignedTrucks = trucks.filter((t) => t.status === 'Assigned' || (t.assignedBinIds && t.assignedBinIds.length > 0));
  const availableTrucks = trucks.filter((t) => t.status === 'Available');
  const collectingTrucks = trucks.filter((t) => t.status === 'Collecting');

  // Operational Question 1: Which bins need attention now?
  const urgentBinsCount = binMetrics.criticalBins + binMetrics.fullBins;

  // Operational Question 3: Stops completed
  const totalStopsCount = binMetrics.totalBins;
  const completedStopsCount = binMetrics.collectedBins;
  const shiftProgressPercent = totalStopsCount > 0 ? Math.round((completedStopsCount / totalStopsCount) * 100) : 0;

  // Date formatting for header
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* 1. Compact Page Header with Operational Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-monsoon-200 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-basalt-900 font-sans">
              Pune Municipal Operations
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-saffron-50 text-saffron-800 border border-saffron-200">
              Shift Active
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-basalt-500">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-basalt-400" />
              {todayFormatted}
            </span>
            <span>•</span>
            <span className="text-sahyadri-700 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sahyadri-500 animate-pulse" />
              Live Central Telemetry
            </span>
            <span>•</span>
            <span>PMC Operations Directorate</span>
          </div>
        </div>

        {/* Quick Operational Jump Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateView('reports')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-basalt-700 border border-monsoon-300 hover:bg-monsoon-100 transition-colors cursor-pointer shadow-xs"
          >
            <span>Reports</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-basalt-400" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('live-operations')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-saffron-600 text-white hover:bg-saffron-700 transition-colors cursor-pointer shadow-xs"
          >
            <span>Live Dispatch Map</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-white/80" />
          </button>
        </div>
      </div>

      {/* 2. Meaningful Core Operational Metrics Row (Answers Questions 1, 2, 3, 4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Which bins need attention now? */}
        <div 
          onClick={() => onNavigateView('wards-bins')}
          className="p-3.5 rounded-xl bg-white border border-monsoon-200 hover:border-saffron-300 transition-colors shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-basalt-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-basalt-600">Critical Bins</span>
            <AlertCircle className={`w-4 h-4 ${urgentBinsCount > 0 ? 'text-rose-600' : 'text-basalt-400'}`} />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-extrabold tracking-tight font-mono ${urgentBinsCount > 0 ? 'text-rose-700' : 'text-basalt-900'}`}>
              {urgentBinsCount}
            </span>
            <span className="text-xs text-basalt-500 font-medium">
              &ge;85% fill level
            </span>
          </div>
          <p className="text-[11px] text-basalt-500 mt-1 leading-snug">
            {binMetrics.fullBins > 0 ? `${binMetrics.fullBins} full (100%), ` : ''}{binMetrics.criticalAwaitingCollection} awaiting clearing
          </p>
        </div>

        {/* Metric 2: Which automatic routes are active? */}
        <div 
          onClick={() => onNavigateView('live-operations')}
          className="p-3.5 rounded-xl bg-white border border-monsoon-200 hover:border-saffron-300 transition-colors shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-basalt-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-basalt-600">Active Routes</span>
            <Route className="w-4 h-4 text-saffron-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold tracking-tight text-basalt-900 font-mono">
              {assignedTrucks.length}
            </span>
            <span className="text-xs text-saffron-700 font-medium">
              Auto-dispatched
            </span>
          </div>
          <p className="text-[11px] text-basalt-500 mt-1 leading-snug">
            {availableTrucks.length} standby • {collectingTrucks.length} collecting
          </p>
        </div>

        {/* Metric 3: Stops completed today */}
        <div 
          onClick={() => onNavigateView('reports')}
          className="p-3.5 rounded-xl bg-white border border-monsoon-200 hover:border-saffron-300 transition-colors shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-basalt-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-basalt-600">Stops Completed</span>
            <CheckCircle2 className="w-4 h-4 text-sahyadri-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold tracking-tight text-sahyadri-700 font-mono">
              {completedStopsCount}
            </span>
            <span className="text-xs text-basalt-500 font-medium">
              of {totalStopsCount} stops
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 bg-monsoon-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-sahyadri-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${shiftProgressPercent}%` }}
              />
            </div>
            <span className="font-mono text-[10px] font-bold text-sahyadri-800">{shiftProgressPercent}%</span>
          </div>
        </div>

        {/* Metric 4: What remains unresolved today? */}
        <div 
          onClick={() => onNavigateView('complaints')}
          className="p-3.5 rounded-xl bg-white border border-monsoon-200 hover:border-saffron-300 transition-colors shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-basalt-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-basalt-600">Open Complaints</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold tracking-tight text-basalt-900 font-mono">
              {complaintsCount}
            </span>
            <span className="text-xs text-amber-700 font-medium">
              Grievances
            </span>
          </div>
          <p className="text-[11px] text-basalt-500 mt-1 leading-snug">
            Public reports under municipal review
          </p>
        </div>
      </div>

      {/* 3. Large Operations Map Canvas (Central Operational View) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-basalt-800">
            <Layers className="w-4 h-4 text-saffron-600" />
            <h2 className="text-sm font-bold text-basalt-900">
              Pune Municipal Operations Map
            </h2>
          </div>
          <span className="text-basalt-500 text-[11px]">
            Click any marker to inspect payload details or reassign vehicle
          </span>
        </div>

        <PuneOperationsMap
          bins={bins}
          trucks={trucks}
          onSelectBin={onInspectBin}
          onSelectTruck={onSelectTruck}
        />
      </div>

      {/* 4. Lower Operational Split: Active Routes List & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Col (2 spans): Compact Active Routes */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-white border border-monsoon-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-monsoon-200 pb-2.5">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-saffron-600" />
              <h3 className="font-bold text-basalt-900 text-sm">
                Active Automatic Routes
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateView('fleet')}
              className="text-xs font-semibold text-saffron-700 hover:underline cursor-pointer"
            >
              Fleet Directory ({trucks.length}) &rarr;
            </button>
          </div>

          {/* Active Route Cards List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {assignedTrucks.map((truck) => {
              const assignedBinList = (truck.assignedBinIds || [])
                .map((id) => bins.find((b) => b.id === id))
                .filter(Boolean) as BinRecord[];

              const completedCount = (truck.completedBinIds || []).length;
              const totalStops = assignedBinList.length;
              const progressPct = totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;
              const loadPct = Math.round((truck.currentLoadKg / truck.capacityKg) * 100);

              const nextBin = assignedBinList.find((b) => !(truck.completedBinIds || []).includes(b.id) && b.collectionStatus !== 'collected');

              return (
                <div
                  key={truck.id}
                  onClick={() => onSelectTruck?.(truck)}
                  className="p-3 rounded-lg border border-monsoon-200 bg-monsoon-50/70 hover:bg-white hover:border-saffron-300 transition-all cursor-pointer shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: truck.color || '#D3832B' }}
                        />
                        <span className="font-mono font-bold text-basalt-900 text-xs">{truck.id}</span>
                      </div>
                      <span className="text-[11px] text-basalt-600 block mt-0.5">
                        {truck.driverName} • {truck.depotName.replace('Municipal Fleet Depot', 'Depot')}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-saffron-100 text-saffron-800">
                      {progressPct === 100 ? 'Completed' : 'Collecting'}
                    </span>
                  </div>

                  {/* Load Bar */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-basalt-500">Payload:</span>
                      <span className="font-mono font-bold text-basalt-800">
                        {truck.currentLoadKg} / {truck.capacityKg} kg
                      </span>
                    </div>
                    <div className="w-full bg-monsoon-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, loadPct)}%`,
                          backgroundColor: loadPct > 90 ? '#E11D48' : truck.color || '#D3832B',
                        }}
                      />
                    </div>
                  </div>

                  {/* Progress & Next Stop */}
                  <div className="pt-1 border-t border-monsoon-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-basalt-600">
                      Cleared: <strong>{completedCount}/{totalStops}</strong>
                    </span>
                    {nextBin ? (
                      <span className="font-mono text-[10px] text-saffron-800 font-bold truncate max-w-[140px]">
                        Next: {nextBin.code} ({nextBin.currentFillPercent}%)
                      </span>
                    ) : (
                      <span className="text-[10px] text-sahyadri-700 font-bold">
                        Shift Complete ✓
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Short Recent Activity Feed */}
        <div className="p-4 rounded-xl bg-white border border-monsoon-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-monsoon-200 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-basalt-900 text-sm">
                <Radio className="w-3.5 h-3.5 text-saffron-600" />
                <span>Operational Activity</span>
              </div>
              <button
                type="button"
                onClick={fetchActivities}
                title="Refresh log"
                className="text-basalt-400 hover:text-basalt-700 p-0.5 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Notification alert if triggered */}
            {spikeMessage && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0 fill-current" />
                <span className="truncate">{spikeMessage}</span>
              </div>
            )}

            {/* Recent Activity List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
              {activityLogs.length > 0 ? (
                activityLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-monsoon-50/80 border border-monsoon-200/80 text-[11px] space-y-0.5"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-saffron-800 uppercase tracking-wide">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-basalt-400 font-mono">
                        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                      </span>
                    </div>
                    <p className="text-basalt-800 leading-snug line-clamp-2">
                      {log.message}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-basalt-400 text-xs italic">
                  Operational routes active. No recent errors.
                </div>
              )}
            </div>
          </div>

          {/* Compact Telemetry Trigger */}
          <div className="pt-2 border-t border-monsoon-200/80 flex items-center justify-between text-[11px]">
            <span className="text-basalt-500 font-medium">IoT Telemetry Event:</span>
            <button
              type="button"
              disabled={isSpiking}
              onClick={() => handleTriggerSpike('WW-PUN-01', 96)}
              className="px-2 py-1 rounded-md text-[10.5px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 cursor-pointer disabled:opacity-50 transition-colors"
            >
              ⚡ Signal WW-PUN-01 (96%)
            </button>
          </div>
        </div>
      </div>

      {/* 5. Directorate Footer */}
      <div className="pt-2 border-t border-monsoon-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-basalt-500">
        <span>
          SANCHAYA Pune Operations Directorate • Master Operations Dataset v1.0.0
        </span>
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => onNavigateView('data-quality')}
            className="hover:text-basalt-800 underline font-medium cursor-pointer"
          >
            Data Quality & Caveats
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigateView('reports')}
            className="hover:text-basalt-800 underline font-medium cursor-pointer"
          >
            View Full Reports
          </button>
        </div>
      </div>
    </div>
  );
};
