import { describe, it, expect } from 'vitest';
import { 
  getPuneMasterData, 
  getAllWards, 
  getAllZones, 
  getCitySummary, 
  getHistoricalRecycling, 
  calculateZoneAggregations 
} from '../data/puneData';
import { generatePunePlanningScenario } from '../services/planningEngine';

describe('WasteWise Pune Edition - Master Dataset & Domain Verification', () => {
  const masterData = getPuneMasterData();
  const wards = getAllWards();
  const zones = getAllZones();
  const summary = getCitySummary();
  const historical = getHistoricalRecycling();

  it('1. Parses all 42 ward records and 15 zones from the master dataset', () => {
    expect(wards.length).toBe(42);
    expect(zones.length).toBe(15);
    expect(masterData.city.source_supported_zone_count).toBe(15);
    expect(masterData.city.source_supported_ward_count).toBe(42);
  });

  it('2. Aggregated sums match official source summary totals exactly without alteration', () => {
    const totalWaste = Math.round(wards.reduce((sum, w) => sum + w.waste.reported_total_waste_tonnes_per_day, 0) * 100) / 100;
    const totalHouseholds = wards.reduce((sum, w) => sum + w.households.reported_total_households, 0);
    const totalD2D = wards.reduce((sum, w) => sum + w.households.d2d_households_listed, 0);
    const totalBins = wards.reduce((sum, w) => sum + w.bins.street_bin_count, 0);

    expect(totalWaste).toBe(1592.43);
    expect(totalWaste).toBe(summary.reported_waste_tonnes_per_day_sum);

    expect(totalHouseholds).toBe(4294227);
    expect(totalHouseholds).toBe(summary.reported_households_sum);

    expect(totalD2D).toBe(939121);
    expect(totalD2D).toBe(summary.d2d_households_listed_sum);

    expect(totalBins).toBe(5569);
    expect(totalBins).toBe(summary.reported_street_bin_count_sum);
  });

  it('3. Handles duplicate Ward 39 conflict with unique internal IDs and conflict flags', () => {
    const ward39s = wards.filter((w) => w.ward_number_raw === '39' || w.source_ward_id.includes('39'));
    expect(ward39s.length).toBe(2);

    const dhanawadiRec = ward39s.find((w) => w.internal_id === 'pune-ward-39-dhanawadi');
    const kasbaRec = ward39s.find((w) => w.internal_id === 'pune-ward-39-kasba');

    expect(dhanawadiRec).toBeDefined();
    expect(kasbaRec).toBeDefined();

    // Verify both are flagged with conflict metadata
    expect(dhanawadiRec?.has_conflict).toBe(true);
    expect(dhanawadiRec?.conflict_type).toBe('duplicate_ward_number');
    expect(kasbaRec?.has_conflict).toBe(true);
    expect(kasbaRec?.conflict_type).toBe('duplicate_ward_number');

    // Verify distinct source values are preserved
    expect(dhanawadiRec?.zone_name).toBe('Dhanawadi Sahakarnagar');
    expect(dhanawadiRec?.waste.reported_total_waste_tonnes_per_day).toBe(44);
    expect(dhanawadiRec?.households.reported_total_households).toBe(59265);

    expect(kasbaRec?.zone_name).toBe('Kasba Vishrambaugh Wada');
    expect(kasbaRec?.waste.reported_total_waste_tonnes_per_day).toBe(46.32);
    expect(kasbaRec?.households.reported_total_households).toBe(86159);
  });

  it('4. Handles ambiguous Ward 42 composite entry without inventing a zone assignment', () => {
    const ward42 = wards.find((w) => w.internal_id === 'pune-ward-42-composite' || w.ward_number_raw.includes('42'));
    expect(ward42).toBeDefined();

    // Zone must be null and status ambiguous
    expect(ward42?.zone_name).toBeNull();
    expect(ward42?.zone_assignment_status).toBe('ambiguous_source_value');
    expect(ward42?.has_conflict).toBe(true);
    expect(ward42?.conflict_type).toBe('ambiguous_composite_zone');
    expect(ward42?.waste.reported_total_waste_tonnes_per_day).toBe(66.53);
  });

  it('5. Strictly preserves missing fleet counts as null (unknown), never zero', () => {
    const populated = wards.filter((w) => w.collection_fleet.vehicle_count_reported !== null);
    const missing = wards.filter((w) => w.collection_fleet.vehicle_count_reported === null);

    expect(populated.length).toBe(15);
    expect(missing.length).toBe(27);

    // Sum of reported fleet must equal 2,135
    const reportedSum = populated.reduce((sum, w) => sum + (w.collection_fleet.vehicle_count_reported ?? 0), 0);
    expect(reportedSum).toBe(2135);

    // Ensure none of the missing records were silently converted to 0
    missing.forEach((w) => {
      expect(w.collection_fleet.vehicle_count_reported).toBeNull();
    });
  });

  it('6. Preserves historical recycling quantities as raw strings with unit caveat', () => {
    expect(historical.length).toBe(10);
    expect(historical[0].year).toBe(2011);
    expect(historical[0].reported_recycled_quantity_raw).toBe('165 MT/day');
    expect(typeof historical[0].reported_recycled_quantity_raw).toBe('string');

    expect(historical[9].year).toBe(2020);
    expect(historical[9].reported_recycled_quantity_raw).toBe('220 MT/day');

    // Verify unit note caveat
    expect(historical[0].source_unit_note).toContain('million tonnes');
    expect(historical[0].source_unit_note).toContain('MT/day');
  });

  it('7. Zone aggregation correctly groups 41 assigned wards into 15 zones and isolates 1 composite', () => {
    const agg = calculateZoneAggregations();
    expect(agg.zones.length).toBe(15);
    expect(agg.unassignedWards.length).toBe(1);
    expect(agg.unassignedWards[0].internal_id).toBe('pune-ward-42-composite');

    const totalAssignedWards = agg.zones.reduce((sum, z) => sum + z.wardCount, 0);
    expect(totalAssignedWards).toBe(41);
  });

  it('8. Planning engine allocates ward workloads respecting vehicle capacities and flags unassigned deficits', () => {
    // Scenario A: Plentiful fleet (300 vehicles) -> 100% allocation
    const generousResult = generatePunePlanningScenario(wards, {
      scenarioName: 'Generous Fleet Test',
      availableVehiclesCount: 300,
      truckCapacityTonnes: 5.0,
      shiftDurationHours: 8,
      serviceTimeMinutesPerWard: 60,
      depotLocation: 'Urali Devachi Processing Site & SLF',
      selectedZone: 'all',
    });

    expect(generousResult.isSimulated).toBe(true);
    expect(generousResult.unassignedWorkloadTpd).toBe(0);
    expect(generousResult.deficitVehicles).toBe(0);
    expect(generousResult.assumptions.length).toBeGreaterThan(0);

    // Scenario B: Constrained fleet (20 vehicles) -> explicit unassigned deficit
    const constrainedResult = generatePunePlanningScenario(wards, {
      scenarioName: 'Constrained Fleet Test',
      availableVehiclesCount: 20,
      truckCapacityTonnes: 5.0,
      shiftDurationHours: 8,
      serviceTimeMinutesPerWard: 60,
      depotLocation: 'Urali Devachi Processing Site & SLF',
      selectedZone: 'all',
    });

    expect(constrainedResult.unassignedWorkloadTpd).toBeGreaterThan(0);
    expect(constrainedResult.deficitVehicles).toBeGreaterThan(0);
    expect(constrainedResult.unassignedWards.length).toBeGreaterThan(0);
    expect(constrainedResult.allocations.some((a) => a.status === 'unassigned')).toBe(true);
  });
});
