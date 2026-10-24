// ==========================================
// WasteWise Pune Edition - Domain Type Definitions
// ==========================================

export type UserRole = 'municipal_head' | 'ward_supervisor' | 'driver';

export type NavigationView = 
  // Canonical 8 Operator Modules
  | 'overview'
  | 'live-operations'
  | 'complaints'
  | 'wards-bins'
  | 'fleet'
  | 'reports'
  | 'data-quality'
  | 'administration'
  // Backward compatibility aliases
  | 'city-overview'
  | 'zones-wards'
  | 'fleet-allocation'
  | 'route-planning'
  | 'waste-analytics'
  | 'operations-map'
  | 'collection-planner'
  | 'collection-log';

export type ReportTab = 
  | 'daily-collection'
  | 'bin-status'
  | 'route-performance'
  | 'complaints'
  | 'ward-comparison';

export type DateRangeFilter = 
  | 'today'
  | 'yesterday'
  | 'last-7-days'
  | 'month-to-date'
  | 'all-time';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export type FillThresholdStatus = 'normal' | 'high' | 'critical' | 'full';
export type FillReadingSource = 'simulated' | 'sensor' | 'manual';

export interface FillThresholdConfig {
  normalMax: number;   // default < 70
  highMax: number;     // default 70 - 84
  criticalMax: number; // default 85 - 99
  fullMin: number;     // default 100
}

export const DEFAULT_DEMO_THRESHOLDS: FillThresholdConfig = {
  normalMax: 69,
  highMax: 84,
  criticalMax: 99,
  fullMin: 100,
};

export type BinCollectionStatus = 
  | 'unassigned' 
  | 'assigned' 
  | 'en_route' 
  | 'collected' 
  | 'unable_to_collect';

export type TruckStatus = 
  | 'Available' 
  | 'Assigned' 
  | 'En route' 
  | 'Collecting' 
  | 'Full' 
  | 'Offline';

export type FailureReason = 
  | 'road_blocked' 
  | 'gate_locked' 
  | 'contaminated_waste' 
  | 'truck_capacity_full' 
  | 'hazardous_approach' 
  | 'other';

export interface Coordinates {
  lat: number;
  lng: number;
}

// ------------------------------------------
// Pune Master Dataset Models
// ------------------------------------------

export interface PuneZone {
  zone_id: string; // e.g. "pune-zone-01"
  name: string; // e.g. "Aundh Baner"
  ward_ids: string[];
}

export interface PuneWardHouseholds {
  reported_total_households: number;
  reported_households_with_waste_segregation: number;
  d2d_households_listed: number;
  d2d_households_under_daily_collection: number;
  d2d_listed_share_of_reported_households_pct: number;
}

export interface PuneWardWaste {
  reported_total_waste_tonnes_per_day: number;
  vehicle_dataset_waste_quantity_tpd_raw: number;
  street_sweeping_waste_tpd: number;
  commercial_waste_tpd_raw: number;
}

export interface PuneWardBins {
  street_bin_count: number;
  street_bin_size_litres: number;
  commercial_market_details_raw: number | string;
  community_bin_types_raw: number | string;
  community_bin_size_litres_raw: number | string;
  community_bin_purchase_year_raw: number | string;
}

export interface PuneWardFleet {
  vehicle_types_raw: string;
  vehicle_capacities_raw: string;
  purchase_year_range_raw: string;
  vehicle_count_reported: number | null; // NULL for 27 wards! Never convert to 0
  trip_frequency_raw: string;
}

export interface PuneWardUserCharges {
  charges_imposed: string; // 'Y'
  rate_inr_raw: string; // '50/70/140'
  monthly_revenue_raw: number;
}

export interface PuneWardRoutingData {
  collection_points: any[];
  coordinates: Coordinates | null;
  route_status: 'not_route_ready' | string;
  missing_requirements: string[];
}

export interface PuneWardRecord {
  internal_id: string; // Unique internal record identifier
  source_ward_id: string; // Source reported ID, e.g. "pune-ward-39"
  city: string; // "Pune"
  zone_name: string | null; // null for Ward 42
  zone_name_raw: string;
  zone_assignment_status: 'source_label' | 'ambiguous_source_value';
  ward_name: string;
  ward_number_raw: string;
  households: PuneWardHouseholds;
  waste: PuneWardWaste;
  bins: PuneWardBins;
  collection_fleet: PuneWardFleet;
  user_charges: PuneWardUserCharges;
  routing_data: PuneWardRoutingData;
  // Conflict and Data Quality Metadata
  has_conflict?: boolean;
  conflict_type?: 'duplicate_ward_number' | 'ambiguous_composite_zone' | null;
  conflict_description?: string;
  data_quality_flags: string[];
}

export interface PuneDisposalSite {
  site_id: string;
  city: string;
  waste_types_raw: string;
  site_type_raw: string;
  location_raw: string;
  distance_from_city_center_raw: string;
  operational_since_raw: string;
  reported_quantity_tpd_raw: string;
  coordinates: Coordinates | null;
}

export interface HistoricalRecyclingRecord {
  year: number;
  geography: string;
  ward_name_raw: string;
  ward_number_raw: string;
  reported_recycled_quantity_raw: string; // Preserved as raw string (e.g. "165 MT/day")
  source_unit_note: string;
}

export interface PuneMasterSummary {
  ward_records: number; // 42
  wards_with_zone_assignment: number; // 41
  wards_without_unambiguous_zone_assignment: number; // 1
  reported_households_sum: number; // 4,294,227
  reported_waste_tonnes_per_day_sum: number; // 1,592.43
  reported_street_bin_count_sum: number; // 5,569
  d2d_households_listed_sum: number; // 939,121
  d2d_households_under_daily_collection_sum: number; // 939,121
  vehicle_count_records_populated: number; // 15
  disposal_sites_records: number; // 1
  citywide_historical_records: number; // 10
}

export interface DataQualityReport {
  warnings: string[];
  source_files: {
    source_file: string;
    purpose: string;
    valid_ward_records?: number;
    populated_site_records?: number;
    records?: number;
  }[];
}

export interface PuneMasterDataset {
  schema_version: string;
  dataset_name: string;
  description: string;
  generated_at_utc: string;
  city: {
    city_id: string;
    name: string;
    country: string;
    state: string;
    administrative_hierarchy: string[];
    source_supported_zone_count: number;
    source_supported_ward_count: number;
    zones: PuneZone[];
  };
  summary: PuneMasterSummary;
  wards: PuneWardRecord[];
  disposal_sites: PuneDisposalSite[];
  historical_citywide_recycling: HistoricalRecyclingRecord[];
  routing_configuration: {
    mode: string;
    route_objective_priority: string[];
    hard_constraints: string[];
    not_computed_from_supplied_files: string[];
  };
  data_quality: DataQualityReport;
}

// ------------------------------------------
// Pune Scenario Planning Models
// ------------------------------------------

export interface PlanningScenarioConfig {
  scenarioName: string;
  availableVehiclesCount: number;
  truckCapacityTonnes: number; // e.g. 5 tonnes (Tata 1618), 3 tonnes (Ghanta Gadi)
  shiftDurationHours: number;
  serviceTimeMinutesPerWard: number;
  depotLocation: string; // e.g. "Urali Devachi Processing Site & SLF"
  selectedZone: string; // 'all' or zone_id
}

export interface WardWorkloadAllocation {
  internalWardId: string;
  wardNumberRaw: string;
  wardName: string;
  zoneName: string;
  wasteTpd: number;
  requiredTrips: number;
  assignedTruckId: string | null;
  status: 'allocated' | 'unassigned' | 'capacity_exceeded';
  rationale: string;
}

export interface PlanningResult {
  timestamp: string;
  scenarioConfig: PlanningScenarioConfig;
  totalWorkloadTpd: number;
  allocatedWorkloadTpd: number;
  unassignedWorkloadTpd: number;
  totalTripsRequired: number;
  vehiclesNeeded: number;
  vehiclesAvailable: number;
  deficitVehicles: number;
  allocations: WardWorkloadAllocation[];
  unassignedWards: {
    internalWardId: string;
    wardName: string;
    wasteTpd: number;
    reason: string;
  }[];
  assumptions: string[];
  isSimulated: true;
}

// ------------------------------------------
// Operational Simulation Models (Pune Road Network)
// ------------------------------------------

export interface BinLocation extends Coordinates {
  address: string;
  hindiAddress?: string;
  marathiAddress?: string;
  landmark: string;
  ward: string;
  sector?: string;
}

export interface BinRecord {
  id: string;
  code: string;
  name: string;
  marathiName?: string;
  hindiName?: string;
  wardId?: string;
  colonyName?: string;
  location: BinLocation;
  locationUnavailable?: boolean;
  capacityLiters: number;
  currentFillPercent: number; // 0 - 100
  readingSource?: FillReadingSource;
  fillThresholdStatus?: FillThresholdStatus;
  estimatedKg: number;
  riskCategory: RiskLevel;
  collectionStatus: BinCollectionStatus;
  assignedTruckId?: string;
  assignedDriverId?: string;
  assignedStopOrder?: number;
  lastCollectionTime: string;
  lastCollectionTimestamp?: string;
  lastUpdatedTimestamp?: string;
  collectionHistory?: {
    timestamp: string;
    truckId: string;
    result: string;
    weightKg?: number;
    notes?: string;
  }[];
  dataFreshness: string;
  isSimulated: boolean;
  sensitiveZone: boolean;
  sensitiveZoneType?: string;
  supervisorTradeoffReason: string;
  failureReason?: FailureReason;
  failureNote?: string;
  collectedAtTimestamp?: string;
}

export interface RouteWaypoint extends Coordinates {
  binId?: string;
  label?: string;
  isStop?: boolean;
  estimatedArrivalMinutes?: number;
}

export interface TruckRoute {
  truckId: string;
  color: string;
  binIds: string[];
  waypoints: RouteWaypoint[];
  roadGeometry: [number, number][];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  isFallbackGeometry: boolean;
}

export interface TruckRecord {
  id: string;
  name: string;
  driverName: string;
  driverPhone: string;
  capacityKg: number;
  currentLoadKg: number;
  status: TruckStatus;
  depotName: string;
  depotCoords: Coordinates;
  currentCoords: Coordinates;
  headingDegrees: number;
  assignedBinIds: string[];
  completedBinIds: string[];
  nextStopBinId?: string;
  assignedRoute?: TruckRoute;
  color: string;
  progressPercent: number;
  currentSegmentIndex: number;
}

export interface CollectionEvent {
  id: string;
  timestamp: string;
  binId: string;
  binCode: string;
  binName: string;
  truckId: string;
  driverName: string;
  type: 'collected' | 'unable_to_collect' | 'assigned' | 'reassigned';
  weightKg?: number;
  fillPercentBefore: number;
  reason?: FailureReason;
  notes?: string;
}

export interface DispatchPlanResult {
  timestamp: string;
  assignedTrucks: TruckRecord[];
  assignedBins: BinRecord[];
  unassignedBins: {
    bin: BinRecord;
    reason: string;
  }[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  highRiskBinsServiced: number;
  highRiskBinsUnserved: number;
  capacityViolations: number;
  routes: Record<string, TruckRoute>;
}

export interface BaselineComparisonMetrics {
  strategyName: string;
  description: string;
  totalRoadDistanceKm: number;
  estimatedRouteTimeMinutes: number;
  highRiskBinsServiced: number;
  highRiskBinsUnserved: number;
  truckCapacityViolations: number;
  unassignedWorkCount: number;
  fleetUtilizationPercent: number;
}

export interface SimulationState {
  isPlaying: boolean;
  speedMultiplier: 1 | 2 | 5;
  lastTickTimestamp: number;
}

export interface OverviewMetrics {
  totalBins: number;
  criticalBins: number;
  highBins: number;
  mediumBins: number;
  lowBins: number;
  collectedBins: number;
  pendingBins: number;
  sensitiveZoneBins: number;
  totalEstimatedWasteKg: number;
  activeTippers: number;
  staleTelemetryBins: number;
  highConfidenceBins: number;
  telemetryIntegrityPercent: number;
}

export interface CollectionShift {
  id: string;
  shiftCode: string;
  shiftName: string;
  date: string;
  timeSlot: string;
  ward: string;
  vehicleId: string;
  vehicleType: string;
  driverCrew: string;
  servicedBinIds: string[];
  servicedBinNames: string[];
  totalCollectedKg: number;
  status: 'completed' | 'in_progress' | 'scheduled';
  supervisorNotes: string;
  telemetryDiscrepancyNotes?: string;
}
