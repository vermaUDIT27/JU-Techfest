import React, { useState } from 'react';
import { FileSpreadsheet, Send, CheckCircle2, AlertCircle, Camera, ShieldAlert, ArrowLeft, Building2 } from 'lucide-react';
import { complaintsApi } from '../../services/api';
import { getAllWards } from '../../data/puneData';

interface PublicComplaintPageProps {
  onNavigate: (path: string) => void;
}

export const PublicComplaintPage: React.FC<PublicComplaintPageProps> = ({ onNavigate }) => {
  const wards = getAllWards();
  const [wardId, setWardId] = useState(wards[0]?.source_ward_id || 'WARD-84');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('wardId', wardId);
      formData.append('description', description);
      if (photo) {
        formData.append('photo', photo);
      }

      const res = await complaintsApi.submitComplaint(formData);
      setReferenceCode(res.referenceCode);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit complaint. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetForm = () => {
    setDescription('');
    setPhoto(null);
    setReferenceCode(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-monsoon-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        {/* Back Link */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-xs font-bold text-basalt-600 hover:text-basalt-900 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home / Portal Selection
          </button>
        </div>

        {/* Header Banner */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-civic mb-2">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-display font-extrabold text-basalt-900 tracking-tight">
            SANCHAYA — Civic Grievance Reporting
          </h1>
          <p className="text-xs text-basalt-500 mt-1">
            Pune Municipal Wards • Public Waste Sanitation Intake
          </p>
        </div>

        {referenceCode ? (
          <div className="bg-white p-8 rounded-2xl border-2 border-emerald-500 shadow-civic text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-basalt-900">
                Grievance Registered Successfully
              </h2>
              <p className="text-xs text-basalt-600">
                Your report has been forwarded to the sanitation supervisor for prompt inspection.
              </p>
            </div>

            <div className="p-4 bg-monsoon-50 rounded-xl border border-monsoon-200">
              <span className="text-[11px] uppercase tracking-wider text-basalt-500 font-bold block mb-1">
                Grievance Reference Code:
              </span>
              <strong className="text-xl font-mono font-bold text-rose-700 select-all">
                {referenceCode}
              </strong>
              <p className="text-[10.5px] text-basalt-500 mt-1">
                Keep this code to track grievance resolution with the municipal control room.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetForm}
              className="py-2.5 px-6 rounded-xl bg-basalt-800 text-white font-bold text-xs hover:bg-basalt-900 transition-colors shadow-civic cursor-pointer"
            >
              Submit Another Grievance
            </button>
          </div>
        ) : (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-monsoon-200 shadow-civic space-y-5">
            {/* Anonymity Notice */}
            <div className="p-3.5 rounded-xl bg-monsoon-100 border border-monsoon-200 text-basalt-700 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block text-[11px] uppercase tracking-wide text-basalt-900">
                  Anonymous Civic Submission
                </span>
                <p className="text-[11px] leading-snug">
                  No name, phone number, or login account is required or stored. Only the waste issue details and optional photo are recorded. Request IP metadata is processed for network rate limiting.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2 shadow-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="complaint-ward" className="block text-xs font-bold text-basalt-700 uppercase tracking-wider mb-1">
                  Municipal Ward Location
                </label>
                <select
                  id="complaint-ward"
                  value={wardId}
                  onChange={(e) => setWardId(e.target.value)}
                  className="w-full bg-monsoon-50 border border-monsoon-300 rounded-xl px-3 py-2.5 text-xs font-bold text-basalt-900 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                >
                  {wards.map((w) => (
                    <option key={w.internal_id} value={w.source_ward_id}>
                      {w.ward_name} ({w.zone_name}) — {w.source_ward_id}
                    </option>
                  ))}
                  <option value="WARD-84">Ward 84 — Central Swargate Corridor (WARD-84)</option>
                  <option value="WARD-85">Ward 85 — Shivajinagar Arterial Corridor (WARD-85)</option>
                </select>
              </div>

              <div>
                <label htmlFor="complaint-desc" className="block text-xs font-bold text-basalt-700 uppercase tracking-wider mb-1">
                  Issue Description (Min 10 characters)
                </label>
                <textarea
                  id="complaint-desc"
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the overflow, uncollected community dustbin, road blockage, or illegal dumping site..."
                  className="w-full bg-monsoon-50 border border-monsoon-300 rounded-xl p-3 text-xs text-basalt-900 placeholder-basalt-400 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />
                <span className="text-[10px] text-basalt-500 text-right block mt-0.5">
                  {description.length} / 1000 characters
                </span>
              </div>

              <div>
                <label htmlFor="complaint-photo" className="block text-xs font-bold text-basalt-700 uppercase tracking-wider mb-1">
                  Attach Photo Evidence (Optional, Max 5 MB)
                </label>
                <div className="relative border-2 border-dashed border-monsoon-300 rounded-xl p-4 bg-monsoon-50 text-center hover:bg-monsoon-100 transition-colors">
                  <input
                    id="complaint-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Camera className="w-6 h-6 text-basalt-400" />
                    <span className="text-xs font-bold text-basalt-700">
                      {photo ? photo.name : 'Tap or drop image file here'}
                    </span>
                    <span className="text-[10px] text-basalt-500">
                      JPEG, PNG, WEBP up to 5MB. Verified by server magic-byte inspector.
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || description.length < 10}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-civic transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Registering Grievance...</span>
                ) : (
                  <>
                    <span>Submit Civic Grievance</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="text-[11px] text-basalt-400 text-center pt-2">
              Notice: Online grievance submissions are reviewed during municipal operational hours.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};