import React from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Truck, 
  BarChart3, 
  ShieldAlert, 
  Settings, 
  X, 
  Database,
  Navigation,
  Radio,
  Shield,
  AlertCircle,
  FileText
} from 'lucide-react';
import { NavigationView, UserRole } from '../../types';
import { PuneCivicLogo } from '../common/PuneCivicLogo';
import { PUNE_MUNICIPAL_METADATA } from '../../data/puneData';

interface SidebarProps {
  currentView: NavigationView;
  onSelectView: (view: NavigationView) => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  criticalCount?: number;
  activeTruckCount?: number;
  onResetDemo?: () => void;
  dataQualityIssuesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  currentRole,
  onSelectRole,
  isOpenMobile,
  onCloseMobile,
  onResetDemo,
}) => {
  // Normalize legacy views if active
  const activeNormalizedView: NavigationView = 
    currentView === 'city-overview' || currentView === 'overview' ? 'overview' :
    currentView === 'live-operations' || currentView === 'operations-map' || currentView === 'route-planning' || currentView === 'collection-planner' ? 'live-operations' :
    currentView === 'zones-wards' || currentView === 'wards-bins' ? 'wards-bins' :
    currentView === 'fleet-allocation' || currentView === 'fleet' ? 'fleet' :
    currentView === 'waste-analytics' || currentView === 'reports' ? 'reports' :
    currentView === 'collection-log' ? 'administration' :
    currentView;

  const navItems: {
    id: NavigationView;
    label: string;
    marathiLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      marathiLabel: 'शहराचा सारांश',
      icon: LayoutDashboard,
    },
    {
      id: 'live-operations',
      label: 'Live Operations',
      marathiLabel: 'थेट संकलन व नकाशे',
      icon: Navigation,
      badge: 'Live',
    },
    {
      id: 'complaints',
      label: 'Complaints',
      marathiLabel: 'नागरिक तक्रारी',
      icon: AlertCircle,
    },
    {
      id: 'wards-bins',
      label: 'Wards & Bins',
      marathiLabel: 'प्रभाग व कचराकुंड्या',
      icon: Building2,
    },
    {
      id: 'fleet',
      label: 'Fleet',
      marathiLabel: 'वाहन ताफा',
      icon: Truck,
    },
    {
      id: 'reports',
      label: 'Reports',
      marathiLabel: 'अहवाल व आकडेवारी',
      icon: BarChart3,
    },
    {
      id: 'data-quality',
      label: 'Data Quality',
      marathiLabel: 'माहिती गुणवत्ता',
      icon: ShieldAlert,
      badge: 'Caveats',
    },
    {
      id: 'administration',
      label: 'Administration',
      marathiLabel: 'प्रणाली प्रशासन',
      icon: Settings,
    },
  ];

  const handleNavClick = (view: NavigationView) => {
    onSelectView(view);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-basalt-950/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-monsoon-100 border-r border-monsoon-200 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-5 border-b border-monsoon-200 bg-monsoon-50">
          <PuneCivicLogo size="md" />
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-basalt-500 hover:bg-monsoon-200 hover:text-basalt-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Municipal Authority Badge */}
        <div className="px-5 py-3 bg-monsoon-100 border-b border-monsoon-200/80">
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className="w-3.5 h-3.5 text-saffron-600 flex-shrink-0" />
            <span className="text-[11px] font-bold text-basalt-800 uppercase tracking-wider">
              {PUNE_MUNICIPAL_METADATA.authority}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-basalt-600">
            <span className="font-semibold text-basalt-800">
              15 Administrative Zones
            </span>
            <span className="text-[10px] font-bold text-saffron-700 bg-saffron-50 px-1.5 py-0.5 rounded border border-saffron-200">
              Pune Master Data
            </span>
          </div>
        </div>

        {/* Role Switcher in Sidebar (Visible on mobile screens) */}
        <div className="px-3.5 py-3 border-b border-monsoon-200 lg:hidden">
          <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-basalt-500 block mb-1.5">
            Operator View:
          </span>
          <div className="grid grid-cols-1 gap-1">
            {[
              { id: 'municipal_head' as UserRole, label: 'PMC Municipal Head', icon: Shield },
              { id: 'ward_supervisor' as UserRole, label: 'Zone / Ward Officer', icon: Building2 },
              { id: 'driver' as UserRole, label: 'Collection Crew (Mobile)', icon: Truck },
            ].map((r) => {
              const Icon = r.icon;
              const isActive = currentRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onSelectRole(r.id);
                    onCloseMobile();
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                    isActive
                      ? 'bg-saffron-600 text-white'
                      : 'bg-monsoon-50 text-basalt-700 hover:bg-monsoon-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-basalt-500">
            Navigation Console
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNormalizedView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`group relative flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-saffron-700 shadow-civic border border-monsoon-300 font-semibold civic-tab-active'
                    : 'text-basalt-700 hover:bg-monsoon-200/60 hover:text-basalt-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-saffron-600' : 'text-basalt-500 group-hover:text-basalt-700'
                    }`}
                  />
                  <div className="truncate">
                    <span className="block leading-tight font-bold">{item.label}</span>
                    <span className="block text-[10.5px] text-basalt-500 font-normal leading-tight">
                      {item.marathiLabel}
                    </span>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${item.badgeColor || 'bg-monsoon-200 text-basalt-700 border-monsoon-300'}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Provenance & Source Footer Area */}
        <div className="border-t border-monsoon-200 bg-monsoon-50 p-3.5 text-[11px] text-basalt-500 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-basalt-700 flex items-center gap-1.5 text-[11px]">
              <Database className="w-3.5 h-3.5 text-sahyadri-600" />
              Dataset Provenance
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-monsoon-200 text-basalt-600">
              v1.0.0-pune
            </span>
          </div>

          <div className="space-y-0.5 leading-normal text-[10px]">
            <p className="text-basalt-600">
              • 42 Source Ward Records (PMC)
            </p>
            <p className="text-basalt-600">
              • 15 Source Administrative Zones
            </p>
            <p className="text-basalt-600 font-medium">
              • OpenStreetMap Pune GIS Context
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
