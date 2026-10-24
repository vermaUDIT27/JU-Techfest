import { describe, it, expect } from 'vitest';
import { calculateHeadingDegrees, recordCollectionService } from '../services/simulationEngine';
import { BinRecord, TruckRecord } from '../types';

describe('WasteWise Simulation Engine', () => {
  it('correctly calculates road heading rotation angles', () => {
    // Due North
    expect(calculateHeadingDegrees([26.80, 75.80], [26.85, 75.80])).toBe(0);
    // Due East
    expect(calculateHeadingDegrees([26.80, 75.80], [26.80, 75.85])).toBe(90);
    // Due South
    expect(calculateHeadingDegrees([26.85, 75.80], [26.80, 75.80])).toBe(180);
    // Due West
    expect(calculateHeadingDegrees([26.80, 75.85], [26.80, 75.80])).toBe(270);
  });

  it('records collection service, reduces bin fill to 5%, and updates truck load', () => {
    const testBin: BinRecord = {
      id: 'BIN-1',
      code: 'WW-01',
      name: 'Test Bin',
      hindiName: '',
      location: { lat: 26.8, lng: 75.8, address: '', hindiAddress: '', landmark: '', ward: '', sector: '' },
      capacityLiters: 1100,
      currentFillPercent: 95,
      estimatedKg: 380,
      riskCategory: 'critical',
      collectionStatus: 'assigned',
      lastCollectionTime: '',
      dataFreshness: '',
      isSimulated: true,
      sensitiveZone: false,
      supervisorTradeoffReason: '',
    };

    const testTruck: TruckRecord = {
      id: 'TRUCK-1',
      name: 'Tipper',
      driverName: 'Driver A',
      driverPhone: '',
      capacityKg: 5000,
      currentLoadKg: 0,
      status: 'Assigned',
      depotName: '',
      depotCoords: { lat: 26.8, lng: 75.8 },
      currentCoords: { lat: 26.8, lng: 75.8 },
      headingDegrees: 0,
      assignedBinIds: ['BIN-1'],
      completedBinIds: [],
      color: '#B04F34',
      progressPercent: 0,
      currentSegmentIndex: 0,
    };

    const result = recordCollectionService(
      'BIN-1',
      'TRUCK-1',
      [testTruck],
      [testBin],
      'collected'
    );

    const updatedBin = result.updatedBins[0];
    const updatedTruck = result.updatedTrucks[0];

    expect(updatedBin.collectionStatus).toBe('collected');
    expect(updatedBin.currentFillPercent).toBe(5);
    expect(updatedBin.riskCategory).toBe('low');

    expect(updatedTruck.completedBinIds).toContain('BIN-1');
    expect(updatedTruck.currentLoadKg).toBe(380);
    expect(result.event.type).toBe('collected');
    expect(result.event.weightKg).toBe(380);
  });
});
