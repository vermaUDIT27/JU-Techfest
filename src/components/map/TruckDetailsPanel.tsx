import React from 'react';
import { TruckRecord, BinRecord } from '../../types';
import { 
  Truck, 
  User, 
  Phone, 
  MapPin, 
  X, 
  Scale, 
  CheckCircle2, 
  ArrowRight, 
  Route as RouteIcon,
  Clock
} from 'lucide-react';

interface TruckDetailsPanelProps {
  truck: TruckRecord | null;
  bins: BinRecord[];
  onClose: () => void;
  onSelectBin: (bin: BinRecord) => void;
}

export const TruckDetailsPanel: React.FC<TruckDetailsPanelProps> = ({
  truck,
  bins,
  onClose,
  onSelectBin,
}) => {
  if (!truck) return null;

  const remainingCapacity = Math.max(0, truck.capacityKg - truck.currentLoadKg);
  const loadPercentage = Math.min(100, Math.round((truck.currentLoadKg / truck.capacityKg) * 100));

  const assignedBins = truck.assignedBinIds
    .map((id) => bins.find((b) => b.id === id))
    .filter(Boolean) as BinRecord[];

  const nextStopBin = truck.nextStopBinId
    ? bins.find((b) => b.id === truck.nextStopBinId)
    : null;

  const statusBadgeColor: Record<string, string> = {
    Available: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    Assigned: 'bg-sky-100 text-sky-800 border-sky-300',
    'En route': 'bg-blue-100 text-blue-800 border-blue-300',
    Collecting: 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse',
    Full: 'bg-red-100 text-red-800 border-red-300',
    Offline: 'bg-charcoal-200 text-charcoal-700 border-charcoal-300',
  };

  return (
    <div className="p-4 rounded-2xl bg-sand-50 border border-sand-300 shadow-civic space-y-3.5 text-xs">
      {/* Header with Truck Color & Status */}
      <div className="flex items-start justify-between border-b border-sand-200 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs font-bold"
            style={{ backgroundColor: truck.color }}
          >
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-charcoal-900 font-mono text-sm">
                {truck.id}
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.2 rounded-full border uppercase tracking-wider ${
                  statusBadgeColor[truck.status] || 'bg-sand-200 text-charcoal-700'
                }`}
              >
                {truck.status}
              </span>
            </div>
            <p className="text-[11px] text-charcoal-500">{truck.name}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-charcoal-400 hover:bg-sand-200 hover:text-charcoal-700 transition-colors"
          aria-label="Close truck details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Driver and Depot */}
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-sand-100 border border-sand-200">
        <div>
          <span className="text-charcoal-400 block text-[10.5px]">Assigned Driver:</span>
          <strong className="text-charcoal-800 flex items-center gap-1">
            <User className="w-3 h-3 text-terracotta-600" />
            {truck.driverName}
          </strong>
          <span className="text-charcoal-500 text-[10px]">{truck.driverPhone}</span>
        </div>
        <div>
          <span className="text-charcoal-400 block text-[10.5px]">Home Depot:</span>
          <span className="text-charcoal-800 font-medium block truncate" title={truck.depotName}>
            {truck.depotName}
          </span>
          <span className="text-charcoal-500 text-[10px]">PMC Pune Operations</span>
        </div>
      </div>

      {/* Payload Capacity Utilization */}
      <div className="p-2.5 rounded-xl bg-sand-100 border border-sand-200 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-charcoal-600 font-bold text-[11px] uppercase flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-terracotta-600" />
            Payload Utilization
          </span>
          <span className="font-mono font-bold text-charcoal-900">
            {truck.currentLoadKg.toLocaleString()} / {truck.capacityKg.toLocaleString()} kg ({loadPercentage}%)
          </span>
        </div>

        <div className="w-full bg-sand-200 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              loadPercentage >= 90 ? 'bg-red-600' : loadPercentage >= 70 ? 'bg-amber-500' : 'bg-emerald-600'
            }`}
            style={{ width: `${loadPercentage}%` }}
          />
        </div>

        <div className="flex justify-between text-[10.5px] text-charcoal-500">
          <span>Remaining: {remainingCapacity.toLocaleString()} kg</span>
          <span>Completed: {truck.completedBinIds.length} of {truck.assignedBinIds.length} stops</span>
        </div>
      </div>

      {/* Highlighted Next Stop */}
      {nextStopBin ? (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-amber-900 tracking-wider">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-700 animate-bounce" />
              Target Next Stop
            </span>
            <span className="text-amber-800 font-mono">{nextStopBin.code}</span>
          </div>

          <h4 className="font-bold text-charcoal-900 text-xs leading-snug">
            {nextStopBin.name}
          </h4>
          <p className="text-[11px] text-charcoal-600 truncate">{nextStopBin.location.address}</p>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10.5px] font-semibold text-amber-900">
              Est. Waste: ~{nextStopBin.estimatedKg} kg ({nextStopBin.currentFillPercent}% full)
            </span>
            <button
              type="button"
              onClick={() => onSelectBin(nextStopBin)}
              className="text-[11px] font-bold text-terracotta-700 hover:underline flex items-center gap-0.5"
            >
              <span>View Bin</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : truck.assignedBinIds.length > 0 ? (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium text-[11.5px]">All assigned stops completed for this shift!</span>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-sand-100 border border-sand-200 text-charcoal-500 text-center text-[11px]">
          No active route assigned. Click <strong>Generate Dispatch</strong> in the supervisor dashboard.
        </div>
      )}

      {/* Ordered Route Stops List */}
      {assignedBins.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-charcoal-700 uppercase tracking-wide">
            <span className="flex items-center gap-1">
              <RouteIcon className="w-3.5 h-3.5 text-terracotta-600" />
              Assigned Route Waypoints
            </span>
            <span className="text-charcoal-500 text-[10px] font-normal">
              {truck.assignedRoute?.totalDistanceKm || 0} km road route
            </span>
          </div>

          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {assignedBins.map((b, idx) => {
              const isDone = truck.completedBinIds.includes(b.id);
              const isNext = b.id === truck.nextStopBinId;

              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBin(b)}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                    isNext
                      ? 'bg-amber-50 border-amber-300 text-charcoal-900 font-bold'
                      : isDone
                      ? 'bg-emerald-50/60 border-emerald-200 text-charcoal-500 line-through'
                      : 'bg-sand-100 border-sand-200 text-charcoal-700 hover:bg-sand-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-4 h-4 rounded-full bg-sand-200 text-charcoal-700 font-mono text-[9px] flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate text-[11px]">{b.name}</span>
                  </div>

                  <span className="text-[10px] font-mono flex-shrink-0">
                    {isDone ? '✓' : `${b.estimatedKg} kg`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
