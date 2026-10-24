import React from 'react';
import { 
  Settings, 
  ShieldCheck, 
  RotateCcw, 
  Key, 
  ExternalLink, 
  Database,
  Lock
} from 'lucide-react';
import { PUNE_MUNICIPAL_METADATA } from '../../data/puneData';
import { UserRole } from '../../types';

interface AdministrationViewProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onResetDemo: () => void;
  onNavigate: (path: string) => void;
}

export const AdministrationView: React.FC<AdministrationViewProps> = ({
  currentRole,
  onSelectRole,
  onResetDemo,
  onNavigate,
}) => {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="border-b border-monsoon-200 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-saffron-100 text-saffron-800 border border-saffron-200">
            System Administration
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
            Security Controls Intact
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-basalt-900 mt-1 font-sans">
          Municipal Operations Administration & Access Control
        </h1>
        <p className="text-xs sm:text-sm text-basalt-600 mt-0.5">
          Configure operational simulation boundaries, authenticate officer credentials, and manage Pune municipal access roles.
        </p>
      </div>

      {/* Security Architecture Status Card */}
      <div className="p-5 rounded-2xl bg-white border border-monsoon-200 shadow-civic space-y-3">
        <div className="flex items-center gap-2 text-sahyadri-800">
          <ShieldCheck className="w-5 h-5 text-sahyadri-600 shrink-0" />
          <h3 className="font-bold text-sm text-basalt-900">
            Server-Side Security Boundary Architecture
          </h3>
        </div>
        <p className="text-xs text-basalt-600 leading-relaxed">
          WasteWise incorporates an isolated Express TypeScript backend in <code className="font-mono bg-monsoon-100 px-1 py-0.5 rounded">server/</code>. Client-side role selection is treated exclusively as an inspection interface and is never trusted as proof of identity or authorization.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
            <span className="font-bold text-basalt-900 block">Officer Authentication</span>
            <span className="text-basalt-500 text-[11px] block mt-0.5">
              Bcrypt hashing (12 rounds) + HttpOnly SHA-256 session cookies.
            </span>
            <button
              type="button"
              onClick={() => onNavigate('/officer/login')}
              className="mt-2 text-saffron-700 font-bold hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>Officer Portal</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
            <span className="font-bold text-basalt-900 block">Driver Mobile OTP</span>
            <span className="text-basalt-500 text-[11px] block mt-0.5">
              Crypto 6-digit OTP, 5-min expiry, max 3 attempts, isolated dev adapter.
            </span>
            <button
              type="button"
              onClick={() => onNavigate('/driver/login')}
              className="mt-2 text-saffron-700 font-bold hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>Driver Mobile Login</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200">
            <span className="font-bold text-basalt-900 block">Public Grievances</span>
            <span className="text-basalt-500 text-[11px] block mt-0.5">
              Anonymous submission with Multer magic-byte image validation.
            </span>
            <button
              type="button"
              onClick={() => onNavigate('/complaints/new')}
              className="mt-2 text-saffron-700 font-bold hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>Grievance Portal</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Scenario State Reset Card */}
      <div className="p-5 rounded-2xl bg-white border border-monsoon-200 shadow-civic flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div>
          <h4 className="font-bold text-basalt-900 text-sm">
            Reset Operational Scenario Baseline
          </h4>
          <p className="text-basalt-500 mt-0.5">
            Clears operational session caches and restores clean PMC baseline numbers.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetDemo}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-monsoon-100 hover:bg-monsoon-200 text-basalt-800 border border-monsoon-300 transition-colors shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Scenario Baseline</span>
        </button>
      </div>
    </div>
  );
};
