import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Building2, 
  MapPin, 
  Truck, 
  ShieldAlert, 
  Layers, 
  Info, 
  Compass, 
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  MapPinOff,
  Radio
} from 'lucide-react';
import { PUNE_CENTER, PUNE_DEFAULT_ZOOM, PUNE_DEPOTS, getAllZones, getAllWards } from '../../data/puneData';
import { INITIAL_PUNE_BINS, getBinThresholdStatus, DEFAULT_DEMO_THRESHOLDS } from '../../data/puneBins';
import { INITIAL_PUNE_TRUCKS } from '../../data/puneFleet';
import { BinRecord, TruckRecord, PuneWardRecord } from '../../types';
import { createDustbinMarkerHtml } from '../common/DustbinMarkerIcon';
import { createTruckMarkerHtml } from '../common/TruckMarkerIcon';

interface PuneOperationsMapProps {
  bins?: BinRecord[];
  trucks?: TruckRecord[];
  selectedBin?: BinRecord | null;
  selectedTruck?: TruckRecord | null;
  onSelectBin?: (bin: BinRecord) => void;
  onSelectTruck?: (truck: TruckRecord) => void;
  selectedWard?: PuneWardRecord | null;
  onSelectWard?: (ward: PuneWardRecord) => void;
}

export const PuneOperationsMap: React.FC<PuneOperationsMapProps> = ({
  bins = INITIAL_PUNE_BINS,
  trucks = INITIAL_PUNE_TRUCKS,
  selectedBin,
  selectedTruck,
  onSelectBin,
  onSelectTruck,
  selectedWard,
  onSelectWard,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const binMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const truckMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  // Operator Filters State
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('all');
  const [selectedColony, setSelectedColony] = useState<string>('all');
  const [selectedFillStatus, setSelectedFillStatus] = useState<string>('all');
  const [selectedReadingSource, setSelectedReadingSource] = useState<string>('all');
  const [selectedLocationStatus, setSelectedLocationStatus] = useState<'all' | 'mapped' | 'unavailable'>('all');

  const zones = useMemo(() => getAllZones(), []);
  const allWards = useMemo(() => getAllWards(), []);

  // Distinct colonies from active bin list
  const colonies = useMemo(() => {
    const set = new Set<string>();
    bins.forEach((b) => {
      if (b.colonyName) set.add(b.colonyName);
      else if (b.location?.sector) set.add(b.location.sector);
    });
    return Array.from(set).sort();
  }, [bins]);

  // Distinct wards represented in active bin list
  const binWardIds = useMemo(() => {
    const set = new Set<string>();
    bins.forEach((b) => {
      if (b.wardId) set.add(b.wardId);
      else if (b.location?.ward) set.add(b.location.ward);
    });
    return Array.from(set).sort();
  }, [bins]);

  // Filtered Bins calculation
  const filteredBins = useMemo(() => {
    return bins.filter((bin) => {
      // 1. Zone filter
      if (selectedZone !== 'all') {
        const binWard = bin.location?.ward || bin.wardId;
        const matchingWard = allWards.find(
          (w) => w.source_ward_id === bin.wardId || w.ward_name.toLowerCase().includes((binWard || '').toLowerCase())
        );
        if (matchingWard?.zone_name?.toLowerCase() !== selectedZone.toLowerCase()) {
          return false;
        }
      }

      // 2. Ward filter
      if (selectedWardFilter !== 'all') {
        const binWardStr = `${bin.wardId || ''} ${bin.location?.ward || ''}`.toLowerCase();
        if (!binWardStr.includes(selectedWardFilter.toLowerCase())) {
          return false;
        }
      }

      // 3. Colony / Area filter
      if (selectedColony !== 'all') {
        const colonyMatch = bin.colonyName === selectedColony || bin.location?.sector === selectedColony;
        if (!colonyMatch) return false;
      }

      // 4. Fill Status filter (Normal <70%, High 70-84%, Critical 85-99%, Full 100%)
      if (selectedFillStatus !== 'all') {
        const status = bin.fillThresholdStatus || getBinThresholdStatus(bin.currentFillPercent);
        if (status !== selectedFillStatus) return false;
      }

      // 5. Reading Source filter
      if (selectedReadingSource !== 'all') {
        const source = bin.readingSource || (bin.isSimulated ? 'simulated' : 'manual');
        if (source !== selectedReadingSource) return false;
      }

      // 6. Location Status filter
      if (selectedLocationStatus === 'mapped' && bin.locationUnavailable) return false;
      if (selectedLocationStatus === 'unavailable' && !bin.locationUnavailable) return false;

      return true;
    });
  }, [
    bins,
    selectedZone,
    selectedWardFilter,
    selectedColony,
    selectedFillStatus,
    selectedReadingSource,
    selectedLocationStatus,
    allWards,
  ]);

  // Separate mappable bins from unmapped/location-unavailable bins
  const mappableBins = useMemo(() => {
    return filteredBins.filter(
      (b) =>
        !b.locationUnavailable &&
        typeof b.location?.lat === 'number' &&
        typeof b.location?.lng === 'number' &&
        (b.location.lat !== 0 || b.location.lng !== 0)
    );
  }, [filteredBins]);

  const unmappedBins = useMemo(() => {
    return filteredBins.filter(
      (b) =>
        b.locationUnavailable ||
        !b.location?.lat ||
        !b.location?.lng ||
        (b.location.lat === 0 && b.location.lng === 0)
    );
  }, [filteredBins]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedZone('all');
    setSelectedWardFilter('all');
    setSelectedColony('all');
    setSelectedFillStatus('all');
    setSelectedReadingSource('all');
    setSelectedLocationStatus('all');
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: PUNE_CENTER,
      zoom: PUNE_DEFAULT_ZOOM,
      zoomControl: true,
      minZoom: 10,
      maxZoom: 18,
    });

    // Clean OpenStreetMap standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PMC Pune Operations',
      maxZoom: 18,
    }).addTo(map);

    // Layer groups for dynamic markers
    const binLayer = L.layerGroup().addTo(map);
    const truckLayer = L.layerGroup().addTo(map);
    binMarkersLayerRef.current = binLayer;
    truckMarkersLayerRef.current = truckLayer;

    // Plot Municipal Depots and Processing Sites
    PUNE_DEPOTS.forEach((depot) => {
      const isUrali = depot.id.includes('urali');
      const depotIcon = L.divIcon({
        className: 'custom-depot-marker',
        html: `
          <div style="
            background-color: ${isUrali ? '#D3832B' : '#1F242E'};
            color: #FFFFFF;
            padding: 3px 6px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: bold;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            border: 1.5px solid #FFFFFF;
            display: flex;
            align-items: center;
            gap: 3px;
            white-space: nowrap;
          ">
            <span>${isUrali ? '🏭' : '🚛'}</span>
            <span>${depot.name.split(' ')[0]} ${isUrali ? 'SLF' : 'Depot'}</span>
          </div>
        `,
        iconSize: [110, 24],
        iconAnchor: [55, 12],
      });

      const marker = L.marker([depot.coords.lat, depot.coords.lng], { icon: depotIcon }).addTo(map);
      marker.bindPopup(`
        <div style="padding: 6px; font-family: inherit; font-size: 11px;">
          <h4 style="font-weight: bold; margin: 0 0 2px 0; color: #1F242E; font-size: 12px;">${depot.name}</h4>
          <p style="margin: 0 0 4px 0; color: #535D72; font-size: 10px;">${depot.marathiName}</p>
          <div style="padding: 3px 5px; background: #F1F3F5; border-radius: 4px; font-size: 9.5px; color: #7E8794;">
            GPS: ${depot.coords.lat.toFixed(4)}° N, ${depot.coords.lng.toFixed(4)}° E
          </div>
        </div>
      `);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Dustbin & Truck Markers when filters or data change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const binLayer = binMarkersLayerRef.current;
    const truckLayer = truckMarkersLayerRef.current;
    if (!map || !binLayer || !truckLayer) return;

    // Clear previous markers
    binLayer.clearLayers();
    truckLayer.clearLayers();

    // 1. Plot Mappable Bins
    mappableBins.forEach((bin) => {
      const isSelected = selectedBin?.id === bin.id;
      const iconHtml = createDustbinMarkerHtml(bin, isSelected);

      const icon = L.divIcon({
        className: 'custom-pune-bin-marker',
        html: iconHtml,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const marker = L.marker([bin.location.lat, bin.location.lng], { icon });

      // Click handler
      marker.on('click', () => {
        if (onSelectBin) onSelectBin(bin);
      });

      // Tooltip
      marker.bindTooltip(`
        <div style="font-size: 11px; font-weight: bold; line-height: 1.2;">
          ${bin.name}<br/>
          <span style="font-weight: normal; font-size: 10px; color: #555;">${bin.location.address}</span><br/>
          <span style="color: #D97706;">${bin.currentFillPercent}% fill (${bin.estimatedKg} kg)</span>
        </div>
      `, { direction: 'top', offset: [0, -18] });

      marker.addTo(binLayer);
    });

    // 2. Plot Operational Trucks
    trucks.forEach((truck) => {
      if (typeof truck.currentCoords?.lat === 'number' && typeof truck.currentCoords?.lng === 'number') {
        const isSelected = selectedTruck?.id === truck.id;
        const iconHtml = createTruckMarkerHtml(truck, isSelected);

        const icon = L.divIcon({
          className: 'custom-pune-truck-marker',
          html: iconHtml,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        const marker = L.marker([truck.currentCoords.lat, truck.currentCoords.lng], {
          icon,
          zIndexOffset: 500,
        });

        marker.on('click', () => {
          if (onSelectTruck) onSelectTruck(truck);
        });

        marker.bindTooltip(`
          <div style="font-size: 11px; font-weight: bold;">
            ${truck.id}: ${truck.driverName}<br/>
            <span style="font-weight: normal; color: #555;">Status: ${truck.status}</span>
          </div>
        `, { direction: 'top', offset: [0, -20] });

        marker.addTo(truckLayer);
      }
    });
  }, [mappableBins, trucks, selectedBin, selectedTruck, onSelectBin, onSelectTruck]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(PUNE_CENTER, PUNE_DEFAULT_ZOOM, { duration: 1.0 });
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Multi-Dimensional Operator Filters Bar (Priority 3 Requirement) */}
      <div className="p-4 rounded-2xl bg-white border border-monsoon-200 shadow-civic space-y-3">
        <div className="flex items-center justify-between border-b border-monsoon-200 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-basalt-900">
            <Filter className="w-4 h-4 text-saffron-600" />
            <span>OPERATOR FILTERS: PUNE CIVIC BIN INVENTORY</span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-[11px] font-bold text-saffron-700 hover:text-saffron-800 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Filter 1: Zone */}
          <div>
            <label className="block text-[10px] font-bold text-basalt-600 uppercase mb-1">
              Zone Filter
            </label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full bg-monsoon-50 border border-monsoon-300 rounded-xl px-2.5 py-1.5 text-xs text-basalt-800 font-medium focus:outline-none focus:ring-1 focus:ring-saffron-500 cursor-pointer"
            >
              <option value="all">All 15 Zones</option>
              {zones.map((z) => (
                <option key={z.zone_id} value={z.name}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Ward */}
          <div>
            <label className="block text-[10px] font-bold text-basalt-600 uppercase mb-1">
              Ward Filter
            </label>
            <select
              value={selectedWardFilter}
              onChange={(e) => setSelectedWardFilter(e.target.value)}
              className="w-full bg-monsoon-50 border border-monsoon-300 rounded-xl px-2.5 py-1.5 text-xs text-basalt-800 font-medium focus:outline-none focus:ring-1 focus:ring-saffron-500 cursor-pointer"
            >
              <option value="all">All Wards</option>
              {binWardIds.map((wId) => (
                <option key={wId} value={wId}>
                  {wId}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Colony / Area */}
          <div>
            <label className="block text-[10px] font-bold text-basalt-600 uppercase mb-1">
              Colony / Area
            </label>
            <select
              value={selectedColony}
              onChange={(e) => setSelectedColony(e.target.value)}
              className="w-full bg-monsoon-50 border border-monsoon-300 rounded-xl px-2.5 py-1.5 text-xs text-basalt-800 font-medium focus:outline-none focus:ring-1 focus:ring-saffron-500 cursor-pointer"
            >
              <option value="all">All Colonies</option>
              {colonies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 4: Fill Status (Configurable Thresholds) */}
          <div>
            <label className="block text-[10px] font-bold text-basalt-600 uppercase mb-1">
              Fill Status
            </label>
            <select
              value={selectedFillStatus}
              onChange={(e) => setSelectedFillStatus(e.target.value)}
              className="w-full bg-monsoon-50 border border-monsoon-300 rounded-xl px-2.5 py-1.5 text-xs text-basalt-800 font-medium focus:outline-none focus:ring-1 focus:ring-saffron-500 cursor-pointer"
            >
              <option value="all">All Fill Levels</option>
              <option value="full">Full (100%)</option>
              <option value="critical">Critical (85–99%)</option>
              <option value="high">High (70–84%)</option>
              <option value="normal">Normal (&lt; 70%)</option>
            </select>
          </div>

          {/* Filter 5: Reading Source */}
          <div>
            <label className="block text-[10px] font-bold text-basalt-600 uppercase mb-1">
              Reading Source
            </label>
            <select
              value={selectedReadingSource}
              onChange={(e) => setSelectedReadingSource(e.target.value)}
              className="w-full bg-monsoon-50 border border-monsoon-300 rounded-xl px-2.5 py-1.5 text-xs text-basalt-800 font-medium focus:outline-none focus:ring-1 focus:ring-saffron-500 cursor-pointer"
            >
              <option value="all">All Sources</option>
              <option value="sensor">Verified IoT Sensor</option>
              <option value="simulated">Simulated Telemetry</option>
              <option value="manual">Manual Sanitation Log</option>
            </select>
          </div>

          {/* Filter 6: Location Availability */}
          <div>
            <label className="block text-[10px] font-bold text-basalt-600 uppercase mb-1">
              GIS Location
            </label>
            <select
              value={selectedLocationStatus}
              onChange={(e) => setSelectedLocationStatus(e.target.value as any)}
              className="w-full bg-monsoon-50 border border-monsoon-300 rounded-xl px-2.5 py-1.5 text-xs text-basalt-800 font-medium focus:outline-none focus:ring-1 focus:ring-saffron-500 cursor-pointer"
            >
              <option value="all">All ({filteredBins.length})</option>
              <option value="mapped">Mapped on GPS ({mappableBins.length})</option>
              <option value="unavailable">Location Unavailable ({unmappedBins.length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Interactive Map Canvas with Explicit Non-Rendered Area Notice */}
      <div className="relative h-[540px] sm:h-[600px] bg-white rounded-2xl border border-monsoon-200 overflow-hidden shadow-civic">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Legend Overlay & Center Button */}
        <div className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-monsoon-300 shadow-civic text-xs space-y-1.5 max-w-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-basalt-800 text-[11px] uppercase tracking-wider">Map Legend</span>
            <button
              type="button"
              onClick={handleRecenter}
              className="text-saffron-700 font-bold hover:underline text-[10px]"
            >
              Recenter Pune
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-red-700 border border-white" />
              <span>Full (100%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-red-600 border border-white" />
              <span>Critical (85–99%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-amber-500 border border-white" />
              <span>High (70–84%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-600 border border-white" />
              <span>Normal (&lt; 70%)</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-monsoon-200 text-[10px] text-basalt-500 flex items-center justify-between">
            <span>Mapped Bins: <strong>{mappableBins.length}</strong></span>
            <span>Trucks: <strong>{trucks.length}</strong></span>
          </div>
        </div>

        {/* Caveat Overlay */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-monsoon-300 shadow-civic text-[11px] text-basalt-700 max-w-sm">
          <div className="flex items-center gap-1.5 font-bold text-basalt-900 mb-0.5">
            <Info className="w-3.5 h-3.5 text-saffron-600" />
            <span>Click any dustbin or truck for live operational details</span>
          </div>
          <span className="text-[10px] text-basalt-500">
            Unsurveyed bins are explicitly excluded from map plotting to avoid fabricating coordinates.
          </span>
        </div>
      </div>

      {/* 3. Explicit "Location Unavailable" Registry (Priority 2 & 3 Compliance) */}
      {unmappedBins.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-civic space-y-2 text-xs">
          <div className="flex items-center justify-between text-amber-900 font-bold">
            <div className="flex items-center gap-2">
              <MapPinOff className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="uppercase tracking-wide">
                Unmapped Bins (Location Unavailable: {unmappedBins.length} Nodes)
              </span>
            </div>
            <span className="text-[10px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full font-bold">
              Excluded from Map Canvas
            </span>
          </div>

          <p className="text-[11px] text-amber-800 leading-relaxed">
            In accordance with data honesty guidelines, bins without verified GIS GPS surveys are <strong>not rendered at fabricated coordinates</strong>. They remain fully operable for dispatch and inspection via the registry below:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {unmappedBins.map((bin) => (
              <div
                key={bin.id}
                onClick={() => onSelectBin && onSelectBin(bin)}
                className="p-3 rounded-xl bg-white border border-amber-200 hover:border-amber-400 cursor-pointer shadow-xs transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[10.5px] text-saffron-800">{bin.code}</span>
                    <span className="font-bold text-basalt-900">{bin.name}</span>
                  </div>
                  <span className="text-[10.5px] text-basalt-500 block mt-0.5">
                    {bin.colonyName || bin.location.address} • Ward: {bin.wardId}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-sm font-sans" style={{ color: bin.currentFillPercent >= 85 ? '#DC2626' : '#D97706' }}>
                    {bin.currentFillPercent}%
                  </span>
                  <span className="text-[9.5px] uppercase font-bold text-basalt-500 block">
                    {bin.readingSource}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
