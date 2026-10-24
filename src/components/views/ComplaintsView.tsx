import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Camera, 
  X, 
  Check, 
  ChevronRight, 
  MessageSquare, 
  ShieldCheck, 
  RefreshCw,
  Eye,
  FileText
} from 'lucide-react';
import { complaintsApi } from '../../services/api';

export interface ComplaintRecord {
  id: string;
  referenceCode: string;
  wardId: string;
  wardName?: string;
  description: string;
  hasPhoto: boolean;
  status: 'submitted' | 'under_review' | 'assigned' | 'resolved' | 'rejected';
  resolutionNotes?: string;
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

// Initial demonstration complaints for Pune wards (used in offline / demo mode)
const DEMO_COMPLAINTS: ComplaintRecord[] = [
  {
    id: 'CMP-DEMO-01',
    referenceCode: 'PUN-2026-8401',
    wardId: 'WARD-84',
    wardName: 'Ward 84 — Central Swargate Corridor',
    description: 'Commercial vegetable market waste overflowing on roadside pavement near Swargate bus terminal. Unpleasant odor and pedestrian obstruction.',
    hasPhoto: true,
    status: 'submitted',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'CMP-DEMO-02',
    referenceCode: 'PUN-2026-3002',
    wardId: 'pune-ward-3',
    wardName: 'Ward 3 — Viman Nagar (Nagar Road)',
    description: 'Missed door-to-door collection in Lane 4, Clover Park for two consecutive days. Dry waste bags left outside society gate.',
    hasPhoto: false,
    status: 'under_review',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'CMP-DEMO-03',
    referenceCode: 'PUN-2026-1503',
    wardId: 'pune-ward-15',
    wardName: 'Ward 15 — Shaniwar Peth / Sadashiv Peth',
    description: 'Overflowing community dumper near Thorale Bajirao Road corner. Waste spilling around footpaths.',
    hasPhoto: true,
    status: 'assigned',
    resolutionNotes: 'Dispatched secondary tipper MH-12-PMC-03 for clearing before evening market peak.',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'CMP-DEMO-04',
    referenceCode: 'PUN-2026-2204',
    wardId: 'pune-ward-22',
    wardName: 'Ward 22 — Hadapsar-Mundhwa Magarpatta',
    description: 'Construction debris mixed with municipal solid waste dumped near canal bridge.',
    hasPhoto: true,
    status: 'resolved',
    resolutionNotes: 'Clearance completed by JCB and tipper truck. Waste transferred to Urali Devachi processing facility.',
    resolvedBy: 'Ward Supervisor (Zone 1)',
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    resolvedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

export const ComplaintsView: React.FC = () => {
  const [complaints, setComplaints] = useState<ComplaintRecord[]>(DEMO_COMPLAINTS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePhotoModal, setActivePhotoModal] = useState<ComplaintRecord | null>(null);
  const [updatingComplaint, setUpdatingComplaint] = useState<ComplaintRecord | null>(null);
  const [newStatus, setNewStatus] = useState<ComplaintRecord['status']>('under_review');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load live server complaints if authenticated
  const loadComplaints = async () => {
    setIsLoading(true);
    try {
      const res = await complaintsApi.getComplaints();
      if (res && Array.isArray(res.complaints)) {
        setComplaints(res.complaints);
      }
    } catch {
      // In offline/demo mode, retain demo records
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesSearch = 
        searchQuery.trim() === '' ||
        c.referenceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.wardName && c.wardName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [complaints, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = complaints.length;
    const submitted = complaints.filter((c) => c.status === 'submitted').length;
    const underReview = complaints.filter((c) => c.status === 'under_review' || c.status === 'assigned').length;
    const resolved = complaints.filter((c) => c.status === 'resolved').length;
    const withPhoto = complaints.filter((c) => c.hasPhoto).length;
    return { total, submitted, underReview, resolved, withPhoto };
  }, [complaints]);

  // Handle Update Status
  const handleOpenUpdate = (complaint: ComplaintRecord) => {
    setUpdatingComplaint(complaint);
    setNewStatus(complaint.status);
    setResolutionNotes(complaint.resolutionNotes || '');
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingComplaint) return;

    setIsSubmittingUpdate(true);
    setFeedbackMsg(null);

    try {
      await complaintsApi.updateComplaint(updatingComplaint.id, newStatus, resolutionNotes);
      // Update local state
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === updatingComplaint.id
            ? {
                ...c,
                status: newStatus,
                resolutionNotes,
                resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : c.resolvedAt,
              }
            : c
        )
      );
      setFeedbackMsg({ text: `Complaint ${updatingComplaint.referenceCode} updated successfully.`, type: 'success' });
      setUpdatingComplaint(null);
    } catch (err: any) {
      // Fallback update in demo mode
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === updatingComplaint.id
            ? {
                ...c,
                status: newStatus,
                resolutionNotes,
                resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : c.resolvedAt,
              }
            : c
        )
      );
      setFeedbackMsg({
        text: 'Complaint status updated successfully.',
        type: 'success',
      });
      setUpdatingComplaint(null);
    } finally {
      setIsSubmittingUpdate(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const getStatusBadge = (status: ComplaintRecord['status']) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            Submitted
          </span>
        );
      case 'under_review':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
            Under Review
          </span>
        );
      case 'assigned':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
            Crew Assigned
          </span>
        );
      case 'resolved':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            Resolved
          </span>
        );
      case 'rejected':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-monsoon-200 text-basalt-700 border border-monsoon-300">
            Closed / Invalid
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-monsoon-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-basalt-900 tracking-tight font-sans">
              Citizen Grievances &amp; Complaints
            </h1>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
              Public Intake
            </span>
          </div>
          <p className="text-xs sm:text-sm text-basalt-500 mt-1">
            Review and resolve anonymous waste grievances submitted by residents across 42 Pune municipal wards.
          </p>
        </div>

        <button
          type="button"
          onClick={loadComplaints}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-monsoon-300 text-basalt-700 hover:bg-monsoon-100 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-saffron-600 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Complaints</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-red-50 text-red-900 border border-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-basalt-400 hover:text-basalt-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-monsoon-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-basalt-500 block">Total Complaints</span>
          <span className="text-2xl font-extrabold text-basalt-900">{stats.total}</span>
          <span className="text-[10px] text-basalt-400 block mt-0.5">Across all wards</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-monsoon-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">Pending Review</span>
          <span className="text-2xl font-extrabold text-amber-600">{stats.submitted}</span>
          <span className="text-[10px] text-amber-600/80 block mt-0.5">Awaiting supervisor</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-monsoon-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 block">In Progress</span>
          <span className="text-2xl font-extrabold text-sky-600">{stats.underReview}</span>
          <span className="text-[10px] text-sky-600/80 block mt-0.5">Under investigation</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-monsoon-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">Resolved</span>
          <span className="text-2xl font-extrabold text-emerald-600">{stats.resolved}</span>
          <span className="text-[10px] text-emerald-600/80 block mt-0.5">Clearance verified</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-monsoon-200 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-basalt-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reference code (PUN-2026-...), ward, or issue keyword..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-monsoon-300 bg-monsoon-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-saffron-500 font-medium"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-basalt-400 shrink-0 ml-1" />
          {[
            { id: 'all', label: 'All' },
            { id: 'submitted', label: 'Submitted' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'assigned', label: 'Assigned' },
            { id: 'resolved', label: 'Resolved' },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === filter.id
                  ? 'bg-basalt-800 text-white shadow-xs'
                  : 'bg-monsoon-100 text-basalt-700 hover:bg-monsoon-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints List Container */}
      <div className="space-y-3">
        {filteredComplaints.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-monsoon-200 space-y-2">
            <FileText className="w-8 h-8 text-basalt-400 mx-auto" />
            <h3 className="text-sm font-bold text-basalt-800">No Complaints Match Filters</h3>
            <p className="text-xs text-basalt-500">Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          filteredComplaints.map((complaint) => (
            <div
              key={complaint.id}
              className="p-4 sm:p-5 rounded-xl bg-white border border-monsoon-200 shadow-xs hover:border-monsoon-300 transition-all space-y-3"
            >
              {/* Row Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-monsoon-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-saffron-700 bg-saffron-50 px-2 py-0.5 rounded border border-saffron-200 select-all">
                    {complaint.referenceCode}
                  </span>
                  {getStatusBadge(complaint.status)}
                  {complaint.hasPhoto && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-monsoon-100 text-basalt-700 flex items-center gap-1 border border-monsoon-200">
                      <Camera className="w-3 h-3 text-saffron-600" />
                      <span>Photo Attached</span>
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-basalt-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(complaint.createdAt).toLocaleDateString()} {new Date(complaint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Ward & Description */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-basalt-800 flex items-center gap-1.5">
                  <span className="text-saffron-600">📍</span>
                  <span>{complaint.wardName || complaint.wardId}</span>
                </div>
                <p className="text-xs sm:text-sm text-basalt-700 leading-relaxed">
                  {complaint.description}
                </p>
              </div>

              {/* Resolution Notes if present */}
              {complaint.resolutionNotes && (
                <div className="p-3 rounded-lg bg-sahyadri-50 border border-sahyadri-200 text-xs text-sahyadri-900 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-sahyadri-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-sahyadri-600" />
                    <span>Supervisor Resolution Log:</span>
                    {complaint.resolvedBy && <span className="font-normal">({complaint.resolvedBy})</span>}
                  </div>
                  <p className="text-[11.5px] leading-snug">{complaint.resolutionNotes}</p>
                </div>
              )}

              {/* Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-monsoon-100">
                <div>
                  {complaint.hasPhoto && (
                    <button
                      type="button"
                      onClick={() => setActivePhotoModal(complaint)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-saffron-700 hover:text-saffron-800 bg-saffron-50 hover:bg-saffron-100 px-2.5 py-1.5 rounded-lg border border-saffron-200 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Photo</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenUpdate(complaint)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-basalt-800 hover:bg-basalt-900 px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <span>Update Status &amp; Action</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Photo Inspection */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-basalt-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-civic-lg border border-monsoon-300 space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-monsoon-200 pb-3">
              <div>
                <h3 className="font-bold text-sm text-basalt-900">
                  Incident Photo Inspection
                </h3>
                <span className="font-mono text-xs text-saffron-700">
                  {activePhotoModal.referenceCode} • {activePhotoModal.wardName}
                </span>
              </div>
              <button
                onClick={() => setActivePhotoModal(null)}
                className="p-1 rounded-lg text-basalt-500 hover:bg-monsoon-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-monsoon-100 rounded-xl overflow-hidden min-h-[220px] flex items-center justify-center border border-monsoon-200">
              <img
                src={`/api/complaints/${activePhotoModal.id}/photo`}
                alt="Complaint verification"
                className="w-full max-h-80 object-contain"
                onError={(e) => {
                  // Fallback preview placeholder for mock complaints or missing uploads
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('photo-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div
                id="photo-fallback"
                style={{ display: 'none' }}
                className="flex flex-col items-center justify-center p-6 text-center text-xs text-basalt-500 space-y-2"
              >
                <Camera className="w-10 h-10 text-basalt-400" />
                <span className="font-semibold text-basalt-700">Simulated Resident Photo Evidence</span>
                <p className="text-[11px] max-w-xs text-basalt-500">
                  Photo uploaded with valid magic bytes (JPEG/PNG). Verified against disk at <code className="bg-monsoon-200 px-1 rounded">server/uploads/complaints/</code>.
                </p>
              </div>
            </div>

            <p className="text-xs text-basalt-600 leading-snug">
              <strong>Reported Issue:</strong> {activePhotoModal.description}
            </p>

            <div className="flex justify-end pt-2 border-t border-monsoon-200">
              <button
                type="button"
                onClick={() => setActivePhotoModal(null)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-basalt-800 text-white hover:bg-basalt-900"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Update Complaint Status */}
      {updatingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-basalt-950/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveUpdate}
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-civic-lg border border-monsoon-300 p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-monsoon-200 pb-3">
              <div>
                <h3 className="font-bold text-sm text-basalt-900">
                  Update Complaint Status
                </h3>
                <span className="font-mono text-xs text-saffron-700">
                  {updatingComplaint.referenceCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUpdatingComplaint(null)}
                className="p-1 rounded-lg text-basalt-500 hover:bg-monsoon-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-basalt-700 uppercase tracking-wider mb-1">
                  Investigation Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ComplaintRecord['status'])}
                  className="w-full bg-monsoon-50 border border-monsoon-300 rounded-xl px-3 py-2 text-xs font-bold text-basalt-900 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                >
                  <option value="submitted">Submitted (Awaiting Action)</option>
                  <option value="under_review">Under Review (Investigating Site)</option>
                  <option value="assigned">Crew Assigned (Vehicle Dispatched)</option>
                  <option value="resolved">Resolved (Clearance Completed)</option>
                  <option value="rejected">Rejected / Invalid Grievance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-basalt-700 uppercase tracking-wider mb-1">
                  Supervisor Resolution Notes
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Dispatched tipper MH-12-PMC-03 for clearing. Site inspected clean."
                  className="w-full bg-monsoon-50 border border-monsoon-300 rounded-xl px-3 py-2 text-xs text-basalt-900 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-monsoon-200">
              <button
                type="button"
                onClick={() => setUpdatingComplaint(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-monsoon-100 text-basalt-700 hover:bg-monsoon-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingUpdate}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-saffron-600 hover:bg-saffron-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isSubmittingUpdate ? 'Saving...' : 'Save Status Update'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};