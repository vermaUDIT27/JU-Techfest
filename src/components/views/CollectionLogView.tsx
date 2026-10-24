import React, { useState } from 'react';
import { 
  History, 
  Search, 
  FileCheck, 
  AlertTriangle, 
  Truck, 
  UserCheck, 
  Calendar, 
  Scale, 
  Radio, 
  Download,
  Info
} from 'lucide-react';
import { CollectionShift } from '../../types';
import { SAMPLE_SHIFTS } from '../../data/jaipurBins';
import { ProvenanceSourceBanner } from '../common/SimulationBadge';

export const CollectionLogView: React.FC = () => {
  const [shifts] = useState<CollectionShift[]>(SAMPLE_SHIFTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredShifts = shifts.filter((s) => {
    const matchesSearch =
      s.shiftName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.shiftCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.vehicleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.servicedBinNames.some((b: string) => b.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      selectedStatus === 'all' ? true : s.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-sand-100 border border-sand-300 shadow-civic">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-charcoal-900 text-sm">
                Collection Operations & Audit Log
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sand-200 text-charcoal-700 uppercase border border-sand-300">
                Audit Trail
              </span>
            </div>
            <p className="text-xs text-charcoal-600 mt-1 max-w-3xl leading-relaxed">
              Historical record of serviced collection routes across Jagatpura Ward 84, including post-collection supervisor verification notes and sensor calibration discrepancy logs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => alert('Exporting simulated audit logs for Ward 84 (CSV)...')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-sand-200 hover:bg-sand-300 text-charcoal-800 transition-colors border border-sand-300 flex items-center gap-1.5 flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-terracotta-600" />
            <span>Export Audit Trail (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-sand-50 border border-sand-200 shadow-civic">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search shifts, crew, vehicle, or bin name..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-sand-100 border border-sand-300 rounded-lg text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-charcoal-500 font-medium">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-sand-100 border border-sand-300 rounded-lg px-2.5 py-1.5 text-charcoal-700 focus:outline-none"
            aria-label="Filter Shift Status"
          >
            <option value="all">All Shifts</option>
            <option value="completed">Completed Shifts</option>
            <option value="scheduled">Scheduled Shifts</option>
          </select>
        </div>
      </div>

      {/* Shift Log Cards */}
      <div className="space-y-4">
        {filteredShifts.map((shift) => (
          <div
            key={shift.id}
            className="p-5 rounded-2xl bg-sand-50 border border-sand-300 shadow-civic space-y-4"
          >
            {/* Shift Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sand-200 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-terracotta-700 bg-terracotta-100 px-2 py-0.5 rounded border border-terracotta-200">
                    {shift.shiftCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      shift.status === 'completed'
                        ? 'bg-sage-100 text-sage-800 border-sage-200'
                        : 'bg-sand-200 text-charcoal-700 border-sand-300'
                    }`}
                  >
                    {shift.status}
                  </span>
                  <span className="text-xs text-charcoal-500">
                    {shift.date} • {shift.timeSlot}
                  </span>
                </div>
                <h3 className="font-bold text-charcoal-900 text-base mt-1">
                  {shift.shiftName}
                </h3>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-charcoal-500 block">Total Collected:</span>
                <span className="text-lg font-bold text-charcoal-900 font-mono">
                  {shift.totalCollectedKg.toLocaleString()} kg
                </span>
              </div>
            </div>

            {/* Vehicle & Crew Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-sand-100/70 p-3 rounded-xl border border-sand-200">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-terracotta-600 flex-shrink-0" />
                <div>
                  <span className="text-charcoal-500 block text-[11px]">Vehicle:</span>
                  <strong className="text-charcoal-900">{shift.vehicleId}</strong>
                  <span className="text-charcoal-600 block text-[11px]">{shift.vehicleType}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sage-600 flex-shrink-0" />
                <div>
                  <span className="text-charcoal-500 block text-[11px]">Sanitation Crew:</span>
                  <strong className="text-charcoal-900">{shift.driverCrew}</strong>
                  <span className="text-charcoal-600 block text-[11px]">Assigned to: {shift.ward}</span>
                </div>
              </div>
            </div>

            {/* Serviced Locations */}
            <div>
              <span className="font-bold text-charcoal-800 text-xs block mb-2 uppercase tracking-wide">
                Serviced Collection Stops ({shift.servicedBinNames.length} Bins):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {shift.servicedBinNames.map((name: string, i: number) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-sand-100 border border-sand-200 text-charcoal-700 flex items-center gap-2"
                  >
                    <span className="w-4 h-4 rounded-full bg-sand-200 text-charcoal-600 font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supervisor Notes & Telemetry Discrepancy Reconciliation */}
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-sand-100 border border-sand-200 text-charcoal-700">
                <strong className="text-charcoal-900 block text-[11.5px] mb-0.5">
                  Supervisor Shift Debrief:
                </strong>
                <p className="leading-relaxed text-[11.5px]">{shift.supervisorNotes}</p>
              </div>

              {shift.telemetryDiscrepancyNotes && (
                <div className="p-3 rounded-xl bg-ochre-50 border border-ochre-200 text-ochre-900 flex items-start gap-2">
                  <Radio className="w-4 h-4 text-ochre-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[11.5px] mb-0.5">
                      Telemetry Reconciliation Flag:
                    </strong>
                    <p className="leading-relaxed text-[11.5px]">{shift.telemetryDiscrepancyNotes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <ProvenanceSourceBanner />
    </div>
  );
};
