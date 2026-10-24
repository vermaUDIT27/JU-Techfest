import React from 'react';
import { 
  X, 
  MapPin, 
  AlertTriangle, 
  Clock, 
  Scale, 
  CheckCircle2, 
  Truck, 
  ShieldAlert, 
  Radio, 
  ExternalLink,
  RotateCcw,
  Activity,
  Layers,
  MapPinOff
} from 'lucide-react';
import { BinRecord, TruckRecord } from '../../types';
import { getRiskBadgeClasses, getRiskLabel, getRiskColor } from '../../services/riskEngine';
import { getBinThresholdStatus } from '../../data/puneBins';

interface BinDetailModalProps {
  bin: BinRecord | null;
  onClose: () => void;
  trucks: TruckRecord[];
  onAssignToTruck?: (binId: string, truckId: string) => void;
  onMarkCollected?: (binId: string) => void;
}

export const BinDetailModal: React.FC<BinDetailModalProps> = ({
  bin,
  onClose,
  trucks,
  onAssignToTruck,
  onMarkCollected,
}) => {
  if (!bin) return null;

  const isCollected = bin.collectionStatus === 'collected';
  const riskBadgeStyle = getRiskBadgeClasses(bin.riskCategory);
  const riskColor = getRiskColor(bin.riskCategory);
  const thresholdStatus = bin.fillThresholdStatus || getBinThresholdStatus(bin.currentFillPercent);
  const readingSource = bin.readingSource || (bin.isSimulated ? 'simulated' : 'manual');

  const availableTrucks = trucks.filter((t) => t.status !== 'Offline');
  const assignedTruck = trucks.find((t) => t.id === bin.assignedTruckId);

  const thresholdBadgeColor = 
    thresholdStatus === 'full' ? 'bg-red-700 text-white' :
    thresholdStatus === 'critical' ? 'bg-red-100 text-red-900 border-red-300' :
    thresholdStatus === 'high' ? 'bg-amber-100 text-amber-900 border-amber-300' :
    'bg-emerald-100 text-emerald-900 border-emerald-300';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-basalt-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bin-modal-title"
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-white border border-monsoon-300 shadow-civic-lg overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-monsoon-200 bg-monsoon-50">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold text-saffron-800 bg-saffron-100 px-2 py-0.5 rounded border border-saffron-200">
                {bin.code}
              </span>

              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${thresholdBadgeColor}`}>
                {thresholdStatus.toUpperCase()}
              </span>

              {isCollected && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Collected
                </span>
              )}

              {bin.locationUnavailable && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <MapPinOff className="w-3.5 h-3.5 text-amber-700" />
                  Location Unavailable
                </span>
              )}

              {bin.sensitiveZone && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  Sensitive Zone
                </span>
              )}
            </div>

            <h2 id="bin-modal-title" className="text-lg font-bold text-basalt-900 leading-snug">
              {bin.name}
            </h2>
            <p className="text-xs text-basalt-500 font-medium">
              {bin.marathiName || bin.hindiName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-basalt-400 hover:bg-monsoon-200 hover:text-basalt-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Location details */}
          <div className="p-3.5 rounded-xl bg-monsoon-50 border border-monsoon-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-basalt-700 uppercase tracking-wide text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-saffron-600" />
              <span>Location (Pune, Maharashtra)</span>
            </div>
            {bin.locationUnavailable ? (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <MapPinOff className="w-4 h-4 text-amber-700 shrink-0" />
                <span><strong>Location Unavailable:</strong> Unsurveyed municipal sector. Not plotted at fabricated GPS coordinates.</span>
              </div>
            ) : (
              <p className="text-basalt-800 font-medium">
                {bin.location.address} • <span className="text-basalt-500">{bin.location.marathiAddress || bin.location.hindiAddress}</span>
              </p>
            )}
            <div className="text-basalt-600 text-[11px] flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-monsoon-200">
              {bin.colonyName && <span>Area / Colony: <strong>{bin.colonyName}</strong></span>}
              <span>Ward: <strong>{bin.wardId || bin.location.ward}</strong></span>
              {bin.location.sector && <span>Sector: <strong>{bin.location.sector}</strong></span>}
              {!bin.locationUnavailable && (
                <span className="font-mono text-basalt-500">
                  GPS: {bin.location.lat.toFixed(4)}° N, {bin.location.lng.toFixed(4)}° E
                </span>
              )}
            </div>
          </div>

          {/* Fill Percentage & Estimated Quantity */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-monsoon-50 border border-monsoon-200">
              <span className="text-basalt-500 block text-[11px] mb-1">Fill Level & Status</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-sans" style={{ color: isCollected ? '#16A34A' : riskColor }}>
                  {isCollected ? '0%' : `${bin.currentFillPercent}%`}
                </span>
                <span className="text-[11px] font-bold text-basalt-600 uppercase">
                  {thresholdStatus}
                </span>
              </div>
              <div className="w-full bg-monsoon-200 h-2 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: isCollected ? '0%' : `${bin.currentFillPercent}%`,
                    backgroundColor: isCollected ? '#16A34A' : riskColor,
                  }}
                />
              </div>
              <span className="text-[10px] text-basalt-500 mt-1 block">
                Threshold: Normal &lt;70%, High 70-84%, Critical 85-99%, Full 100%
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-monsoon-50 border border-monsoon-200">
              <span className="text-basalt-500 block text-[11px] mb-1">Estimated Quantity</span>
              <div className="text-xl font-bold text-basalt-900">
                {isCollected ? '0 kg (Cleared)' : `~${bin.estimatedKg} kg`}
              </div>
              <span className="text-basalt-500 text-[11px] block mt-1">
                Bin Volume: {bin.capacityLiters} Liters
              </span>
              <span className="text-basalt-500 text-[10px] block mt-0.5">
                Collection Status: <strong className="uppercase text-basalt-800">{bin.collectionStatus.replace('_', ' ')}</strong>
              </span>
            </div>
          </div>

          {/* Telemetry & Reading Source */}
          <div className="p-3.5 rounded-xl bg-monsoon-50 border border-monsoon-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-basalt-500 block text-[11px]">Reading Source:</span>
              <span className="font-bold text-basalt-800 uppercase text-[11px] px-1.5 py-0.5 rounded bg-monsoon-200 inline-block">
                {readingSource === 'simulated' ? 'Simulated Telemetry' : readingSource === 'sensor' ? 'Pilot IoT Sensor' : 'Manual Sanitation Log'}
              </span>
            </div>
            <div>
              <span className="text-basalt-500 block text-[11px]">Last Updated Timestamp:</span>
              <strong className="text-basalt-800">{bin.dataFreshness}</strong>
            </div>
            <div className="sm:col-span-2 pt-1 border-t border-monsoon-200 text-[11px] text-basalt-600">
              Last Serviced: <span className="font-medium text-basalt-900">{bin.lastCollectionTime || 'Not recorded'}</span>
            </div>
          </div>

          {/* Supervisor Tradeoff & Sensitive Zone Reasoning */}
          {bin.supervisorTradeoffReason && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1.5">
              <div className="font-bold text-amber-900 uppercase text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                <span>Operational Priority & Trade-Off Reason</span>
              </div>
              <p className="text-basalt-700 leading-relaxed text-[11.5px]">
                {bin.supervisorTradeoffReason}
              </p>
            </div>
          )}

          {/* Collection History */}
          {bin.collectionHistory && bin.collectionHistory.length > 0 && (
            <div className="p-3.5 rounded-xl bg-monsoon-50 border border-monsoon-200 space-y-1.5 text-xs">
              <span className="font-bold text-basalt-800 block text-[11px] uppercase">Recent Collection History:</span>
              <div className="space-y-1">
                {bin.collectionHistory.map((hist, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-white border border-monsoon-200 text-[11px]">
                    <span>{new Date(hist.timestamp).toLocaleDateString()} {new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-mono text-sahyadri-800">{hist.truckId}</span>
                    <span className="font-bold text-emerald-700">{hist.weightKg ? `${hist.weightKg} kg` : hist.result}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignment Status & Actions */}
          <div className="p-3.5 rounded-xl bg-monsoon-50 border border-monsoon-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-basalt-800 uppercase tracking-wide text-[11px]">
                Truck Allocation Status:
              </span>
              {assignedTruck ? (
                <span className="font-bold text-sahyadri-800 bg-sahyadri-100 px-2 py-0.5 rounded border border-sahyadri-300">
                  Assigned to {assignedTruck.id} ({assignedTruck.driverName})
                </span>
              ) : (
                <span className="font-medium text-basalt-500 bg-monsoon-200 px-2 py-0.5 rounded">
                  Unassigned
                </span>
              )}
            </div>

            {/* Quick Reassign Dropdown */}
            {onAssignToTruck && !isCollected && (
              <div className="flex items-center gap-2 pt-1">
                <Truck className="w-4 h-4 text-saffron-600 flex-shrink-0" />
                <label htmlFor="reassign-select" className="text-basalt-600 font-medium whitespace-nowrap">
                  Assign to:
                </label>
                <select
                  id="reassign-select"
                  value={bin.assignedTruckId || ''}
                  onChange={(e) => onAssignToTruck(bin.id, e.target.value)}
                  className="flex-1 bg-white border border-monsoon-300 rounded-lg px-2.5 py-1.5 text-basalt-800 font-medium focus:outline-none focus:ring-1 focus:ring-saffron-500 cursor-pointer"
                >
                  <option value="">-- Keep Unassigned --</option>
                  {availableTrucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} ({t.driverName}) — Remaining: {t.capacityKg - t.currentLoadKg} kg
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 bg-monsoon-100 border-t border-monsoon-200">
          <span className="text-[11px] text-basalt-500">
            ID: <span className="font-mono font-bold text-basalt-700">{bin.id}</span>
          </span>

          <div className="flex items-center gap-2">
            {onMarkCollected && !isCollected && (
              <button
                type="button"
                onClick={() => {
                  onMarkCollected(bin.id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Collected (Manual Override)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-basalt-700 hover:bg-monsoon-200 border border-monsoon-300 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
