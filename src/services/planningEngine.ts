// ==========================================
// WasteWise Pune Edition - Scenario Planning Engine
// ==========================================

import { 
  PuneWardRecord, 
  PlanningScenarioConfig, 
  PlanningResult, 
  WardWorkloadAllocation 
} from '../types';

export const DEFAULT_PLANNING_CONFIG: PlanningScenarioConfig = {
  scenarioName: 'Pune Citywide Baseline Shift (All 15 Zones)',
  availableVehiclesCount: 160,
  truckCapacityTonnes: 5.0, // 5 tonnes standard hydraulic tipper
  shiftDurationHours: 8,
  serviceTimeMinutesPerWard: 60,
  depotLocation: 'Urali Devachi Central Processing & Landfill Depot',
  selectedZone: 'all',
};

/**
 * Calculates a data-honest ward-level workload allocation scenario.
 * Strictly distinguishes proposed planning scenarios from approved operational dispatches.
 */
export function generatePunePlanningScenario(
  wards: PuneWardRecord[],
  config: PlanningScenarioConfig = DEFAULT_PLANNING_CONFIG
): PlanningResult {
  // Filter wards if a specific zone is selected
  const targetWards = config.selectedZone === 'all'
    ? [...wards]
    : wards.filter((w) => w.zone_name?.toLowerCase() === config.selectedZone.toLowerCase());

  // Priority ranking: High waste volume first, then high D2D households
  const rankedWards = targetWards.sort((a, b) => {
    if (b.waste.reported_total_waste_tonnes_per_day !== a.waste.reported_total_waste_tonnes_per_day) {
      return b.waste.reported_total_waste_tonnes_per_day - a.waste.reported_total_waste_tonnes_per_day;
    }
    return b.households.d2d_households_listed - a.households.d2d_households_listed;
  });

  // Shift constraints: Estimate round-trip time between ward and depot
  const roundTripMinutesEst = 60; // 30 mins each way to central depot / Urali Devachi
  const totalCycleMinutes = config.serviceTimeMinutesPerWard + roundTripMinutesEst;
  const maxTripsPerVehiclePerShift = Math.max(1, Math.floor((config.shiftDurationHours * 60) / totalCycleMinutes));
  const maxCapacityPerVehiclePerShiftTonnes = maxTripsPerVehiclePerShift * config.truckCapacityTonnes;

  let remainingVehicles = config.availableVehiclesCount;
  let vehicleCounter = 1;

  const allocations: WardWorkloadAllocation[] = [];
  const unassignedWards: {
    internalWardId: string;
    wardName: string;
    wasteTpd: number;
    reason: string;
  }[] = [];

  let allocatedWorkloadTpd = 0;
  let totalTripsRequired = 0;
  let totalVehiclesUtilized = 0;

  for (const ward of rankedWards) {
    const wasteTpd = ward.waste.reported_total_waste_tonnes_per_day;
    const requiredTrips = Math.max(1, Math.ceil(wasteTpd / config.truckCapacityTonnes));
    totalTripsRequired += requiredTrips;

    // Vehicles needed for this individual ward
    const vehiclesForWard = Math.ceil(wasteTpd / maxCapacityPerVehiclePerShiftTonnes);

    if (remainingVehicles >= vehiclesForWard) {
      // Allocate vehicles
      remainingVehicles -= vehiclesForWard;
      totalVehiclesUtilized += vehiclesForWard;
      allocatedWorkloadTpd += wasteTpd;

      const vehicleIds = Array.from(
        { length: vehiclesForWard },
        () => `PMC-TRK-${String(vehicleCounter++).padStart(3, '0')}`
      ).join(', ');

      allocations.push({
        internalWardId: ward.internal_id,
        wardNumberRaw: ward.ward_number_raw,
        wardName: ward.ward_name,
        zoneName: ward.zone_name || 'Unassigned Composite',
        wasteTpd,
        requiredTrips,
        assignedTruckId: vehicleIds,
        status: 'allocated',
        rationale: `Allocated ${vehiclesForWard} vehicle(s) [${vehicleIds}] for ${requiredTrips} trips to clear ${wasteTpd} TPD at ${config.truckCapacityTonnes}T payload per trip. Transit to ${config.depotLocation}.`,
      });
    } else if (remainingVehicles > 0) {
      // Partial vehicle allocation
      const partialVehicles = remainingVehicles;
      remainingVehicles = 0;
      totalVehiclesUtilized += partialVehicles;
      const partialTpd = Math.min(wasteTpd, partialVehicles * maxCapacityPerVehiclePerShiftTonnes);
      allocatedWorkloadTpd += partialTpd;

      const vehicleIds = Array.from(
        { length: partialVehicles },
        () => `PMC-TRK-${String(vehicleCounter++).padStart(3, '0')}`
      ).join(', ');

      allocations.push({
        internalWardId: ward.internal_id,
        wardNumberRaw: ward.ward_number_raw,
        wardName: ward.ward_name,
        zoneName: ward.zone_name || 'Unassigned Composite',
        wasteTpd,
        requiredTrips,
        assignedTruckId: vehicleIds,
        status: 'capacity_exceeded',
        rationale: `Partial allocation: Assigned ${partialVehicles} remaining vehicle(s) [${vehicleIds}] clearing ${partialTpd.toFixed(1)} of ${wasteTpd} TPD. Deficit of ${Math.round((wasteTpd - partialTpd) * 10) / 10} TPD unserved.`,
      });

      unassignedWards.push({
        internalWardId: ward.internal_id,
        wardName: ward.ward_name,
        wasteTpd: Math.round((wasteTpd - partialTpd) * 10) / 10,
        reason: `Partial fleet exhaustion. ${partialVehicles} of ${vehiclesForWard} needed vehicles assigned.`,
      });
    } else {
      // Completely unassigned ward
      allocations.push({
        internalWardId: ward.internal_id,
        wardNumberRaw: ward.ward_number_raw,
        wardName: ward.ward_name,
        zoneName: ward.zone_name || 'Unassigned Composite',
        wasteTpd,
        requiredTrips,
        assignedTruckId: null,
        status: 'unassigned',
        rationale: `Unassigned: Insufficient available vehicles. Requires ${vehiclesForWard} vehicle(s) (${requiredTrips} trips) to service ${wasteTpd} TPD.`,
      });

      unassignedWards.push({
        internalWardId: ward.internal_id,
        wardName: ward.ward_name,
        wasteTpd,
        reason: `Fleet exhausted. Requires ${vehiclesForWard} vehicle(s) for ${wasteTpd} TPD.`,
      });
    }
  }

  const totalWorkloadTpd = Math.round(targetWards.reduce((sum, w) => sum + w.waste.reported_total_waste_tonnes_per_day, 0) * 100) / 100;
  const roundedAllocatedTpd = Math.round(allocatedWorkloadTpd * 100) / 100;
  const unassignedWorkloadTpd = Math.round(Math.max(0, totalWorkloadTpd - roundedAllocatedTpd) * 100) / 100;

  // Total vehicles needed to clear 100% of workload
  const vehiclesNeeded = Math.ceil(totalWorkloadTpd / maxCapacityPerVehiclePerShiftTonnes);
  const deficitVehicles = Math.max(0, vehiclesNeeded - config.availableVehiclesCount);

  const assumptions: string[] = [
    `Workload quantities are strictly sourced from PMC ward-level reports in the master dataset (Total: ${totalWorkloadTpd} TPD across ${targetWards.length} wards).`,
    `Assumes a uniform vehicle payload capacity of ${config.truckCapacityTonnes} metric tonnes per trip.`,
    `Assumes an ${config.shiftDurationHours}-hour shift duration with ${config.serviceTimeMinutesPerWard} minutes service per ward and ${roundTripMinutesEst} minutes estimated round-trip to ${config.depotLocation} (Max ${maxTripsPerVehiclePerShift} trips/shift).`,
    'Does NOT assume point-to-point GPS coordinates, real street-level traffic, or verified 100% household door-to-door coverage.',
    'PROPOSED SCENARIO ONLY: This allocation is produced for supervisory workload analysis and is not an approved municipal dispatch assignment.',
  ];

  return {
    timestamp: new Date().toISOString(),
    scenarioConfig: { ...config },
    totalWorkloadTpd,
    allocatedWorkloadTpd: roundedAllocatedTpd,
    unassignedWorkloadTpd,
    totalTripsRequired,
    vehiclesNeeded,
    vehiclesAvailable: config.availableVehiclesCount,
    deficitVehicles,
    allocations,
    unassignedWards,
    assumptions,
    isSimulated: true,
  };
}
