import React, { useState } from 'react';
import { 
  Shield, 
  Truck, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  MapPin, 
  Languages, 
  FileText, 
  Database
} from 'lucide-react';
import { PuneCivicLogo } from '../common/PuneCivicLogo';
import { PUNE_MUNICIPAL_METADATA } from '../../data/puneData';

interface UnifiedEntryPageProps {
  onNavigate: (path: string) => void;
  onEnterDemoMode?: () => void;
}

export const UnifiedEntryPage: React.FC<UnifiedEntryPageProps> = ({
  onNavigate,
}) => {
  const [driverLang, setDriverLang] = useState<'en' | 'hi'>('en');

  return (
    <div className="min-h-screen bg-monsoon-50 flex flex-col justify-between selection:bg-saffron-100 selection:text-saffron-900">
      {/* Top Header Banner */}
      <header className="border-b border-monsoon-200 bg-white/95 backdrop-blur-xs px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <PuneCivicLogo size="md" showSubtitle={true} />
        
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-saffron-100 text-saffron-800 border border-saffron-200 hidden sm:inline-block">
            PUNE MUNICIPAL OPERATIONS
          </span>
        </div>
      </header>

      {/* Main Hero & 3-Column Role Selection Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        {/* Hero Headline */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-basalt-900 tracking-tight font-sans">
            Civic Waste Collection <span className="text-saffron-600">Decision Support</span>
          </h1>
          <p className="text-xs sm:text-sm text-basalt-600 leading-relaxed">
            Choose your portal below to access authorized municipal monitoring, driver route navigation, or anonymous public grievance redressal for Pune.
          </p>
        </div>

        {/* The 3 Prominent Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Card 1: Municipal Officer Portal (English) */}
          <div className="flex flex-col h-full rounded-2xl bg-white border border-monsoon-200 p-6 shadow-civic hover:shadow-civic-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-basalt-900" />
            
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-basalt-900 text-white flex items-center justify-center shadow-xs">
                  <Shield className="w-6 h-6 text-saffron-400" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-monsoon-100 text-basalt-700 border border-monsoon-300">
                  Officer Auth
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-basalt-900 group-hover:text-saffron-700 transition-colors">
                  Operator Login
                </h2>
                <p className="text-xs font-semibold text-saffron-700">
                  Citywide Directorate &amp; Ward Supervisors
                </p>
              </div>

              <p className="text-xs text-basalt-600 leading-relaxed">
                Authorized access for municipal heads and ward supervisors. Review public complaints, analyze 1,592 TPD waste generation, inspect fleet allocations, run route scenarios, and audit data quality.
              </p>

              <div className="space-y-1.5 pt-2 text-[11px] text-basalt-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sahyadri-600 shrink-0" />
                  <span>Public Complaints Review &amp; Resolution</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sahyadri-600 shrink-0" />
                  <span>42 Wards &amp; 15 Zones Macro Intelligence</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sahyadri-600 shrink-0" />
                  <span>HttpOnly Secure Session Cookie</span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-monsoon-200 w-full">
              <button
                type="button"
                onClick={() => onNavigate('/officer/login')}
                className="w-full min-h-[46px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-basalt-900 hover:bg-black active:bg-basalt-950 border border-basalt-950 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <span>Sign in as Operator →</span>
              </button>
            </div>
          </div>

          {/* Card 2: Driver Collection Terminal (English / Hindi Toggle) */}
          <div className="flex flex-col h-full rounded-2xl bg-white border border-monsoon-200 p-6 shadow-civic hover:shadow-civic-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />

            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <Truck className="w-6 h-6" />
                </div>
                
                {/* Language Switcher on Driver Card */}
                <div className="inline-flex rounded-lg border border-monsoon-300 bg-monsoon-100 p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDriverLang('en')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      driverLang === 'en'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-basalt-600 hover:text-basalt-900'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriverLang('hi')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      driverLang === 'hi'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-basalt-600 hover:text-basalt-900'
                    }`}
                  >
                    हिन्दी
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-basalt-900 group-hover:text-emerald-700 transition-colors">
                  {driverLang === 'en' ? 'Driver Login' : 'ड्राइवर लॉगिन'}
                </h2>
                <p className="text-xs font-semibold text-emerald-700">
                  {driverLang === 'en' ? 'Collection Crew Mobile Terminal' : 'कचरा संकलन वाहन चालक टर्मिनल'}
                </p>
              </div>

              <p className="text-xs text-basalt-600 leading-relaxed">
                {driverLang === 'en'
                  ? 'Mobile-optimized interface for collection truck crews. Inspect assigned stops in your ward, log collected bins in one tap, report access obstacles, and view turn-by-turn routing.'
                  : 'वाहन चालकों के लिए मोबाइल टर्मिनल। अपने वार्ड के आवंटित स्टॉप देखें, कचरा उठाने की पुष्टि करें, सड़क बाधाओं की रिपोर्ट करें और सीधा मैप रूट देखें।'}
              </p>

              <div className="space-y-1.5 pt-2 text-[11px] text-basalt-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sahyadri-600 shrink-0" />
                  <span>{driverLang === 'en' ? 'One-Tap Stop Completion' : 'एक-टैप में कचरा संकलन पुष्टि'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sahyadri-600 shrink-0" />
                  <span>{driverLang === 'en' ? 'Prominent Ward & Colony Banner' : 'स्पष्ट वार्ड व कॉलोनी विवरण'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sahyadri-600 shrink-0" />
                  <span>{driverLang === 'en' ? 'Mobile SMS OTP Single-Use Auth' : 'सुरक्षित मोबाइल एसएमएस ओटीपी'}</span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-monsoon-200 w-full">
              <button
                type="button"
                onClick={() => onNavigate('/driver/login')}
                className="w-full min-h-[46px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 border border-emerald-800 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <span>{driverLang === 'en' ? 'Continue as Driver →' : 'ड्राइवर के रूप में आगे बढ़ें →'}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Public Complaint Form (No Login Required) */}
          <div className="flex flex-col h-full rounded-2xl bg-white border border-monsoon-200 p-6 shadow-civic hover:shadow-civic-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600" />

            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                  No Login Required
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-basalt-900 group-hover:text-rose-700 transition-colors">
                  Report a Problem
                </h2>
                <p className="text-xs font-semibold text-rose-700">
                  Public Grievance Redressal (नागरिक तक्रार)
                </p>
              </div>

              <p className="text-xs text-basalt-600 leading-relaxed">
                Open public reporting portal for Pune citizens. Report overflowing bins, missed daily collection, or hazardous dumping across all 42 municipal wards with optional photo verification.
              </p>

              <div className="space-y-1.5 pt-2 text-[11px] text-basalt-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sahyadri-600 shrink-0" />
                  <span>100% Anonymous (No Phone or Sign Up)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sahyadri-600 shrink-0" />
                  <span>Instant Reference Code Generated</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sahyadri-600 shrink-0" />
                  <span>Reviewed Directly by Ward Officers</span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-monsoon-200 w-full">
              <button
                type="button"
                onClick={() => onNavigate('/complaints/new')}
                className="w-full min-h-[46px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 border border-rose-700 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <span>Report a Problem →</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info Area */}
      <footer className="border-t border-monsoon-200 bg-white px-4 sm:px-8 py-4 text-xs text-basalt-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-saffron-600 shrink-0" />
            <span>
              <strong>SANCHAYA Data Core:</strong> 15 Administrative Zones • 42 Ward Records • 1,592.43 TPD Reported
            </span>
          </div>
          <div className="text-[11px] text-basalt-400">
            OpenStreetMap GIS Context • Node.js / Express Security Boundary • Vitest Verified
          </div>
        </div>
      </footer>
    </div>
  );
};