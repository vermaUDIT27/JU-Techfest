import { describe, it, expect } from 'vitest';
import { generateProposedDispatch } from '../services/dispatchEngine';
import { BinRecord, TruckRecord } from '../types';

describe('WasteWise Multi-Truck Dispatch Engine', () => {
  const mockBins: BinRecord[] = [
    {
      id: 'BIN-CRIT-1',
      code: 'WW-01',
      name: 'Critical Market Bin',
      hindiName: '',
      location: { lat: 26.8340, lng: 75.8452, address: '', hindiAddress: '', landmark: '', ward: '', sector: '' },
      capacityLiters: 1100,
      currentFillPercent: 95,
      estimatedKg: 400,
      riskCategory: 'critical',
      collectionStatus: 'unassigned',
      lastCollectionTime: '',
      dataFreshness: '2 mins ago',
      isSimulated: true,
      sensitiveZone: true,
      supervisorTradeoffReason: '',
    },
    {
      id: 'BIN-HIGH-2',
      code: 'WW-02',
      name: 'High Commercial Bin',
      hindiName: '',
      location: { lat: 26.8245, lng: 75.8570, address: '', hindiAddress: '', landmark: '', ward: '', sector: '' },
      capacityLiters: 1100,
      currentFillPercent: 80,
      estimatedKg: 300,
      riskCategory: 'high',
      collectionStatus: 'unassigned',
      lastCollectionTime: '',
      dataFreshness: '5 mins ago',
      isSimulated: true,
      sensitiveZone: false,
      supervisorTradeoffReason: '',
    },
    {
      id: 'BIN-LOW-3',
      code: 'WW-03',
      name: 'Low Residential Bin',
      hindiName: '',
      location: { lat: 26.8188, lng: 75.8622, address: '', hindiAddress: '', landmark: '', ward: '', sector: '' },
      capacityLiters: 1100,
      currentFillPercent: 30,
      estimatedKg: 100,
      riskCategory: 'low',
      collectionStatus: 'unassigned',
      lastCollectionTime: '',
      dataFreshness: '10 mins ago',
      isSimulated: true,
      sensitiveZone: false,
      supervisorTradeoffReason: '',
    },
  ];

  const mockTrucks: TruckRecord[] = [
    {
      id: 'TRUCK-ACTIVE-1',
      name: 'Tipper 1',
      driverName: 'Driver 1',
      driverPhone: '123',
      capacityKg: 500, // Capacity only enough for one heavy bin or two small ones
      currentLoadKg: 0,
      status: 'Available',
      depotName: 'Depot A',
      depotCoords: { lat: 26.8300, lng: 75.8400 },
      currentCoords: { lat: 26.8300, lng: 75.8400 },
      headingDegrees: 0,
      assignedBinIds: [],
      completedBinIds: [],
      color: '#B04F34',
      progressPercent: 0,
      currentSegmentIndex: 0,
    },
    {
      id: 'TRUCK-OFFLINE-2',
      name: 'Tipper 2',
      driverName: 'Driver 2',
      driverPhone: '456',
      capacityKg: 5000,
      currentLoadKg: 0,
      status: 'Offline', // Offline! Must be excluded
      depotName: 'Depot B',
      depotCoords: { lat: 26.8200, lng: 75.8500 },
      currentCoords: { lat: 26.8200, lng: 75.8500 },
      headingDegrees: 0,
      assignedBinIds: [],
      completedBinIds: [],
      color: '#9CA3AF',
      progressPercent: 0,
      currentSegmentIndex: 0,
    },
  ];

  it('excludes unavailable/offline trucks from assignment', async () => {
    const result = await generateProposedDispatch(mockBins, mockTrucks);
    const offlineTruck = result.assignedTrucks.find((t) => t.id === 'TRUCK-OFFLINE-2');
    // Offline truck should not have any assigned bins
    expect(offlineTruck).toBeUndefined();
  });

  it('strictly respects vehicle capacity limits', async () => {
    const result = await generateProposedDispatch(mockBins, mockTrucks);
    const activeTruck = result.assignedTrucks.find((t) => t.id === 'TRUCK-ACTIVE-1');

    expect(activeTruck).toBeDefined();
    // Capacity is 500kg. It should not exceed 500kg
    expect(activeTruck!.currentLoadKg).toBeLessThanOrEqual(activeTruck!.capacityKg);
  });

  it('enforces mutex assignment (a bin is never assigned to two trucks)', async () => {
    const multiTrucks: TruckRecord[] = [
      { ...mockTrucks[0], id: 'T1', capacityKg: 2000 },
      { ...mockTrucks[0], id: 'T2', capacityKg: 2000 },
    ];

    const result = await generateProposedDispatch(mockBins, multiTrucks);

    const allAssigned = result.assignedTrucks.flatMap((t) => t.assignedBinIds);
    const uniqueAssigned = new Set(allAssigned);

    expect(allAssigned.length).toBe(uniqueAssigned.size);
  });

  it('prioritizes critical and high risk bins first', async () => {
    const smallTruck: TruckRecord[] = [
      { ...mockTrucks[0], id: 'T-SMALL', capacityKg: 450 }, // can only take BIN-CRIT-1 (400kg)
    ];

    const result = await generateProposedDispatch(mockBins, smallTruck);
    const assigned = result.assignedTrucks[0].assignedBinIds;

    // Critical bin should be chosen first
    expect(assigned).toContain('BIN-CRIT-1');
    expect(assigned).not.toContain('BIN-LOW-3');
  });
});
