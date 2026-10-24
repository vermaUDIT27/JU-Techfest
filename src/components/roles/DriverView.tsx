import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  TruckRecord, 
  BinRecord, 
  FailureReason 
} from '../../types';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ExternalLink, 
  ArrowRight,
  RotateCcw,
  Languages,
  Play,
  Layers,
  Map as MapIcon,
  RefreshCw,
  Building2
} from 'lucide-react';
import { getRiskBadgeClasses } from '../../services/riskEngine';
import { createDustbinMarkerHtml } from '../common/DustbinMarkerIcon';
import { createTruckMarkerHtml } from '../common/TruckMarkerIcon';

interface DriverViewProps {
  trucks: TruckRecord[];
  bins: BinRecord[];
  onMarkCollected: (binId: string, truckId: string) => void;
  onUnableToCollect: (binId: string, truckId: string, reason: FailureReason, note?: string) => void;
  onRefreshRoute?: () => void;
}

export const DriverView: React.FC<DriverViewProps> = ({
  trucks,
  bins,
  onMarkCollected,
  onUnableToCollect,
  onRefreshRoute,
}) => {
  // Bilingual Plain Language State: English or Hindi
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  // Route progression state
  const [isRouteStarted, setIsRouteStarted] = useState<boolean>(true);
  const [showMap, setShowMap] = useState<boolean>(true);

  // Available trucks
  const activeTrucks = trucks.filter((t) => t.status !== 'Offline');
  const [selectedTruckId, setSelectedTruckId] = useState<string>(activeTrucks[0]?.id || trucks[0]?.id);

  // Modal & Notification state
  const [isUnableModalOpen, setIsUnableModalOpen] = useState(false);
  const [selectedFailureReason, setSelectedFailureReason] = useState<FailureReason>('road_blocked');
  const [failureNote, setFailureNote] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const activeTruck = trucks.find((t) => t.id === selectedTruckId) || activeTrucks[0];

  const assignedBinIds = activeTruck?.assignedBinIds || [];
  const completedBinIds = activeTruck?.completedBinIds || [];

  const assignedBins = bins.filter((b) => assignedBinIds.includes(b.id));

  const nextStopBin = activeTruck?.nextStopBinId
    ? bins.find((b) => b.id === activeTruck.nextStopBinId)
    : null;

  const totalStops = assignedBinIds.length;
  const completedCount = completedBinIds.length;
  const progressPercent = totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;

  // Leaflet Map References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Translations dictionary
  const t = {
    terminalTitle: lang === 'en' ? 'Driver Navigation Terminal' : 'वाहन चालक टर्मिनल',
    puneFleet: lang === 'en' ? 'PMC Waste Fleet' : 'पुमपा वाहन ताफा',
    wardBanner: lang === 'en' ? 'Assigned Ward & Area' : 'आवंटित प्रभाग आणि परिसर',
    startRoute: lang === 'en' ? 'START SHIFT ROUTE' : 'मार्ग सुरू करा (रूट प्रारंभ)',
    routeInProgress: lang === 'en' ? 'Route in Progress' : 'मार्ग सुरू आहे',
    shiftProgress: lang === 'en' ? 'Shift Progress' : 'शिफ्ट प्रगती',
    stops: lang === 'en' ? 'Stops' : 'थांबे',
    currentLoad: lang === 'en' ? 'Current Truck Load' : 'ट्रकचे वजन',
    maxCapacity: lang === 'en' ? 'Max Capacity' : 'कमाल क्षमता',
    nextTarget: lang === 'en' ? 'Next Collection Target' : 'पुढील कचरा संकलन थांबा',
    collectedBtn: lang === 'en' ? 'MARK AS COLLECTED' : 'कचरा गोळा केला (उठा लिया)',
    unableBtn: lang === 'en' ? 'Unable to Collect' : 'कचरा उचलणे शक्य नाही',
    reportBtn: lang === 'en' ? 'Report Problem' : 'समस्या नोंदवा',
    navGoogle: lang === 'en' ? 'Navigate with Google Maps' : 'गूगल मॅप्स वर मार्ग पहा',
    expectedWaste: lang === 'en' ? 'Expected Waste' : 'अपेक्षित कचरा',
    capacity: lang === 'en' ? 'Capacity' : 'क्षमता',
    landmark: lang === 'en' ? 'Landmark' : 'महत्त्वाची खूण',
    showMapText: lang === 'en' ? 'Route Map' : 'रूट नकाशा',
    hideMapText: lang === 'en' ? 'Hide Map' : 'नकाशा लपवा',
    noStopsTitle: lang === 'en' ? 'No Stops Assigned to this Vehicle' : 'या वाहनाला कोणतेही थांबे दिलेले नाहीत',
    noStopsDesc: lang === 'en'
      ? 'Your supervisor has not dispatched stops to your vehicle yet, or all stops have been finished.'
      : 'पर्यवेक्षकाने अद्याप आपल्या वाहनासाठी स्टॉप मंजूर केलेले नाहीत किंवा सर्व स्टॉप पूर्ण झाले आहेत.',
    allDoneTitle: lang === 'en' ? 'Shift Completed Successfully!' : 'शिफ्ट यशस्वीरित्या पूर्ण झाली!',
    allDoneDesc: lang === 'en'
      ? 'All assigned stops in Pune have been cleared. Return vehicle to depot.'
      : 'पुण्यातील सर्व नियुक्त कचरा थांबे पूर्ण झाले आहेत. वाहन आगारामध्ये परत घेऊन जा.',
    refreshText: lang === 'en' ? 'Refresh Route' : 'रूट रिफ्रेश करा',
  };

  // Initialize and update embedded Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || !showMap) return;

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = nextStopBin
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
      if (typeof bin.location?.lat === 'number' && typeof bin.location?.lng === 'number') {
        const isCurrent = bin.id === activeTruck?.nextStopBinId;
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
            <span style="color: #D97706; font-weight: bold;">Est: ${bin.estimatedKg} kg</span>
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

    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [30, 30], maxZoom: 15 });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [showMap, activeTruck, assignedBins, nextStopBin]);

  const handleCollectedClick = (binId: string) => {
    if (!activeTruck?.assignedBinIds.includes(binId)) {
      return;
    }
    onMarkCollected(binId, activeTruck.id);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2500);
  };

  const handleConfirmUnable = () => {
    if (nextStopBin && activeTruck?.assignedBinIds.includes(nextStopBin.id)) {
      onUnableToCollect(nextStopBin.id, activeTruck.id, selectedFailureReason, failureNote);
      setIsUnableModalOpen(false);
      setFailureNote('');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12 font-sans select-none">
      {/* Top Header with Prominent English / Hindi Toggle */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-monsoon-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-sahyadri-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-basalt-900 leading-tight">
              {t.terminalTitle}
            </h2>
            <span className="text-[11px] text-basalt-500 font-medium">
              {activeTruck?.driverName || 'Municipal Driver'} • {t.puneFleet}
            </span>
          </div>
        </div>

        {/* Bilingual Toggle Pill */}
        <div className="flex items-center gap-1 bg-monsoon-100 p-1 rounded-xl border border-monsoon-300">
          <Languages className="w-3.5 h-3.5 text-basalt-500 ml-1" />
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              lang === 'en'
                ? 'bg-white text-sahyadri-900 shadow-xs'
                : 'text-basalt-600 hover:text-basalt-900'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang('hi')}
            className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              lang === 'hi'
                ? 'bg-white text-sahyadri-900 shadow-xs'
                : 'text-basalt-600 hover:text-basalt-900'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* Prominent Assigned Ward & Colony Banner */}
      <div className="p-4 rounded-2xl bg-basalt-800 text-white border border-basalt-700 shadow-civic space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-saffron-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            {t.wardBanner}
          </span>
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-basalt-700 text-white border border-basalt-600">
            {activeTruck?.id}
          </span>
        </div>

        <div className="pt-1">
          <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-snug">
            {nextStopBin ? nextStopBin.location.ward : 'Ward 84 — Central Swargate Corridor'}
          </h3>
          <p className="text-xs text-monsoon-200 mt-0.5 truncate">
            {nextStopBin ? `${nextStopBin.location.address} (Landmark: ${nextStopBin.location.landmark || 'Main Road'})` : 'Swargate Operations Corridor'}
          </p>
        </div>

        {/* Demo Vehicle Switcher (when multiple trucks exist) */}
        {activeTrucks.length > 1 && (
          <div className="pt-2 border-t border-basalt-700/80 flex items-center justify-between text-[11px]">
            <span className="text-monsoon-300">Vehicle Switcher:</span>
            <select
              value={selectedTruckId}
              onChange={(e) => setSelectedTruckId(e.target.value)}
              className="bg-basalt-900 text-white border border-basalt-600 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none"
            >
              {activeTrucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id} — {t.driverName} ({t.name.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Route Shift Progress Bar */}
      <div className="p-4 rounded-2xl bg-white border border-monsoon-200 shadow-xs space-y-2 text-xs">
        <div className="flex justify-between items-center font-bold">
          <span className="text-basalt-700">
            {t.shiftProgress}: <strong className="text-saffron-700">{completedCount} of {totalStops} {t.stops}</strong>
          </span>
          <span className="font-mono text-basalt-900 font-extrabold text-sm">
            {progressPercent}%
          </span>
        </div>

        <div className="w-full bg-monsoon-200 h-3 rounded-full overflow-hidden">
          <div
            className="bg-sahyadri-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-basalt-500 pt-0.5">
          <span>{t.currentLoad}: <strong className="text-basalt-800">{activeTruck?.currentLoadKg} kg</strong></span>
          <span>{t.maxCapacity}: <strong className="text-basalt-800">{activeTruck?.capacityKg} kg</strong></span>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="p-3.5 rounded-xl bg-sahyadri-600 text-white font-bold text-xs flex items-center justify-between shadow-civic animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span>{lang === 'en' ? 'Stop Collected! Waste payload logged & next target updated.' : 'कचरा गोळा केला! वजन नोंदवले गेले व पुढील थांबा आला.'}</span>
          </div>
          <span className="text-[10px] uppercase bg-sahyadri-700 px-2 py-0.5 rounded">OK</span>
        </div>
      )}

      {/* Map Display & Toggle */}
      <div className="rounded-2xl bg-white border border-monsoon-200 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-monsoon-200 bg-monsoon-50">
          <div className="flex items-center gap-2 text-xs font-bold text-basalt-800">
            <MapIcon className="w-4 h-4 text-saffron-600" />
            <span>{t.showMapText}</span>
          </div>
          <div className="flex items-center gap-2">
            {onRefreshRoute && (
              <button
                type="button"
                onClick={onRefreshRoute}
                className="text-[11px] text-basalt-600 hover:text-basalt-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{t.refreshText}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className="text-xs font-bold text-saffron-700 hover:underline cursor-pointer"
            >
              {showMap ? t.hideMapText : t.showMapText}
            </button>
          </div>
        </div>

        {showMap && (
          <div
            ref={mapContainerRef}
            className="w-full h-56 bg-monsoon-100 relative z-10"
            style={{ minHeight: '220px' }}
          />
        )}
      </div>

      {/* Next Stop Hero Card (Mobile-First Large Touch Area) */}
      {nextStopBin ? (
        <div className="p-5 rounded-2xl bg-white border-2 border-saffron-400 shadow-civic space-y-4">
          {/* Header of Next Stop Card */}
          <div className="flex items-center justify-between border-b border-monsoon-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-saffron-600 text-white font-extrabold text-xs flex items-center justify-center font-mono">
                {completedCount + 1}
              </span>
              <span className="text-xs font-bold text-saffron-800 uppercase tracking-wider">
                {t.nextTarget}
              </span>
            </div>

            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${getRiskBadgeClasses(nextStopBin.riskCategory)}`}>
              {nextStopBin.riskCategory} • {nextStopBin.currentFillPercent}%
            </span>
          </div>

          {/* Title & Hindi / Marathi Localization */}
          <div className="space-y-0.5">
            <div className="text-xs font-mono font-bold text-basalt-400">
              {nextStopBin.code}
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-basalt-900 leading-snug">
              {nextStopBin.name}
            </h3>
            {nextStopBin.hindiName && (
              <p className="text-xs sm:text-sm text-saffron-800 font-semibold">
                {nextStopBin.hindiName}
              </p>
            )}
          </div>

          {/* Location & Capacity Details */}
          <div className="p-3 rounded-xl bg-monsoon-50 border border-monsoon-200 text-xs space-y-1.5">
            <div className="flex items-start gap-2 text-basalt-700">
              <MapPin className="w-4 h-4 text-saffron-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-basalt-900 block">{nextStopBin.location.address}</strong>
                {nextStopBin.location.landmark && (
                  <span className="text-basalt-500 text-[11px] block">{t.landmark}: {nextStopBin.location.landmark}</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-monsoon-200 text-[11px] text-basalt-600">
              <span>{t.expectedWaste}: <strong className="text-basalt-900 font-bold">~{nextStopBin.estimatedKg} kg</strong></span>
              <span>{t.capacity}: {nextStopBin.capacityLiters} L</span>
            </div>
          </div>

          {/* Large Action: Open Google Maps Navigation */}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${nextStopBin.location.lat},${nextStopBin.location.lng}`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-monsoon-100 hover:bg-monsoon-200 text-basalt-900 border border-monsoon-300 transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Navigation className="w-4 h-4 text-saffron-600" />
            <span>{t.navGoogle}</span>
            <ExternalLink className="w-3.5 h-3.5 text-basalt-400 ml-1" />
          </a>

          {/* Large Touch Button: "MARK AS COLLECTED" */}
          <button
            type="button"
            onClick={() => handleCollectedClick(nextStopBin.id)}
            className="w-full py-4 px-4 rounded-xl text-base sm:text-lg font-extrabold bg-sahyadri-600 hover:bg-sahyadri-700 text-white transition-all shadow-civic flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer"
          >
            <CheckCircle2 className="w-6 h-6 text-white" />
            <span>{t.collectedBtn}</span>
          </button>

          {/* Secondary Action: Unable to Collect / Report Problem */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsUnableModalOpen(true)}
              className="py-3 px-3 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 transition-colors flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>{t.unableBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => alert(`Problem reported for ${nextStopBin.code}. Ward supervisor notified.`)}
              className="py-3 px-3 rounded-xl text-xs font-bold bg-monsoon-100 hover:bg-monsoon-200 text-basalt-700 border border-monsoon-300 transition-colors flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-basalt-500" />
              <span>{t.reportBtn}</span>
            </button>
          </div>
        </div>
      ) : totalStops > 0 ? (
        /* Completed State */
        <div className="p-8 rounded-2xl bg-sahyadri-50 border-2 border-sahyadri-300 text-center space-y-3 shadow-civic">
          <div className="w-14 h-14 rounded-full bg-sahyadri-100 text-sahyadri-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-sahyadri-950 font-sans">
            {t.allDoneTitle}
          </h3>
          <p className="text-xs text-sahyadri-800 leading-relaxed max-w-sm mx-auto">
            {t.allDoneDesc}
          </p>
          <div className="pt-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sahyadri-200 text-sahyadri-900">
              Return to {activeTruck?.depotName || 'Depot'}
            </span>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-8 rounded-2xl bg-white border border-monsoon-300 text-center space-y-3 text-xs shadow-xs">
          <Truck className="w-10 h-10 text-basalt-400 mx-auto" />
          <h3 className="font-bold text-basalt-800 text-sm">
            {t.noStopsTitle}
          </h3>
          <p className="text-basalt-500 max-w-xs mx-auto">
            {t.noStopsDesc}
          </p>
          {onRefreshRoute && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRefreshRoute}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-basalt-800 text-white hover:bg-basalt-900 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.refreshText}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Shift Stops List Preview */}
      {assignedBinIds.length > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-monsoon-200 shadow-xs space-y-3 text-xs">
          <div className="flex items-center justify-between font-bold text-basalt-800 text-xs border-b border-monsoon-100 pb-2">
            <span>Shift Stop Sequence ({totalStops} {t.stops})</span>
            <span className="text-basalt-500 text-[11px] font-normal">
              Est: {activeTruck?.assignedRoute?.totalDistanceKm || 0} km
            </span>
          </div>

          <div className="space-y-2">
            {assignedBinIds.map((binId, idx) => {
              const bin = bins.find((b) => b.id === binId);
              if (!bin) return null;

              const isDone = completedBinIds.includes(binId);
              const isCurrent = binId === activeTruck?.nextStopBinId;

              return (
                <div
                  key={bin.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-saffron-50 border-saffron-300 text-basalt-900 font-bold shadow-xs'
                      : isDone
                      ? 'bg-sahyadri-50/60 border-sahyadri-200 text-basalt-400'
                      : 'bg-monsoon-50 border-monsoon-200 text-basalt-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
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
                    <div className="truncate">
                      <span className={`block text-xs leading-tight ${isDone ? 'line-through text-basalt-400' : ''}`}>
                        {bin.name}
                      </span>
                      <span className="text-[10.5px] text-basalt-500 block truncate">
                        {bin.location.address}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold shrink-0">
                    {isDone ? 'Done' : `${bin.estimatedKg} kg`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Unable to Collect */}
      {isUnableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-basalt-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 border border-monsoon-300 shadow-civic-lg">
            <div className="flex items-center justify-between border-b border-monsoon-200 pb-2.5">
              <h3 className="font-bold text-sm text-basalt-900">
                {lang === 'en' ? 'Report Collection Obstacle' : 'कचरा उचलण्यात अडथळा नोंदवा'}
              </h3>
              <button
                type="button"
                onClick={() => setIsUnableModalOpen(false)}
                className="p-1 rounded-lg text-basalt-400 hover:text-basalt-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-basalt-700 uppercase tracking-wider mb-1">
                  {lang === 'en' ? 'Obstacle Reason' : 'अडथळ्याचे कारण'}
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
                  {lang === 'en' ? 'Driver Notes (Optional)' : 'टिप्पणी (पर्यायी)'}
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
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-monsoon-100 text-basalt-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnable}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
              >
                {lang === 'en' ? 'Submit Obstacle Log' : 'नोंदवा'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};