import React, { useState } from 'react';
import { 
  Navigation, 
  Truck, 
  MapPin, 
  Layers, 
  Route, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Zap,
  Clock,
  ArrowRight
} from 'lucide-react';
import { BinRecord, TruckRecord } from '../../types';
import { PuneOperationsMap } from '../map/PuneOperationsMap';
import { dispatchApi } from '../../services/api';

interface LiveOperationsViewProps {
  bins: BinRecord[];
  trucks: TruckRecord[];
  onInspectBin?: (bin: BinRecord) => void;
  onSelectTruck?: (truck: TruckRecord) => void;
  onReassignBin?: (binId: string, truckId: string) => void;
}

export const LiveOperationsView: React.FC<LiveOperationsViewProps> = ({
  bins,
  trucks,
  onInspectBin,
  onSelectTruck,
  onReassignBin
}) => {
  const [selectedTruckId, setSelectedTruckId] = useState<string>(trucks[0]?.id || '');
  const [isSpiking, setIsSpiking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedTruck = trucks.find((t) => t.id === selectedTruckId) || trucks[0];

  const assignedBins = selectedTruck
    ? (selectedTruck.assignedBinIds || [])
        .map((id) => bins.find((b) => b.id === id))
        .filter(Boolean) as BinRecord[]
    : [];

  const completedCount = (selectedTruck?.completedBinIds || []).length;
  const totalStops = assignedBins.length;
  const progressPercent = totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;

  const handleSpike = async (binId: string) => {
    if (isSpiking) return;
    setIsSpiking(true);
    try {
      const res = await dispatchApi.simulateSensorSpike(binId, 96);
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback(err.message || 'Spike failed');
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsSpiking(false);
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-monsoon-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-basalt-900 font-sans">
              Live Operations & Vehicle Dispatch
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sahyadri-100 text-sahyadri-800 border border-sahyadri-300">
              Live Tracking
            </span>
          </div>
          <p className="text-xs text-basalt-500 mt-0.5">
            Real-time vehicle coordinates, road geometry polylines, and dynamic route waypoint progression.
          </p>
        </div>

        {feedback && (
          <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
            <Zap className="w-3.5 h-3.5 text-amber-600 fill-current" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Full Map on Left (2 cols), Route Waypoint Inspector on Right (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Operations Map */}
        <div className="lg:col-span-2 space-y-2">
          <PuneOperationsMap
            bins={bins}
            trucks={trucks}
            onSelectBin={onInspectBin}
            onSelectTruck={(t) => {
              setSelectedTruckId(t.id);
              onSelectTruck?.(t);
            }}
          />
        </div>

        {/* Selected Truck Route & Waypoints Inspector */}
        <div className="p-4 rounded-xl bg-white border border-monsoon-200 shadow-xs space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-monsoon-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-basalt-700">
                Vehicle Route Inspector
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-monsoon-100 text-basalt-700">
                {trucks.filter((t) => t.status === 'Assigned').length} Active
              </span>
            </div>

            {/* Truck Selector Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {trucks.slice(0, 5).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTruckId(t.id)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                    selectedTruckId === t.id
                      ? 'bg-saffron-600 text-white border-saffron-700 shadow-xs'
                      : 'bg-monsoon-50 text-basalt-700 border-monsoon-200 hover:bg-monsoon-100'
                  }`}
                >
                  {t.id.replace('MH-12-PMC-', '#')}
                </button>
              ))}
            </div>

            {/* Selected Truck Details Card */}
            {selectedTruck && (
              <div className="p-3 rounded-lg bg-monsoon-50 border border-monsoon-200 text-xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-basalt-900 block font-sans">{selectedTruck.name}</span>
                    <span className="text-basalt-500 text-[11px] block mt-0.5">
                      Driver: <strong>{selectedTruck.driverName}</strong> ({selectedTruck.driverPhone})
                    </span>
                    <span className="text-[10.5px] text-basalt-500 block">
                      Depot: {selectedTruck.depotName}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-saffron-100 text-saffron-800">
                    {selectedTruck.status}
                  </span>
                </div>

                {/* Load Bar */}
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-basalt-500">Payload Usage:</span>
                    <span className="font-mono font-bold text-basalt-800">
                      {selectedTruck.currentLoadKg} / {selectedTruck.capacityKg} kg
                    </span>
                  </div>
                  <div className="w-full bg-monsoon-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-saffron-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round((selectedTruck.currentLoadKg / selectedTruck.capacityKg) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Progress */}
                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-monsoon-200">
                  <span className="text-basalt-600">Shift Progress:</span>
                  <span className="font-mono font-bold text-sahyadri-700">{progressPercent}% ({completedCount}/{totalStops} stops)</span>
                </div>
              </div>
            )}

            {/* Waypoint Sequence List */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-basalt-600 block">
                Assigned Waypoints ({totalStops} stops)
              </span>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {assignedBins.map((bin, idx) => {
                  const isDone = (selectedTruck?.completedBinIds || []).includes(bin.id) || bin.collectionStatus === 'collected';
                  return (
                    <div
                      key={bin.id}
                      onClick={() => onInspectBin?.(bin)}
                      className={`p-2 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isDone
                          ? 'bg-sahyadri-50/50 border-sahyadri-200 text-basalt-400'
                          : bin.currentFillPercent >= 85
                          ? 'bg-rose-50 border-rose-200 text-basalt-900 font-medium'
                          : 'bg-white border-monsoon-200 text-basalt-800 hover:border-saffron-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-4 h-4 rounded-full text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                          isDone ? 'bg-sahyadri-600 text-white' : 'bg-monsoon-200 text-basalt-700'
                        }`}>
                          {isDone ? '✓' : idx + 1}
                        </span>
                        <div className="truncate">
                          <span className={`block truncate ${isDone ? 'line-through text-basalt-400' : ''}`}>
                            {bin.name}
                          </span>
                          <span className="text-[10px] text-basalt-500 block truncate font-mono">
                            {bin.code} • {bin.location.sector}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-[11px] block">
                          {bin.currentFillPercent}%
                        </span>
                        <span className="text-[9.5px] text-basalt-500">
                          {bin.estimatedKg} kg
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Simulation Trigger */}
          <div className="pt-2 border-t border-monsoon-200 flex items-center justify-between text-[11px]">
            <span className="text-basalt-500">Dynamic Re-Dispatch:</span>
            {assignedBins[0] && (
              <button
                type="button"
                disabled={isSpiking}
                onClick={() => handleSpike(assignedBins[0].id)}
                className="px-2 py-1 rounded-md text-[10.5px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 cursor-pointer disabled:opacity-50"
              >
                ⚡ Spike {assignedBins[0].code}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
