import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  NavigationView, 
  UserRole, 
  BinRecord, 
  TruckRecord, 
  CollectionEvent, 
  DispatchPlanResult, 
  FailureReason
} from './types';
import { INITIAL_PUNE_BINS, calculateOverviewMetrics } from './data/puneBins';
import { INITIAL_PUNE_TRUCKS } from './data/puneFleet';
import { generateProposedDispatch, generateBaselineComparison, manuallyReassignBin } from './services/dispatchEngine';
import { tickTruckSimulation, recordCollectionService } from './services/simulationEngine';
import { loadSavedDemoState, saveDemoState, resetDemoState } from './services/storageService';
import { 
  authApi, 
  dashboardApi, 
  dispatchApi, 
  collectionsApi, 
  driverApi, 
  ApiUser 
} from './services/api';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DriverLayout } from './components/layout/DriverLayout';
import { BinDetailModal } from './components/common/BinDetailModal';
import { BaselineComparisonModal } from './components/baseline/BaselineComparisonModal';

import { DriverView } from './components/roles/DriverView';
import { CityOverviewView } from './components/views/CityOverviewView';
import { LiveOperationsView } from './components/views/LiveOperationsView';
import { WardsBinsView } from './components/views/WardsBinsView';
import { FleetView } from './components/views/FleetView';
import { ReportsView } from './components/views/ReportsView';
import { ZonesWardsView } from './components/views/ZonesWardsView';
import { FleetAllocationView } from './components/views/FleetAllocationView';
import { RoutePlanningView } from './components/views/RoutePlanningView';
import { WasteAnalyticsView } from './components/views/WasteAnalyticsView';
import { DataQualityView } from './components/views/DataQualityView';
import { AdministrationView } from './components/views/AdministrationView';
import { ComplaintsView } from './components/views/ComplaintsView';

import { UnifiedEntryPage } from './components/auth/UnifiedEntryPage';
import { OfficerLoginPage } from './components/auth/OfficerLoginPage';
import { DriverLoginPage } from './components/auth/DriverLoginPage';
import { PublicComplaintPage } from './components/complaints/PublicComplaintPage';
import { AlertTriangle, LogIn, ShieldAlert } from 'lucide-react';

export const App: React.FC = () => {
  // Routing state
  const [currentPath, setCurrentPath] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname || '/' : '/'
  );

  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [serverErrorNotification, setServerErrorNotification] = useState<string | null>(null);

  // Fallback demo state
  const savedState = useMemo(() => loadSavedDemoState(), []);
  const [bins, setBins] = useState<BinRecord[]>(savedState?.bins || INITIAL_PUNE_BINS);
  const [trucks, setTrucks] = useState<TruckRecord[]>(savedState?.trucks || INITIAL_PUNE_TRUCKS);
  const [events, setEvents] = useState<CollectionEvent[]>(savedState?.events || []);
  const [activeRole, setActiveRole] = useState<UserRole>(savedState?.activeRole || 'ward_supervisor');

  const [currentView, setCurrentView] = useState<NavigationView>('overview');
  const [selectedBin, setSelectedBin] = useState<BinRecord | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<TruckRecord | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isBaselineCompareOpen, setIsBaselineCompareOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Simulation controls state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 5>(1);
  const [isGeneratingDispatch, setIsGeneratingDispatch] = useState<boolean>(false);
  const [dispatchPlan, setDispatchPlan] = useState<DispatchPlanResult | null>(null);

  // Navigation helper
  const navigate = useCallback((path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', path);
    }
    setCurrentPath(path);
  }, []);

  // Listen to popstate (back/forward browser buttons)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check authenticated session on startup
  const checkSession = useCallback(async () => {
    setIsAuthChecking(true);
    try {
      const res = await authApi.getMe();
      setCurrentUser(res.user);
      setActiveRole(res.user.role);
      setIsDemoMode(false);
    } catch {
      // No active session
      setCurrentUser(null);
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Load live server data when authenticated
  const loadServerData = useCallback(async () => {
    if (!currentUser) return;
    try {
      if (currentUser.role === 'driver') {
        const routeData = await driverApi.getRoute();
        if (routeData.stops) {
          setBins(routeData.stops);
        }
        if (routeData.truck) {
          const hydratedTruck = {
            ...routeData.truck,
            assignedBinIds: routeData.truck.assignedBinIds || routeData.assignedBinIds || (routeData.stops ? routeData.stops.map((s: any) => s.id) : []),
            completedBinIds: routeData.truck.completedBinIds || routeData.completedBinIds || [],
            assignedRoute: routeData.truck.assignedRoute || routeData.route,
          };
          setTrucks([hydratedTruck]);
        }
      } else {
        const data = await dashboardApi.getDashboard();
        if (data.bins) setBins(data.bins);
        if (data.trucks) setTrucks(data.trucks);
        if (data.events) setEvents(data.events);
      }
    } catch (e: any) {
      console.warn('[Dashboard API] Failed to fetch server data; using cached records:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadServerData();
    }
  }, [currentUser, loadServerData]);

  // Save demo state to localStorage only when in Demo Mode
  useEffect(() => {
    if (isDemoMode) {
      saveDemoState(bins, trucks, events, activeRole);
    }
  }, [bins, trucks, events, activeRole, isDemoMode]);

  // Derived metrics
  const overviewMetrics = useMemo(() => calculateOverviewMetrics(bins), [bins]);
  const baselineMetrics = useMemo(() => generateBaselineComparison(bins, trucks), [bins, trucks]);

  // Handle Login Success
  const handleLoginSuccess = (user: ApiUser) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    setIsDemoMode(false);
    navigate('/');
    loadServerData();
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    }
    setCurrentUser(null);
    setIsDemoMode(false);
    setActiveRole('ward_supervisor');
    navigate('/');
  };

  // Reset Demo simulation
  const handleResetDemo = () => {
    const fresh = resetDemoState();
    setBins(fresh.bins);
    setTrucks(fresh.trucks);
    setEvents(fresh.events);
    setActiveRole(fresh.activeRole);
    setDispatchPlan(null);
    setIsPlaying(false);
  };

  // Simulation tick timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTrucks((prevTrucks) => {
        const result = tickTruckSimulation(prevTrucks, bins, speedMultiplier);
        if (result.newEvents.length > 0) {
          setEvents((prev) => [...result.newEvents, ...prev]);
        }
        return result.updatedTrucks;
      });
    }, 1000 / speedMultiplier);

    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier, bins]);

  // Handle Step Forward
  const handleStepForward = () => {
    const result = tickTruckSimulation(trucks, bins, speedMultiplier);
    setTrucks(result.updatedTrucks);
    setBins(result.updatedBins);
    if (result.newEvents.length > 0) {
      setEvents((prev) => [...result.newEvents, ...prev]);
    }
  };

  // Generate Proposed Dispatch
  const handleGenerateDispatch = async () => {
    setIsGeneratingDispatch(true);
    try {
      const plan = await generateProposedDispatch(bins, trucks);
      setDispatchPlan(plan);
      setTrucks(plan.assignedTrucks);
      setBins(plan.assignedBins);
    } catch (err) {
      console.error('Dispatch calculation error:', err);
    } finally {
      setIsGeneratingDispatch(false);
    }
  };

  // Handle Manual Reassignment
  const handleReassignBin = async (binId: string, newTruckId: string) => {
    if (currentUser) {
      try {
        const res = await dispatchApi.reassignBin(binId, newTruckId);
        setServerErrorNotification(null);
        await loadServerData();
        return;
      } catch (err: any) {
        console.error('[Dispatch API] Reassignment failed:', err);
        setServerErrorNotification(err.message || 'Server rejected bin reassignment');
        return;
      }
    }

    // Offline Demo Mode
    const result = manuallyReassignBin(binId, newTruckId, trucks, bins);
    if (!result.error) {
      setBins(result.updatedBins);
      setTrucks(result.updatedTrucks);
    } else {
      alert(`Reassignment Rejected: ${result.error}`);
    }
  };

  // Handle Stop Collection Completed
  const handleMarkCollected = async (binId: string, truckId?: string) => {
    const activeTruckId = truckId || selectedTruck?.id || trucks[0]?.id;
    if (!activeTruckId) return;

    if (currentUser) {
      try {
        const idempotencyKey = `COLLECT-${binId}-${Date.now()}`;
        await collectionsApi.recordCollection(
          binId,
          activeTruckId,
          'collected',
          undefined,
          undefined,
          idempotencyKey
        );
        setServerErrorNotification(null);
        await loadServerData();
        return;
      } catch (err: any) {
        console.error('[Collections API] Collection write failed:', err);
        setServerErrorNotification(err.message || 'Server rejected collection completion');
        return;
      }
    }

    // Offline Demo Mode
    const result = recordCollectionService(binId, activeTruckId, trucks, bins, 'collected');
    setTrucks(result.updatedTrucks);
    setBins(result.updatedBins);
    if (!result.isDuplicate) {
      setEvents((prev) => [result.event, ...prev]);
    }
  };

  // Handle Unable to Collect
  const handleUnableToCollect = async (
    binId: string,
    truckId: string,
    reason: FailureReason,
    note?: string
  ) => {
    if (currentUser) {
      try {
        await collectionsApi.recordCollection(
          binId,
          truckId,
          'unable_to_collect',
          reason,
          note
        );
        setServerErrorNotification(null);
        await loadServerData();
        return;
      } catch (err: any) {
        console.error('[Collections API] Collection failure logging failed:', err);
        setServerErrorNotification(err.message || 'Server rejected failure logging');
        return;
      }
    }

    // Offline Demo Mode
    const result = recordCollectionService(binId, truckId, trucks, bins, 'unable_to_collect', reason, note);
    setTrucks(result.updatedTrucks);
    setBins(result.updatedBins);
    if (!result.isDuplicate) {
      setEvents((prev) => [result.event, ...prev]);
    }
  };

  const handleInspectBin = (bin: BinRecord) => {
    setSelectedBin(bin);
    setIsDetailModalOpen(true);
  };

  const handleSelectTruck = (truck: TruckRecord) => {
    setSelectedTruck(truck);
  };

  // Direct Page Rendering for Auth & Complaints
  if (currentPath === '/officer/login') {
    return <OfficerLoginPage onLoginSuccess={handleLoginSuccess} onNavigate={navigate} />;
  }

  if (currentPath === '/driver/login') {
    return <DriverLoginPage onLoginSuccess={handleLoginSuccess} onNavigate={navigate} />;
  }

  if (currentPath === '/complaints/new') {
    return <PublicComplaintPage onNavigate={navigate} />;
  }

  // Unified Entry Screen for unauthenticated visitors on root /
  if (!currentUser && !isDemoMode && !isAuthChecking) {
    return (
      <UnifiedEntryPage
        onNavigate={navigate}
        onEnterDemoMode={() => setIsDemoMode(true)}
      />
    );
  }

  // Priority 1: Dedicated Driver Layout (No Operator Sidebar or Modules)
  if (activeRole === 'driver') {
    return (
      <>
        <DriverLayout
          currentUser={currentUser}
          trucks={trucks}
          bins={bins}
          onMarkCollected={handleMarkCollected}
          onUnableToCollect={handleUnableToCollect}
          onRefreshRoute={loadServerData}
          onLogout={handleLogout}
          serverErrorNotification={serverErrorNotification}
          onDismissError={() => setServerErrorNotification(null)}
        />
        {isDetailModalOpen && (
          <BinDetailModal
            bin={selectedBin}
            onClose={() => setIsDetailModalOpen(false)}
            trucks={trucks}
            onAssignToTruck={(binId, truckId) => handleReassignBin(binId, truckId)}
            onMarkCollected={(binId) => handleMarkCollected(binId)}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-monsoon-50 font-sans text-basalt-800 antialiased selection:bg-saffron-100 selection:text-saffron-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        currentRole={activeRole}
        onSelectRole={(r) => {
          if (!currentUser) {
            setActiveRole(r);
          }
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        criticalCount={overviewMetrics.criticalBins}
        activeTruckCount={trucks.filter((t) => t.status !== 'Offline').length}
        onResetDemo={handleResetDemo}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header Bar */}
        <Header
          currentRole={activeRole}
          currentUser={currentUser}
          isDemoMode={isDemoMode}
          onSelectRole={(r) => {
            if (!currentUser) {
              setActiveRole(r);
            }
          }}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onResetDemo={handleResetDemo}
          onLogout={handleLogout}
          onNavigateLogin={() => navigate('/officer/login')}
        />

        {/* Server Error Alert Banner */}
        {serverErrorNotification && (
          <div className="bg-red-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{serverErrorNotification}</span>
            </div>
            <button
              onClick={() => setServerErrorNotification(null)}
              className="text-[10px] bg-red-700 px-2 py-0.5 rounded uppercase"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Unauthenticated Mode Guidance Banner */}
        {!currentUser && !isAuthChecking && (
          <div className="bg-monsoon-100 border-b border-monsoon-300 px-4 py-2.5 text-xs text-basalt-700 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-saffron-600 shrink-0" />
              <span>
                <strong>Sign in to access authorized operational controls</strong> and server-backed municipal workflows.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/officer/login')}
                className="font-bold text-white bg-basalt-900 hover:bg-black px-3 py-1.5 rounded-lg border border-basalt-950 flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-saffron-400" /> Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDemoMode(false);
                  navigate('/');
                }}
                className="font-bold text-basalt-700 bg-white hover:bg-monsoon-200 px-3 py-1.5 rounded-lg border border-monsoon-300 cursor-pointer text-xs transition-colors"
              >
                Portal Home
              </button>
            </div>
          </div>
        )}

        {/* Dynamic View Container based on Operator Navigation */}
        <main className="flex-1 w-full">
          {/* 1. Overview */}
          {(currentView === 'overview' || currentView === 'city-overview') && (
            <CityOverviewView 
              onNavigateView={setCurrentView}
              bins={bins}
              trucks={trucks}
              onInspectBin={handleInspectBin}
              onSelectTruck={handleSelectTruck}
            />
          )}

          {/* 2. Live Operations */}
          {(currentView === 'live-operations' || currentView === 'operations-map' || currentView === 'route-planning' || currentView === 'collection-planner') && (
            <LiveOperationsView 
              bins={bins}
              trucks={trucks}
              onInspectBin={handleInspectBin}
              onSelectTruck={handleSelectTruck}
              onReassignBin={handleReassignBin}
            />
          )}

          {/* 3. Complaints */}
          {currentView === 'complaints' && (
            <ComplaintsView />
          )}

          {/* 4. Wards & Bins */}
          {(currentView === 'wards-bins' || currentView === 'zones-wards') && (
            <WardsBinsView 
              bins={bins}
              onInspectBin={handleInspectBin}
            />
          )}

          {/* 5. Fleet */}
          {(currentView === 'fleet' || currentView === 'fleet-allocation') && (
            <FleetView 
              trucks={trucks}
              onSelectTruck={handleSelectTruck}
            />
          )}

          {/* 6. Reports */}
          {(currentView === 'reports' || currentView === 'waste-analytics') && (
            <ReportsView 
              bins={bins}
              trucks={trucks}
              events={events}
            />
          )}

          {/* 7. Data Quality */}
          {currentView === 'data-quality' && (
            <DataQualityView />
          )}

          {/* 8. Administration */}
          {(currentView === 'administration' || currentView === 'collection-log') && (
            <AdministrationView
              currentRole={activeRole}
              onSelectRole={setActiveRole}
              onResetDemo={handleResetDemo}
              onNavigate={navigate}
            />
          )}
        </main>
      </div>

      {/* Accessible Bin Inspection Modal */}
      {isDetailModalOpen && (
        <BinDetailModal
          bin={selectedBin}
          onClose={() => setIsDetailModalOpen(false)}
          trucks={trucks}
          onAssignToTruck={(binId, truckId) => handleReassignBin(binId, truckId)}
          onMarkCollected={(binId) => handleMarkCollected(binId)}
        />
      )}

      {/* Baseline Strategy Comparison Modal */}
      {isBaselineCompareOpen && (
        <BaselineComparisonModal
          proposed={dispatchPlan}
          baseline={baselineMetrics}
          onClose={() => setIsBaselineCompareOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
