// ==========================================
// WasteWise Pune Edition - Data Access & Aggregation Layer
// ==========================================

import rawMasterData from './puneMasterDataset.json';
import { 
  PuneMasterDataset, 
  PuneWardRecord, 
  PuneZone, 
  PuneDisposalSite, 
  HistoricalRecyclingRecord, 
  PuneMasterSummary,
  DataQualityReport,
  Coordinates
} from '../types';

export const PUNE_CENTER: [number, number] = [18.5204, 73.8567];
export const PUNE_DEFAULT_ZOOM = 12;

export const PUNE_MUNICIPAL_METADATA = {
  authority: 'Pune Municipal Corporation (PMC)',
  marathiAuthority: 'पुणे महानगरपालिका (पुमपा)',
  administrativeDivisions: '15 Administrative Zones • 42 Ward Records',
  sourceDatasetName: 'WasteWise Pune Master Operations Dataset (v1.0.0)',
  disposalSite: 'Urali Devachi Processing Site & SLF (Reported 300–350 TPD)',
  sourceReportedWasteTpd: 1592.43,
  sourceReportedHouseholds: 4294227,
  sourceD2DHouseholds: 939121,
  sourceStreetBins: 5569,
};

// Depots for Pune collection planning
export const PUNE_DEPOTS: { id: string; name: string; marathiName: string; coords: Coordinates; description: string }[] = [
  {
    id: 'pune-depot-urali',
    name: 'Urali Devachi Central Processing & Landfill Depot',
    marathiName: 'उरुळी देवाची मध्यवर्ती कचरा प्रक्रिया केंद्र',
    coords: { lat: 18.4357, lng: 73.9704 },
    description: 'Primary municipal processing and scientific landfill site (reported 300-350 TPD)',
  },
  {
    id: 'pune-depot-swargate',
    name: 'Swargate Municipal Fleet Depot',
    marathiName: 'स्वारगेट वाहन आगार',
    coords: { lat: 18.5018, lng: 73.8580 },
    description: 'Central-south transfer and maintenance hub',
  },
  {
    id: 'pune-depot-shivajinagar',
    name: 'Shivajinagar North Operations Yard',
    marathiName: 'शिवाजीनगर उत्तर आगार',
    coords: { lat: 18.5314, lng: 73.8446 },
    description: 'North-central arterial fleet base',
  },
  {
    id: 'pune-depot-kothrud',
    name: 'Kothrud-Paud Road Terminal',
    marathiName: 'कोथरूड डेपो',
    coords: { lat: 18.5074, lng: 73.8077 },
    description: 'Western suburban fleet center',
  },
  {
    id: 'pune-depot-hadapsar',
    name: 'Hadapsar-Mundhwa Fleet Hub',
    marathiName: 'हडपसर वाहन केंद्र',
    coords: { lat: 18.5089, lng: 73.9259 },
    description: 'Eastern industrial and residential logistics terminal',
  },
];

// Enrich and assign unambiguous internal identifiers to raw wards
function processWards(rawWards: any[]): PuneWardRecord[] {
  let ward39Count = 0;

  return rawWards.map((w) => {
    let internalId = w.ward_id;
    let hasConflict = false;
    let conflictType: 'duplicate_ward_number' | 'ambiguous_composite_zone' | null = null;
    let conflictDescription: string | undefined = undefined;
    const flags: string[] = [];

    // Conflict Check 1: Ward 39 Duplicate Record
    if (w.ward_number_raw === '39' || w.ward_id === 'pune-ward-39') {
      ward39Count++;
      hasConflict = true;
      conflictType = 'duplicate_ward_number';
      if (w.zone_name?.toLowerCase().includes('dhanawadi') || w.ward_name?.toLowerCase().includes('dhankawadi')) {
        internalId = 'pune-ward-39-dhanawadi';
        conflictDescription = 'Ward 39 Duplicate Record A: Reported under Dhanawadi Sahakarnagar zone (44.00 TPD, 59,265 households).';
      } else {
        internalId = 'pune-ward-39-kasba';
        conflictDescription = 'Ward 39 Duplicate Record B: Reported under Kasba Vishrambaugh Wada zone (46.32 TPD, 86,159 households).';
      }
      flags.push('duplicate_ward_number');
    }

    // Conflict Check 2: Ward 42 Composite Ambiguous Zone
    if (w.ward_number_raw?.includes('42') || w.zone_assignment_status === 'ambiguous_source_value') {
      internalId = 'pune-ward-42-composite';
      hasConflict = true;
      conflictType = 'ambiguous_composite_zone';
      conflictDescription = 'Composite/Ambiguous Ward 42: Source entry spans 5 zones (12, 7, 10, 8, 9). Left unassigned to avoid false precision.';
      flags.push('ambiguous_composite_zone');
    }

    // Data Quality Check 3: Missing Fleet Count
    if (w.collection_fleet.vehicle_count_reported === null) {
      flags.push('missing_vehicle_count');
    }

    // Data Quality Check 4: 100% Waste Segregation Anomaly
    if (
      w.households.reported_households_with_waste_segregation === w.households.reported_total_households &&
      w.households.reported_total_households > 0
    ) {
      flags.push('reported_100_pct_segregation_anomaly');
    }

    // Data Quality Check 5: Zero Commercial Waste Reported
    if (w.waste.commercial_waste_tpd_raw === 0) {
      flags.push('zero_commercial_waste_reported');
    }

    return {
      internal_id: internalId,
      source_ward_id: w.ward_id,
      city: w.city || 'Pune',
      zone_name: w.zone_name,
      zone_name_raw: w.zone_name_raw,
      zone_assignment_status: w.zone_assignment_status,
      ward_name: w.ward_name,
      ward_number_raw: w.ward_number_raw,
      households: { ...w.households },
      waste: { ...w.waste },
      bins: { ...w.bins },
      collection_fleet: { ...w.collection_fleet },
      user_charges: { ...w.user_charges },
      routing_data: { ...w.routing_data },
      has_conflict: hasConflict,
      conflict_type: conflictType,
      conflict_description: conflictDescription,
      data_quality_flags: flags,
    };
  });
}

// Master processed records cached in memory
const PROCESSED_WARDS: PuneWardRecord[] = processWards(rawMasterData.wards);

export function getPuneMasterData(): PuneMasterDataset {
  return {
    ...(rawMasterData as any),
    wards: PROCESSED_WARDS,
  };
}

export function getAllWards(): PuneWardRecord[] {
  return PROCESSED_WARDS;
}

export function getWardByInternalId(internalId: string): PuneWardRecord | undefined {
  return PROCESSED_WARDS.find((w) => w.internal_id === internalId);
}

export function getAllZones(): PuneZone[] {
  return (rawMasterData.city?.zones as PuneZone[]) || [];
}

export function getCitySummary(): PuneMasterSummary {
  return rawMasterData.summary as PuneMasterSummary;
}

export function getDisposalSites(): PuneDisposalSite[] {
  return (rawMasterData.disposal_sites as PuneDisposalSite[]) || [];
}

export function getHistoricalRecycling(): HistoricalRecyclingRecord[] {
  return (rawMasterData.historical_citywide_recycling as HistoricalRecyclingRecord[]) || [];
}

export function getDataQualityReport(): DataQualityReport {
  return rawMasterData.data_quality as DataQualityReport;
}

export interface ZoneAggregation {
  zoneId: string;
  zoneName: string;
  wardCount: number;
  totalWasteTpd: number;
  totalHouseholds: number;
  totalD2DHouseholds: number;
  d2dCoveragePercent: number;
  totalStreetBins: number;
  reportedVehicles: number | null; // null if no wards in zone have reported vehicles
  wards: PuneWardRecord[];
}

export function calculateZoneAggregations(): {
  zones: ZoneAggregation[];
  unassignedWards: PuneWardRecord[];
  citywideTotalWasteTpd: number;
  citywideTotalHouseholds: number;
  citywideTotalD2DHouseholds: number;
  citywideTotalStreetBins: number;
  citywideReportedVehicles: number;
} {
  const zones = getAllZones();
  const wards = getAllWards();

  const unassignedWards: PuneWardRecord[] = [];
  const zoneMap: Map<string, ZoneAggregation> = new Map();

  for (const z of zones) {
    zoneMap.set(z.name.toLowerCase().trim(), {
      zoneId: z.zone_id,
      zoneName: z.name,
      wardCount: 0,
      totalWasteTpd: 0,
      totalHouseholds: 0,
      totalD2DHouseholds: 0,
      d2dCoveragePercent: 0,
      totalStreetBins: 0,
      reportedVehicles: null,
      wards: [],
    });
  }

  for (const ward of wards) {
    if (!ward.zone_name) {
      unassignedWards.push(ward);
      continue;
    }

    const key = ward.zone_name.toLowerCase().trim();
    let entry = zoneMap.get(key);

    if (!entry) {
      // Find fuzzy or fallback match
      for (const [k, v] of zoneMap.entries()) {
        if (key.includes(k) || k.includes(key)) {
          entry = v;
          break;
        }
      }
    }

    if (entry) {
      entry.wardCount++;
      entry.totalWasteTpd = Math.round((entry.totalWasteTpd + ward.waste.reported_total_waste_tonnes_per_day) * 100) / 100;
      entry.totalHouseholds += ward.households.reported_total_households;
      entry.totalD2DHouseholds += ward.households.d2d_households_listed;
      entry.totalStreetBins += ward.bins.street_bin_count;
      entry.wards.push(ward);

      if (ward.collection_fleet.vehicle_count_reported !== null) {
        entry.reportedVehicles = (entry.reportedVehicles ?? 0) + ward.collection_fleet.vehicle_count_reported;
      }
    } else {
      unassignedWards.push(ward);
    }
  }

  // Calculate D2D coverage percentages
  for (const z of zoneMap.values()) {
    z.d2dCoveragePercent = z.totalHouseholds > 0
      ? Math.round((z.totalD2DHouseholds / z.totalHouseholds) * 1000) / 10
      : 0;
  }

  // Citywide sums (derived from 42 records, preserving source sums)
  const citywideTotalWasteTpd = Math.round(wards.reduce((sum, w) => sum + w.waste.reported_total_waste_tonnes_per_day, 0) * 100) / 100;
  const citywideTotalHouseholds = wards.reduce((sum, w) => sum + w.households.reported_total_households, 0);
  const citywideTotalD2DHouseholds = wards.reduce((sum, w) => sum + w.households.d2d_households_listed, 0);
  const citywideTotalStreetBins = wards.reduce((sum, w) => sum + w.bins.street_bin_count, 0);
  const citywideReportedVehicles = wards.reduce((sum, w) => sum + (w.collection_fleet.vehicle_count_reported ?? 0), 0);

  return {
    zones: Array.from(zoneMap.values()),
    unassignedWards,
    citywideTotalWasteTpd,
    citywideTotalHouseholds,
    citywideTotalD2DHouseholds,
    citywideTotalStreetBins,
    citywideReportedVehicles,
  };
}
