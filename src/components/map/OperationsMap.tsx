import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { BinRecord, TruckRecord, RiskLevel, TruckStatus } from '../../types';
import { JAGATPURA_CENTER, JAGATPURA_DEFAULT_ZOOM } from '../../data/jaipurBins';
import { createDustbinMarkerHtml } from '../common/DustbinMarkerIcon';
import { createTruckMarkerHtml } from '../common/TruckMarkerIcon';
import { escapeHtml } from '../../utils/sanitize';
import { 
  Filter, 
  Layers, 
  Compass, 
  RotateCcw, 
  MapPin, 
  Truck, 
  AlertTriangle, 
  CheckCircle2,
  Navigation
} from 'lucide-react';

interface OperationsMapProps {
  bins: BinRecord[];
  trucks: TruckRecord[];
  selectedBin: BinRecord | null;
  selectedTruck: TruckRecord | null;
  onSelectBin: (bin: BinRecord) => void;
  onSelectTruck: (truck: TruckRecord) => void;
  className?: string;
}

// Secure DOM Popup Builders using textContent to eliminate XSS sinks
function createBinPopupNode(bin: BinRecord, onSelect: (b: BinRecord) => void): HTMLElement {
  const container = document.createElement('div');
  container.style.fontFamily = 'inherit';
  container.style.width = '260px';
  container.className = 'p-3 text-xs';

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between border-b border-[#EFE7DA] pb-1.5 mb-2';

  const codeSpan = document.createElement('span');
  codeSpan.className = 'font-mono text-[10px] font-bold text-[#8E3C25] bg-[#FDF7F5] px-1.5 py-0.5 rounded border border-[#F6D6CC]';
  codeSpan.textContent = bin.code;

  const riskSpan = document.createElement('span');
  riskSpan.className = `text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
    bin.riskCategory === 'critical'
      ? 'bg-red-100 text-red-800'
      : bin.riskCategory === 'high'
      ? 'bg-orange-100 text-orange-800'
      : 'bg-yellow-100 text-yellow-800'
  }`;
  riskSpan.textContent = bin.riskCategory;

  header.appendChild(codeSpan);
  header.appendChild(riskSpan);
  container.appendChild(header);

  const title = document.createElement('h4');
  title.className = 'font-bold text-[#1D1D21] text-xs leading-snug mb-0.5';
  title.textContent = bin.name;
  container.appendChild(title);

  if (bin.hindiName) {
    const subtitle = document.createElement('p');
    subtitle.className = 'text-[10.5px] text-[#54545A] mb-2';
    subtitle.textContent = bin.hindiName;
    container.appendChild(subtitle);
  }

  const isCollected = bin.collectionStatus === 'collected';
  const details = document.createElement('div');
  details.className = 'space-y-1 mb-2 bg-[#F7F3EC] p-2 rounded-lg text-[11px]';

  const fillRow = document.createElement('div');
  fillRow.className = 'flex justify-between';
  const fillLabel = document.createElement('span');
  fillLabel.className = 'text-[#7A7A80]';
  fillLabel.textContent = 'Current Fill:';
  const fillVal = document.createElement('strong');
  fillVal.className = 'text-[#1D1D21]';
  fillVal.textContent = isCollected ? '5%' : `${bin.currentFillPercent}% (~${bin.estimatedKg} kg)`;
  fillRow.appendChild(fillLabel);
  fillRow.appendChild(fillVal);
  details.appendChild(fillRow);

  const statusRow = document.createElement('div');
  statusRow.className = 'flex justify-between';
  const statusLabel = document.createElement('span');
  statusLabel.className = 'text-[#7A7A80]';
  statusLabel.textContent = 'Status:';
  const statusVal = document.createElement('span');
  statusVal.className = `font-bold ${isCollected ? 'text-emerald-700' : 'text-amber-800'}`;
  statusVal.textContent = bin.collectionStatus.toUpperCase();
  statusRow.appendChild(statusLabel);
  statusRow.appendChild(statusVal);
  details.appendChild(statusRow);

  const telRow = document.createElement('div');
  telRow.className = 'flex justify-between text-[10px] text-[#7A7A80]';
  const telLabel = document.createElement('span');
  telLabel.textContent = 'Telemetry:';
  const telVal = document.createElement('span');
  telVal.textContent = bin.dataFreshness;
  telRow.appendChild(telLabel);
  telRow.appendChild(telVal);
  details.appendChild(telRow);

  container.appendChild(details);

  const btn = document.createElement('button');
  btn.className = 'w-full py-1.5 rounded-lg bg-[#B04F34] text-white font-bold text-center text-[11px] hover:bg-[#8E3C25] cursor-pointer';
  btn.textContent = 'Inspect & Plan Action →';
  btn.onclick = () => onSelect(bin);
  container.appendChild(btn);

  return container;
}

function createTruckPopupNode(truck: TruckRecord, onSelect: (t: TruckRecord) => void): HTMLElement {
  const container = document.createElement('div');
  container.style.fontFamily = 'inherit';
  container.style.width = '250px';
  container.className = 'p-3 text-xs';

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between border-b border-[#EFE7DA] pb-1.5 mb-2';

  const idSpan = document.createElement('span');
  idSpan.className = 'font-mono text-[10px] font-bold text-white px-2 py-0.5 rounded';
  idSpan.style.backgroundColor = truck.color;
  idSpan.textContent = truck.id;

  const statusSpan = document.createElement('span');
  statusSpan.className = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F7F3EC] uppercase';
  statusSpan.textContent = truck.status;

  header.appendChild(idSpan);
  header.appendChild(statusSpan);
  container.appendChild(header);

  const title = document.createElement('h4');
  title.className = 'font-bold text-[#1D1D21] text-xs leading-snug mb-0.5';
  title.textContent = truck.name;
  container.appendChild(title);

  const driverP = document.createElement('p');
  driverP.className = 'text-[11px] text-[#54545A] mb-2';
  driverP.textContent = `Driver: ${truck.driverName}`;
  container.appendChild(driverP);

  const remaining = Math.max(0, truck.capacityKg - truck.currentLoadKg);
  const details = document.createElement('div');
  details.className = 'space-y-1 mb-2 bg-[#F7F3EC] p-2 rounded-lg text-[11px]';

  const payloadRow = document.createElement('div');
  payloadRow.className = 'flex justify-between';
  const payloadLabel = document.createElement('span');
  payloadLabel.textContent = 'Payload:';
  const payloadVal = document.createElement('strong');
  payloadVal.textContent = `${truck.currentLoadKg} / ${truck.capacityKg} kg`;
  payloadRow.appendChild(payloadLabel);
  payloadRow.appendChild(payloadVal);
  details.appendChild(payloadRow);

  const remRow = document.createElement('div');
  remRow.className = 'flex justify-between';
  const remLabel = document.createElement('span');
  remLabel.textContent = 'Remaining:';
  const remVal = document.createElement('strong');
  remVal.className = 'text-emerald-700';
  remVal.textContent = `${remaining} kg`;
  remRow.appendChild(remLabel);
  remRow.appendChild(remVal);
  details.appendChild(remRow);

  const stopsRow = document.createElement('div');
  stopsRow.className = 'flex justify-between text-[10px]';
  const stopsLabel = document.createElement('span');
  stopsLabel.textContent = 'Assigned Stops:';
  const stopsVal = document.createElement('span');
  stopsVal.textContent = `${truck.completedBinIds.length} of ${truck.assignedBinIds.length} done`;
  stopsRow.appendChild(stopsLabel);
  stopsRow.appendChild(stopsVal);
  details.appendChild(stopsRow);

  container.appendChild(details);

  const btn = document.createElement('button');
  btn.className = 'w-full py-1.5 rounded-lg bg-[#1D1D21] text-white font-bold text-center text-[11px] hover:bg-[#3E3E43] cursor-pointer';
  btn.textContent = 'View Truck Details →';
  btn.onclick = () => onSelect(truck);
  container.appendChild(btn);

  return container;
}

export const OperationsMap: React.FC<OperationsMapProps> = ({
  bins,
  trucks,
  selectedBin,
  selectedTruck,
  onSelectBin,
  onSelectTruck,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups
  const binMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const truckMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  // Filters
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all');
  const [truckFilter, setTruckFilter] = useState<'all' | 'active' | 'offline'>('all');
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'pending' | 'collected'>('all');

  // Filtered lists
  const displayedBins = bins.filter((bin) => {
    if (riskFilter !== 'all' && bin.riskCategory !== riskFilter) return false;
    if (collectionFilter === 'pending' && bin.collectionStatus === 'collected') return false;
    if (collectionFilter === 'collected' && bin.collectionStatus !== 'collected') return false;
    return true;
  });

  const displayedTrucks = trucks.filter((truck) => {
    if (truckFilter === 'active' && truck.status === 'Offline') return false;
    if (truckFilter === 'offline' && truck.status !== 'Offline') return false;
    return true;
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: JAGATPURA_CENTER,
        zoom: JAGATPURA_DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: true,
      });

      // Real OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors | OSRM Routing Engine',
      }).addTo(map);

      // Top right zoom control
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Create separate layer groups for clean updates
      routesLayerRef.current = L.layerGroup().addTo(map);
      binMarkersLayerRef.current = L.layerGroup().addTo(map);
      truckMarkersLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Route Polylines
  useEffect(() => {
    const routesLayer = routesLayerRef.current;
    if (!routesLayer) return;

    routesLayer.clearLayers();

    trucks.forEach((truck) => {
      if (truck.status === 'Offline' || !truck.assignedRoute || truck.assignedRoute.roadGeometry.length < 2) {
        return;
      }

      const isSelected = selectedTruck?.id === truck.id;
      const polyline = L.polyline(truck.assignedRoute.roadGeometry, {
        color: truck.color,
        weight: isSelected ? 5 : 3.5,
        opacity: isSelected ? 0.95 : 0.75,
        dashArray: isSelected ? undefined : '5, 5',
        lineCap: 'round',
        lineJoin: 'round',
      });

      polyline.bindTooltip(`Route for ${escapeHtml(truck.id)} (${escapeHtml(truck.driverName)})`, {
        sticky: true,
        className: 'text-xs font-bold font-mono',
      });

      polyline.on('click', () => {
        onSelectTruck(truck);
      });

      routesLayer.addLayer(polyline);
    });
  }, [trucks, selectedTruck, onSelectTruck]);

  // Update Dustbin Markers
  useEffect(() => {
    const binLayer = binMarkersLayerRef.current;
    if (!binLayer) return;

    binLayer.clearLayers();

    displayedBins.forEach((bin) => {
      const isSelected = selectedBin?.id === bin.id;
      const html = createDustbinMarkerHtml(bin, isSelected);

      const icon = L.divIcon({
        html,
        className: 'custom-dustbin-icon',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([bin.location.lat, bin.location.lng], { icon });

      // Bind secure DOM popup (XSS injection sink eliminated)
      marker.bindPopup(() => createBinPopupNode(bin, onSelectBin));

      marker.on('click', () => {
        onSelectBin(bin);
      });

      binLayer.addLayer(marker);
    });
  }, [displayedBins, selectedBin, onSelectBin]);

  // Update Truck Markers with Road Heading Rotation
  useEffect(() => {
    const truckLayer = truckMarkersLayerRef.current;
    if (!truckLayer) return;

    truckLayer.clearLayers();

    displayedTrucks.forEach((truck) => {
      const isSelected = selectedTruck?.id === truck.id;
      const html = createTruckMarkerHtml(truck, isSelected);

      const icon = L.divIcon({
        html,
        className: 'custom-truck-icon',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22],
      });

      const marker = L.marker([truck.currentCoords.lat, truck.currentCoords.lng], { icon });

      // Bind secure DOM popup (XSS injection sink eliminated)
      marker.bindPopup(() => createTruckPopupNode(truck, onSelectTruck));

      marker.on('click', () => {
        onSelectTruck(truck);
      });

      truckLayer.addLayer(marker);
    });
  }, [displayedTrucks, selectedTruck, onSelectTruck]);

  // Recenter helper
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(JAGATPURA_CENTER, JAGATPURA_DEFAULT_ZOOM, {
        animate: true,
        duration: 0.8,
      });
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Map Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-sand-100 border border-sand-300 shadow-civic text-xs">
        {/* Risk & Bin Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-charcoal-700 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-terracotta-600" />
            Risk Filter:
          </span>

          <button
            type="button"
            onClick={() => setRiskFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              riskFilter === 'all'
                ? 'bg-terracotta-600 text-white'
                : 'bg-sand-50 text-charcoal-700 border border-sand-300 hover:bg-sand-200'
            }`}
          >
            All Bins ({bins.length})
          </button>

          <button
            type="button"
            onClick={() => setRiskFilter('critical')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1 ${
              riskFilter === 'critical'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-800 border border-red-300 hover:bg-red-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
            Critical 90-100% ({bins.filter((b) => b.riskCategory === 'critical').length})
          </button>

          <button
            type="button"
            onClick={() => setRiskFilter('high')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1 ${
              riskFilter === 'high'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-50 text-orange-800 border border-orange-300 hover:bg-orange-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
            High 75-89% ({bins.filter((b) => b.riskCategory === 'high').length})
          </button>

          <button
            type="button"
            onClick={() => setRiskFilter('medium')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1 ${
              riskFilter === 'medium'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-50 text-yellow-800 border border-yellow-300 hover:bg-yellow-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
            Medium 50-74% ({bins.filter((b) => b.riskCategory === 'medium').length})
          </button>
        </div>

        {/* Fleet View & Recenter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={truckFilter}
            onChange={(e) => setTruckFilter(e.target.value as any)}
            className="text-xs bg-sand-50 border border-sand-300 rounded-lg px-2.5 py-1 text-charcoal-700 font-medium focus:outline-none"
            aria-label="Filter Trucks"
          >
            <option value="all">All Trucks ({trucks.length})</option>
            <option value="active">Active Fleet Only ({trucks.filter((t) => t.status !== 'Offline').length})</option>
            <option value="offline">Offline Trucks (1)</option>
          </select>

          <button
            type="button"
            onClick={handleRecenter}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sand-200 hover:bg-sand-300 text-charcoal-700 border border-sand-300 font-medium transition-colors"
            title="Recenter Map on Jagatpura"
          >
            <Navigation className="w-3 h-3 text-terracotta-600" />
            <span>Recenter</span>
          </button>
        </div>
      </div>

      {/* Real Leaflet Map Container */}
      <div className="relative rounded-2xl border border-sand-300 bg-sand-100 overflow-hidden shadow-civic h-[500px] sm:h-[580px] lg:h-[620px]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map Legend Overlay */}
        <div className="absolute bottom-3 left-3 z-10 bg-sand-50/95 backdrop-blur-xs border border-sand-300 rounded-xl p-3 shadow-civic text-xs max-w-xs hidden sm:block">
          <div className="font-bold text-charcoal-800 text-[11px] uppercase tracking-wider mb-2 border-b border-sand-200 pb-1">
            Jagatpura Map Legend
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-charcoal-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-red-600 text-white text-[8px] flex items-center justify-center font-bold">95</span>
              <span>Critical (90-100%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-orange-500 text-white text-[8px] flex items-center justify-center font-bold">80</span>
              <span>High (75-89%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-yellow-500 text-white text-[8px] flex items-center justify-center font-bold">60</span>
              <span>Medium (50-74%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-green-600 text-white text-[8px] flex items-center justify-center font-bold">30</span>
              <span>Low (0-49%)</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2 pt-1 border-t border-sand-200">
              <Truck className="w-3.5 h-3.5 text-terracotta-600" />
              <span>Simulated Truck (Rotates along road)</span>
            </div>
          </div>
        </div>

        {/* Active Fleet Indicator Pill */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <div className="bg-sand-50/95 backdrop-blur-xs border border-sand-300 rounded-lg px-3 py-1.5 shadow-civic flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-charcoal-800">
              Jagatpura Ward 84 • Road Network GIS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
