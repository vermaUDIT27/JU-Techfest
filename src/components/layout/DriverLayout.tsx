import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  TruckRecord, 
  BinRecord, 
  FailureReason 
} from '../../types';
import { ApiUser, dispatchApi } from '../../services/api';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Layers, 
  Map as MapIcon, 
  RefreshCw, 
  Building2, 
  LogOut, 
  AlertCircle, 
  Radio, 
  Zap 
} from 'lucide-react';
import { getRiskBadgeClasses } from '../../services/riskEngine';
import { createDustbinMarkerHtml } from '../common/DustbinMarkerIcon';
import { createTruckMarkerHtml } from '../common/TruckMarkerIcon';

interface DriverLayoutProps {
  currentUser: ApiUser | null;
  trucks: TruckRecord[];
  bins: BinRecord[];
  onMarkCollected: (binId: string, truckId?: string) => Promise<void> | void;
  onUnableToCollect: (binId: string, truckId: string, reason: FailureReason, note?: string) => Promise<void> | void;
  onRefreshRoute?: () => Promise<void> | void;
  onLogout: () => void;
  serverErrorNotification?: string | null;
  onDismissError?: () => void;
}

export const DriverLayout: React.FC<DriverLayoutProps> = ({
  currentUser,
  trucks,
  bins,
  onMarkCollected,
  onUnableToCollect,
  onRefreshRoute,
  onLogout,
  serverErrorNotification,
  onDismissError,
}) => {
  // Bilingual Plain Language State: English or Hindi
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  // UI state
  const [activeTab, setActiveTab] = useState<'terminal' | 'list'>('terminal');
  const [showMap, setShowMap] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active truck matching authenticated driver
  const assignedTruckId = currentUser?.assignedTruckId;
  const activeTruck = trucks.find((t) => t.id === assignedTruckId) || trucks[0];

  // Stop IDs strictly scoped to driver's vehicle
  const assignedBinIds = activeTruck?.assignedBinIds || [];
  const completedBinIds = activeTruck?.completedBinIds || [];

  // Scoped bins for this driver, strictly preserving assigned stop sequence
  const assignedBins = useMemo(() => {
    if (!assignedBinIds || assignedBinIds.length === 0) {
      return [];
    }
    return assignedBinIds
      .map((id) => bins.find((b) => b.id === id))
      .filter((b): b is BinRecord => Boolean(b));
  }, [assignedBinIds, bins]);

  // Determine next uncollected stop
  const nextStopBin = useMemo(() => {
    return assignedBins.find(
      (b) => !completedBinIds.includes(b.id) && b.collectionStatus !== 'collected'
    ) || null;
  }, [assignedBins, completedBinIds]);

  const totalStops = assignedBins.length;
  const completedStopsCount = useMemo(() => {
    return assignedBins.filter(
      (b) => completedBinIds.includes(b.id) || b.collectionStatus === 'collected'
    ).length;
  }, [assignedBins, completedBinIds]);

  const pendingStopsCount = Math.max(0, totalStops - completedStopsCount);
  const progressPercent = totalStops > 0 
    ? Math.min(100, Math.round((completedStopsCount / totalStops) * 100)) 
    : 0;

  // Active route exists only if there are assigned stops AND at least one stop is pending
  const hasActiveRoute = totalStops > 0 && pendingStopsCount > 0 && nextStopBin !== null;

  // Modal & Toast states
  const [isUnableModalOpen, setIsUnableModalOpen] = useState(false);
  const [selectedFailureReason, setSelectedFailureReason] = useState<FailureReason>('road_blocked');
  const [failureNote, setFailureNote] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successToastMessage, setSuccessToastMessage] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isSpikingSensor, setIsSpikingSensor] = useState(false);
  const [sensorToastMessage, setSensorToastMessage] = useState<string | null>(null);

  // Manual refresh with loading state
  const handleRefresh = useCallback(async () => {
    if (!onRefreshRoute || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshRoute();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshRoute, isRefreshing]);

  // Demo Sensor Trigger
  const handleSimulateSensorSpike = async () => {
    if (isSpikingSensor) return;
    setIsSpikingSensor(true);
    try {
      const targetBinId = nextStopBin ? nextStopBin.id : 'WW-PUN-01';
      const res = await dispatchApi.simulateSensorSpike(targetBinId, 96);
      setSensorToastMessage(res.message || 'Sensor telemetry update: 96% fill recorded');
      if (onRefreshRoute) {
        await onRefreshRoute();
      }
      setTimeout(() => setSensorToastMessage(null), 5000);
    } catch (err: any) {
      console.warn('Sensor spike trigger failed:', err);
    } finally {
      setIsSpikingSensor(false);
    }
  };

  // Leaflet Map References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Plain-Language Bilingual Dictionary (English & Hindi)
  const t = {
    appTitle: lang === 'en' ? 'SANCHAYA' : 'संचय',
    roleTag: lang === 'en' ? 'Driver Terminal' : 'वाहन चालक टर्मिनल',
    logout: lang === 'en' ? 'Log Out' : 'लॉग आउट',
    driver: lang === 'en' ? 'Driver' : 'चालक',
    vehicle: lang === 'en' ? 'Vehicle' : 'वाहन',
    ward: lang === 'en' ? 'Ward' : 'प्रभाग',
    routeProgress: lang === 'en' ? 'Route Progress' : 'रूट प्रगती',
    stops: lang === 'en' ? 'stops' : 'थांबे',
    pendingLabel: lang === 'en' ? 'pending' : 'बाकी',
    clearedLabel: lang === 'en' ? 'cleared' : 'पूर्ण',
    nextStop: lang === 'en' ? 'Next Collection Stop' : 'पुढील कचरा संकलन थांबा',
    markCollected: lang === 'en' ? 'Mark Stop Collected' : 'कचरा गोळा केला (उठा लिया)',
    navGoogle: lang === 'en' ? 'Navigate to Next Stop' : 'पुढील थांबा नेव्हिगेशन (मॅप)',
    reportProblem: lang === 'en' ? 'Report Problem' : 'समस्या नोंदवा',
    expectedWeight: lang === 'en' ? 'Expected Waste' : 'अपेक्षित कचरा',
    capacity: lang === 'en' ? 'Bin Volume' : 'क्षमता',
    fillLevel: lang === 'en' ? 'Fill Level' : 'कचरा पातळी',
    readingSource: lang === 'en' ? 'Reading Source' : 'माहिती स्त्रोत',
    viewMap: lang === 'en' ? 'Map View' : 'नकाशा दृश्य',
    viewList: lang === 'en' ? 'Stop List' : 'थांब्यांची यादी',
    refresh: lang === 'en' ? 'Refresh Route' : 'रूट रिफ्रेश करा',
    checking: lang === 'en' ? 'Checking Route...' : 'रूट तपासत आहे...',
    noRouteTitle: lang === 'en' ? 'No Active Route Assigned' : 'सध्या कोणताही मार्ग नियुक्त केलेला नाही',
    noRouteDesc: lang === 'en' 
      ? 'Your vehicle currently has no pending stops. All collections for this shift have been cleared, or your supervisor has not dispatched a new route yet.'
      : 'आपल्या वाहनासाठी सध्या कोणतेही प्रलंबित थांबे नाहीत. या शिफ्टचे सर्व काम पूर्ण झाले आहे किंवा नवीन मार्ग नियुक्त केलेला नाही.',
    obstacleModalTitle: lang === 'en' ? 'Report Collection Obstacle' : 'कचरा उचलण्यात अडथळा नोंदवा',
    obstacleReason: lang === 'en' ? 'Obstacle Reason' : 'अडथळ्याचे कारण',
    obstacleNotes: lang === 'en' ? 'Notes (Optional)' : 'टिप्पणी (पर्यायी)',
    submitObstacle: lang === 'en' ? 'Submit Problem Log' : 'समस्या नोंदवा',
    cancel: lang === 'en' ? 'Cancel' : 'रद्द करा',
  };

  // String key for stop statuses to prevent unnecessary map redraws
  const routeStopKey = useMemo(() => {
    return `${assignedBins.map((b) => `${b.id}:${b.collectionStatus}`).join(',')}:${nextStopBin?.id || 'none'}`;
  }, [assignedBins, nextStopBin]);

  // Initialize and update embedded Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || !showMap || !hasActiveRoute) {
      if (!hasActiveRoute && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersGroupRef.current = null;
      }
      return;
    }

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = nextStopBin && !nextStopBin.locationUnavailable
        ? [nextStopBin.location.lat, nextStopBin.location.lng]
        : activeTruck?.currentCoords
        ? [activeTruck.currentCoords.lat, activeTruck.currentCoords.lng]
        : [18.5204, 73.8567];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    // 1. Render Assigned Dustbin Markers
    assignedBins.forEach((bin) => {
      if (!bin.locationUnavailable && typeof bin.location?.lat === 'number' && typeof bin.location?.lng === 'number' && (bin.location.lat !== 0 || bin.location.lng !== 0)) {
        const isCurrent = bin.id === nextStopBin?.id;
        const iconHtml = createDustbinMarkerHtml(bin, isCurrent);

        const icon = L.divIcon({
          className: 'custom-driver-bin-marker',
          html: iconHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([bin.location.lat, bin.location.lng], { icon });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px; padding: 4px;">
            <strong>${bin.name}</strong><br/>
            <span>${bin.location.address}</span><br/>
            <span style="color: #D97706; font-weight: bold;">Est: ${bin.estimatedKg} kg (${bin.currentFillPercent}% fill)</span>
          </div>
        `);
        marker.addTo(markersGroup);
        bounds.push([bin.location.lat, bin.location.lng]);
      }
    });

    // 2. Render Truck Marker
    if (activeTruck && typeof activeTruck.currentCoords?.lat === 'number') {
      const truckIconHtml = createTruckMarkerHtml(activeTruck, true);
      const truckIcon = L.divIcon({
        className: 'custom-driver-truck-marker',
        html: truckIconHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const truckMarker = L.marker([activeTruck.currentCoords.lat, activeTruck.currentCoords.lng], {
        icon: truckIcon,
        zIndexOffset: 1000,
      });
      truckMarker.bindPopup(`<strong>${activeTruck.id}</strong><br/>${activeTruck.driverName}`);
      truckMarker.addTo(markersGroup);
      bounds.push([activeTruck.currentCoords.lat, activeTruck.currentCoords.lng]);
    }

    // 3. Render Route Road Geometry Polyline
    const roadGeometry = activeTruck?.assignedRoute?.roadGeometry;
    if (roadGeometry && roadGeometry.length > 1) {
      const polyline = L.polyline(roadGeometry, {
        color: activeTruck.color || '#D3832B',
        weight: 4,
        opacity: 0.85,
        lineJoin: 'round',
      });
      polyline.addTo(markersGroup);
      roadGeometry.forEach(([lat, lng]) => {
        if (typeof lat === 'number' && typeof lng === 'number' && (lat !== 0 || lng !== 0)) {
          bounds.push([lat, lng]);
        }
      });
    } else if (bounds.length > 1) {
      const polyline = L.polyline(bounds as [number, number][], {
        color: activeTruck?.color || '#D3832B',
        weight: 3,
        opacity: 0.7,
        dashArray: '6, 6',
      });
      polyline.addTo(markersGroup);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [30, 30], maxZoom: 15 });
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => clearTimeout(timer);
  }, [showMap, hasActiveRoute, activeTruck, routeStopKey, assignedBins, nextStopBin]);

  const handleCollected = async (binId: string) => {
    if (isSubmittingAction || !activeTruck) return;
    setIsSubmittingAction(true);
    try {
      await onMarkCollected(binId, activeTruck.id);
      
      const isLastStop = pendingStopsCount <= 1;
      const msg = isLastStop
        ? (lang === 'en' ? 'All stops cleared! Checking for next assignment...' : 'सर्व थांबे पूर्ण झाले! पुढील मार्ग तपासत आहे...')
        : (lang === 'en' ? 'Stop cleared! Payload recorded.' : 'कचरा गोळा केला! वजन नोंदवले गेले.');
      
      setSuccessToastMessage(msg);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3500);

      // Immediately refresh route data to check for next assignment or completed state
      if (onRefreshRoute) {
        await onRefreshRoute();
      }
    } catch (err: any) {
      console.error('Failed to mark collection:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleConfirmObstacle = async () => {
    if (isSubmittingAction || !nextStopBin || !activeTruck) return;
    setIsSubmittingAction(true);
    try {
      await onUnableToCollect(nextStopBin.id, activeTruck.id, selectedFailureReason, failureNote);
      setIsUnableModalOpen(false);
      setFailureNote('');
      if (onRefreshRoute) {
        await onRefreshRoute();
      }
    } catch (err: any) {
      console.error('Failed to log obstacle:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const driverDisplayName = currentUser?.name || activeTruck?.driverName || 'Municipal Driver';
  const assignedWardName = currentUser?.assignedWardId || (nextStopBin ? nextStopBin.location.ward : 'Pune Central Corridor');

  return (
    <div className="min-h-screen bg-monsoon-100 flex flex-col font-sans select-none antialiased overflow-x-hidden">
      {/* 1. Dedicated Mobile-First Driver Header (NO OPERATOR MODULES) */}
      <header className="bg-basalt-900 text-white border-b border-basalt-950 px-4 py-3 shadow-civic sticky top-0 z-40">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          {/* Logo & Driver Tag */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sahyadri-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-sm tracking-tight">{t.appTitle}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sahyadri-800 text-sahyadri-200 border border-sahyadri-700 shrink-0">
                  {t.roleTag}
                </span>
              </div>
              <p className="text-[11px] text-monsoon-300 font-medium truncate max-w-[170px] sm:max-w-xs">
                {driverDisplayName} • {activeTruck?.id || 'Assigned Truck'}
              </p>
            </div>
          </div>

          {/* Right Controls: Language Toggle & Safe Logout */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Bilingual Toggle Pill */}
            <div className="flex items-center gap-0.5 bg-basalt-800 p-0.5 rounded-lg border border-basalt-700">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  lang === 'en' ? 'bg-white text-basalt-900 shadow-xs' : 'text-monsoon-300 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('hi')}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  lang === 'hi' ? 'bg-white text-basalt-900 shadow-xs' : 'text-monsoon-300 hover:text-white'
                }`}
              >
                हिंदी
              </button>
            </div>

            {/* Logout Action */}
            <button
              type="button"
              onClick={onLogout}
              title={t.logout}
              className="p-2 rounded-lg bg-basalt-800 hover:bg-rose-900/60 text-monsoon-300 hover:text-rose-200 border border-basalt-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Server Error Alert Banner */}
      {serverErrorNotification && (
        <div className="bg-rose-600 text-white text-xs font-bold px-4 py-2.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 max-w-xl mx-auto w-full min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{serverErrorNotification}</span>
            {onDismissError && (
              <button
                onClick={onDismissError}
                className="ml-auto text-[10px] bg-rose-700 hover:bg-rose-800 px-2.5 py-1 rounded uppercase font-bold shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Driver Context & Route Progress Header */}
      <div className="bg-white border-b border-monsoon-200 px-4 py-3 shadow-xs">
        <div className="max-w-xl mx-auto space-y-2">
          {/* Ward & Truck Context */}
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-1.5 font-bold text-basalt-800 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-saffron-600 shrink-0" />
              <span className="truncate">{t.ward}: <span className="text-saffron-700">{assignedWardName}</span></span>
            </div>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-monsoon-100 text-basalt-700 border border-monsoon-300 shrink-0">
              {activeTruck?.id}
            </span>
          </div>

          {/* Route Progress Bar - only displayed when an active route with pending stops exists */}
          {hasActiveRoute && (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-basalt-600">
                  {t.routeProgress}: <strong className="text-basalt-900">{completedStopsCount} / {totalStops} {t.stops}</strong>
                  <span className="text-amber-800 font-semibold ml-1.5 text-[11px]">({pendingStopsCount} {t.pendingLabel})</span>
                </span>
                <span className="font-mono text-sahyadri-700 font-extrabold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-monsoon-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-sahyadri-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Live Telemetry Signal Action */}
          <div className="flex items-center justify-between pt-1 border-t border-monsoon-100">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold">
              <Radio className="w-3 h-3 text-amber-600 animate-pulse shrink-0" />
              <span>LIVE IOT TELEMETRY</span>
            </span>
            <button
              type="button"
              disabled={isSpikingSensor}
              onClick={handleSimulateSensorSpike}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold text-[11px] shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 shrink-0"
              title="Dispatches IoT telemetry event to test automatic dynamic re-dispatch"
            >
              <Zap className="w-3 h-3 fill-current shrink-0" />
              <span>{isSpikingSensor ? 'Sending...' : 'Signal Surge (96%)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Touch-First Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 space-y-4">
        {/* Sensor Spike Toast */}
        {sensorToastMessage && (
          <div className="p-3.5 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center justify-between shadow-civic animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className="w-4 h-4 animate-pulse shrink-0" />
              <span className="truncate">{sensorToastMessage}</span>
            </div>
            <button
              onClick={() => setSensorToastMessage(null)}
              className="text-[10px] uppercase bg-amber-600 hover:bg-amber-700 px-2 py-0.5 rounded font-bold cursor-pointer shrink-0 ml-2"
            >
              OK
            </button>
          </div>
        )}

        {/* Success Toast */}
        {showSuccessToast && (
          <div className="p-4 rounded-xl bg-sahyadri-600 text-white font-bold text-xs flex items-center justify-between shadow-civic animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <span className="truncate">
                {successToastMessage || (lang === 'en' ? 'Stop cleared! Payload recorded.' : 'कचरा गोळा केला! वजन नोंदवले गेले.')}
              </span>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              className="text-[10px] uppercase bg-sahyadri-700 hover:bg-sahyadri-800 px-2 py-0.5 rounded font-bold shrink-0 ml-2 cursor-pointer"
            >
              OK
            </button>
          </div>
        )}

        {/* ACTIVE ROUTE VIEW: Hero Card, Map & Stop Sequence */}
        {hasActiveRoute && nextStopBin ? (
          <>
            {/* View Toggle (Map vs Stop List) */}
            <div className="flex rounded-xl bg-monsoon-200 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('terminal')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'terminal' ? 'bg-white text-basalt-900 shadow-xs' : 'text-basalt-600 hover:text-basalt-900'
                }`}
              >
                <MapIcon className="w-4 h-4 shrink-0" />
                <span>{t.viewMap}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'list' ? 'bg-white text-basalt-900 shadow-xs' : 'text-basalt-600 hover:text-basalt-900'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>{t.viewList} ({pendingStopsCount} {t.pendingLabel})</span>
              </button>
            </div>

            {/* Embedded Scoped Map (Only driver's assigned stops) */}
            {activeTab === 'terminal' && showMap && (
              <div className="rounded-2xl bg-white border border-monsoon-200 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-monsoon-200 bg-monsoon-50 text-xs">
                  <span className="font-bold text-basalt-700 flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-saffron-600 shrink-0" />
                    <span className="truncate">{assignedWardName} Route</span>
                  </span>
                  {onRefreshRoute && (
                    <button
                      type="button"
                      disabled={isRefreshing}
                      onClick={handleRefresh}
                      className="text-saffron-700 hover:underline font-semibold flex items-center gap-1 text-[11px] cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>{isRefreshing ? t.checking : t.refresh}</span>
                    </button>
                  )}
                </div>
                <div
                  ref={mapContainerRef}
                  className="w-full h-52 bg-monsoon-100 relative z-10"
                  style={{ minHeight: '210px' }}
                />
              </div>
            )}

            {/* Next Stop Hero Card (Large Touch Controls) */}
            {activeTab === 'terminal' && (
              <div className="p-5 rounded-2xl bg-white border-2 border-saffron-400 shadow-civic space-y-4">
                {/* Header: Stop Number & Status */}
                <div className="flex items-center justify-between border-b border-monsoon-200 pb-2.5 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-saffron-600 text-white font-extrabold text-xs flex items-center justify-center font-mono shrink-0">
                      {completedStopsCount + 1}
                    </span>
                    <span className="text-xs font-bold text-saffron-800 uppercase tracking-wider truncate">
                      {t.nextStop}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase ${getRiskBadgeClasses(nextStopBin.riskCategory)}`}>
                      {nextStopBin.currentFillPercent}% • {nextStopBin.riskCategory}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-sahyadri-100 text-sahyadri-900 border border-sahyadri-300">
                      {nextStopBin.readingSource === 'sensor' ? 'IOT SENSOR' : 'TELEMETRY'}
                    </span>
                  </div>
                </div>

                {/* Bin Identity & Localization */}
                <div className="space-y-0.5">
                  <div className="text-xs font-mono font-bold text-basalt-400">
                    {nextStopBin.code}
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-basalt-900 leading-snug">
                    {nextStopBin.name}
                  </h3>
                  {(nextStopBin.marathiName || nextStopBin.hindiName) && (
                    <p className="text-xs sm:text-sm text-saffron-800 font-semibold">
                      {lang === 'hi' ? (nextStopBin.hindiName || nextStopBin.marathiName) : (nextStopBin.marathiName || nextStopBin.hindiName)}
                    </p>
                  )}
                </div>

                {/* Address & Landmark */}
                <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200 text-xs space-y-1.5">
                  <div className="flex items-start gap-2 text-basalt-700">
                    <MapPin className="w-4 h-4 text-saffron-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <strong className="text-basalt-900 block leading-tight">{nextStopBin.location.address}</strong>
                      {nextStopBin.location.landmark && (
                        <span className="text-basalt-500 text-[11px] block mt-0.5">Landmark: {nextStopBin.location.landmark}</span>
                      )}
                      {nextStopBin.locationUnavailable && (
                        <span className="text-amber-800 font-bold text-[10.5px] block mt-0.5">
                          ⚠️ Note: Unmapped sector; check local landmark.
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-monsoon-200 text-[11px] text-basalt-600">
                    <span>{t.expectedWeight}: <strong className="text-basalt-900 font-bold">~{nextStopBin.estimatedKg} kg</strong></span>
                    <span>{t.capacity}: {nextStopBin.capacityLiters} L</span>
                  </div>
                </div>

                {/* Large Navigation Action */}
                {!nextStopBin.locationUnavailable && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${nextStopBin.location.lat},${nextStopBin.location.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full min-h-[46px] py-3 px-4 rounded-xl text-sm font-bold bg-monsoon-100 hover:bg-monsoon-200 text-basalt-900 border border-monsoon-300 transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                  >
                    <Navigation className="w-4 h-4 text-saffron-600 shrink-0" />
                    <span>{t.navGoogle}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-basalt-400 ml-1 shrink-0" />
                  </a>
                )}

                {/* PRIMARY LARGE TOUCH ACTION: "MARK COLLECTED" */}
                <button
                  type="button"
                  disabled={isSubmittingAction}
                  onClick={() => handleCollected(nextStopBin.id)}
                  className="w-full min-h-[52px] py-4 px-4 rounded-xl text-base sm:text-lg font-extrabold bg-sahyadri-600 hover:bg-sahyadri-700 text-white transition-all shadow-civic flex items-center justify-center gap-2.5 active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
                  <span>{isSubmittingAction ? 'Saving...' : t.markCollected}</span>
                </button>

                {/* SECONDARY ACTION: "REPORT PROBLEM / UNABLE" */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsUnableModalOpen(true)}
                    className="w-full min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 transition-colors flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{t.reportProblem}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Full Stop List Sequence */}
            {activeTab === 'list' && (
              <div className="p-4 rounded-2xl bg-white border border-monsoon-200 shadow-xs space-y-3 text-xs">
                <div className="flex items-center justify-between font-bold text-basalt-800 border-b border-monsoon-100 pb-2">
                  <span>Shift Stop Sequence ({totalStops} {t.stops})</span>
                  <span className="text-sahyadri-800 text-[11px] font-bold">
                    {completedStopsCount} of {totalStops} {t.clearedLabel}
                  </span>
                </div>

                <div className="space-y-2">
                  {assignedBins.map((bin, idx) => {
                    const isDone = completedBinIds.includes(bin.id) || bin.collectionStatus === 'collected';
                    const isCurrent = bin.id === nextStopBin?.id;

                    return (
                      <div
                        key={`${bin.id}-${idx}`}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                          isCurrent
                            ? 'bg-saffron-50 border-saffron-300 text-basalt-900 font-bold shadow-xs'
                            : isDone
                            ? 'bg-sahyadri-50/60 border-sahyadri-200 text-basalt-400'
                            : 'bg-monsoon-50 border-monsoon-200 text-basalt-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full font-mono text-[10px] font-bold flex items-center justify-center shrink-0 ${
                              isDone
                                ? 'bg-sahyadri-600 text-white'
                                : isCurrent
                                ? 'bg-saffron-600 text-white'
                                : 'bg-monsoon-200 text-basalt-700'
                            }`}
                          >
                            {isDone ? '✓' : idx + 1}
                          </span>
                          <div className="truncate min-w-0">
                            <span className={`block text-xs leading-tight truncate ${isDone ? 'line-through text-basalt-400' : ''}`}>
                              {bin.name}
                            </span>
                            <span className="text-[10.5px] text-basalt-500 block truncate">
                              {bin.locationUnavailable ? 'Location Unavailable' : bin.location.address}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-mono font-bold block">
                            {isDone ? 'Done' : `${bin.estimatedKg} kg`}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-basalt-500">
                            {bin.currentFillPercent}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          /* CLEAN EMPTY STATE: "No Active Route Assigned" (Never displays completed routes as active) */
          <div className="p-8 sm:p-10 rounded-2xl bg-white border border-monsoon-300 text-center space-y-4 shadow-xs animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-sahyadri-50 text-sahyadri-600 border border-sahyadri-200 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-sahyadri-600" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-basalt-900 text-base sm:text-lg">
                {t.noRouteTitle}
              </h3>
              <p className="text-xs text-basalt-600 max-w-sm mx-auto leading-relaxed">
                {t.noRouteDesc}
              </p>
            </div>
            {onRefreshRoute && (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isRefreshing}
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-xl bg-basalt-900 text-white hover:bg-black cursor-pointer shadow-xs active:scale-98 disabled:opacity-50 min-h-[44px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? t.checking : t.refresh}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: Report Problem / Unable to Collect */}
      {isUnableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-basalt-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 border border-monsoon-300 shadow-civic-lg">
            <div className="flex items-center justify-between border-b border-monsoon-200 pb-2.5">
              <h3 className="font-bold text-sm text-basalt-900">
                {t.obstacleModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setIsUnableModalOpen(false)}
                className="p-1 rounded-lg text-basalt-400 hover:text-basalt-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-basalt-700 uppercase tracking-wider mb-1">
                  {t.obstacleReason}
                </label>
                <select
                  value={selectedFailureReason}
                  onChange={(e) => setSelectedFailureReason(e.target.value as FailureReason)}
                  className="w-full bg-monsoon-50 border border-monsoon-300 rounded-xl px-3 py-2 font-bold text-basalt-900 focus:outline-none"
                >
                  <option value="road_blocked">Road Blocked / Encroachment (रस्ता बंद)</option>
                  <option value="gate_locked">Gate Locked / No Entry (गेट बंद)</option>
                  <option value="contaminated_waste">Contaminated / Hazardous Waste (धोकादायक कचरा)</option>
                  <option value="truck_capacity_full">Truck Capacity Full (ट्रक पूर्ण भरला)</option>
                  <option value="hazardous_approach">Hazardous / Inaccessible Approach (असुरक्षित मार्ग)</option>
                  <option value="other">Other / इतर कारण</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-basalt-700 uppercase tracking-wider mb-1">
                  {t.obstacleNotes}
                </label>
                <textarea
                  rows={2}
                  value={failureNote}
                  onChange={(e) => setFailureNote(e.target.value)}
                  placeholder="e.g. Parked vehicles blocking alleyway"
                  className="w-full bg-monsoon-50 border border-monsoon-300 rounded-xl px-3 py-2 text-xs text-basalt-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-monsoon-200">
              <button
                type="button"
                onClick={() => setIsUnableModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-monsoon-100 text-basalt-700 hover:bg-monsoon-200 cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleConfirmObstacle}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmittingAction ? 'Submitting...' : t.submitObstacle}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
