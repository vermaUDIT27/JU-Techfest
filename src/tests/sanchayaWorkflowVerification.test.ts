import { describe, it, expect } from 'vitest';
import { 
  getBinThresholdStatus, 
  getRiskCategory, 
  calculateOverviewMetrics, 
  INITIAL_PUNE_BINS, 
  PUNE_DEMO_SCENARIO_BINS, 
  DEMO_SCENARIO_METADATA 
} from '../data/puneBins';
import { DEFAULT_DEMO_THRESHOLDS, BinRecord, TruckRecord } from '../types';
import { getRoadRoute, generateRoadSnappedFallback, haversineDistanceKm } from '../services/routingService';
import { recordCollectionService } from '../services/simulationEngine';
import { generateProposedDispatch } from '../services/dispatchEngine';

describe('SANCHAYA Workflow Verification — Role Layouts, Bin Inventory, Thresholds & Driver Routes', () => {
  describe('Priority 1 & 4 — Configurable Fill Thresholds & Metric Calculations', () => {
    it('correctly categorizes fill levels according to prototype thresholds: Normal <70%, High 70-84%, Critical 85-99%, Full 100%', () => {
      // Normal: < 70%
      expect(getBinThresholdStatus(0)).toBe('normal');
      expect(getBinThresholdStatus(45)).toBe('normal');
      expect(getBinThresholdStatus(69)).toBe('normal');

      // High: 70–84%
      expect(getBinThresholdStatus(70)).toBe('high');
      expect(getBinThresholdStatus(78)).toBe('high');
      expect(getBinThresholdStatus(84)).toBe('high');

      // Critical: 85–99%
      expect(getBinThresholdStatus(85)).toBe('critical');
      expect(getBinThresholdStatus(92)).toBe('critical');
      expect(getBinThresholdStatus(99)).toBe('critical');

      // Full: 100%
      expect(getBinThresholdStatus(100)).toBe('full');
    });

    it('calculates all dashboard counts from the same coherent inventory without fabricating sensor data', () => {
      const metrics = calculateOverviewMetrics(INITIAL_PUNE_BINS);

      expect(metrics.totalBins).toBe(INITIAL_PUNE_BINS.length);
      // Sum of thresholds must equal total bins
      const sumOfBuckets = metrics.normalBins + metrics.highBins + metrics.criticalBins + metrics.fullBins;
      expect(sumOfBuckets).toBe(metrics.totalBins);

      // Verify presence of full and critical bins
      expect(metrics.fullBins).toBeGreaterThanOrEqual(1);
      expect(metrics.criticalBins).toBeGreaterThanOrEqual(1);
      expect(metrics.highBins).toBeGreaterThanOrEqual(1);
      expect(metrics.normalBins).toBeGreaterThanOrEqual(1);

      // Critical awaiting collection must be <= (criticalBins + fullBins)
      expect(metrics.criticalAwaitingCollection).toBeLessThanOrEqual(metrics.criticalBins + metrics.fullBins);

      // Location unavailable count must reflect unmapped nodes
      expect(metrics.locationUnavailableCount).toBeGreaterThanOrEqual(2);
      expect(metrics.staleOrUnavailableBins).toBeGreaterThanOrEqual(metrics.locationUnavailableCount);
    });
  });

  describe('Priority 2 — Coherent Bin Inventory & Unmapped Nodes', () => {
    it('ensures every bin in the demo scenario dataset has all required operational fields', () => {
      INITIAL_PUNE_BINS.forEach((bin) => {
        // Stable unique ID
        expect(bin.id).toBeDefined();
        expect(bin.id.startsWith('WW-PUN-')).toBe(true);

        // Code & Name
        expect(bin.code).toBeDefined();
        expect(bin.name).toBeDefined();

        // Ward ID & Colony
        expect(bin.wardId).toBeDefined();

        // Reading source (simulated, sensor, or manual)
        expect(['simulated', 'sensor', 'manual']).toContain(bin.readingSource);

        // Fill level 0 - 100
        expect(bin.currentFillPercent).toBeGreaterThanOrEqual(0);
        expect(bin.currentFillPercent).toBeLessThanOrEqual(100);

        // Status derived from thresholds
        expect(['normal', 'high', 'critical', 'full']).toContain(bin.fillThresholdStatus);

        // Last collection time & timestamp
        expect(bin.lastCollectionTime).toBeDefined();

        // Collection history array
        expect(Array.isArray(bin.collectionHistory)).toBe(true);
      });
    });

    it('explicitly flags unmapped bins with locationUnavailable: true and does not assign fake GPS coordinates', () => {
      const unmapped = INITIAL_PUNE_BINS.filter((b) => b.locationUnavailable);
      expect(unmapped.length).toBeGreaterThanOrEqual(2);

      unmapped.forEach((b) => {
        expect(b.locationUnavailable).toBe(true);
        // Lat/lng must be 0,0 or null, never fake coordinates pretending to be surveyed
        expect(b.location.lat === 0 && b.location.lng === 0).toBe(true);
      });
    });

    it('separates the demo scenario dataset from source-reported PMC macro statistics', () => {
      expect(DEMO_SCENARIO_METADATA.isSimulated).toBe(true);
      expect(DEMO_SCENARIO_METADATA.notice).toContain('does not contain verified GPS coordinates');
      expect(INITIAL_PUNE_BINS.every((b) => b.isSimulated)).toBe(true);
    });
  });

  describe('Priority 5 & 6 — Driver Collection Workflow & Persistence', () => {
    it('records collection and appends to bin collectionHistory without arbitrary resets', () => {
      const testTruck: TruckRecord = {
        id: 'MH-12-PMC-4821',
        name: 'Hadapsar Heavy Tipper',
        driverName: 'Rajesh Sharma',
        driverPhone: '9829014821',
        capacityKg: 5000,
        currentLoadKg: 0,
        status: 'Available',
        depotName: 'Hadapsar Depot',
        depotCoords: { lat: 18.5089, lng: 73.9259 },
        currentCoords: { lat: 18.5089, lng: 73.9259 },
        headingDegrees: 0,
        assignedBinIds: ['WW-PUN-01'],
        completedBinIds: [],
        color: '#D97706',
        progressPercent: 0,
        currentSegmentIndex: 0,
      };

      const testBin: BinRecord = {
        ...INITIAL_PUNE_BINS[1], // WW-PUN-01
        collectionStatus: 'assigned',
        assignedTruckId: 'MH-12-PMC-4821',
        collectionHistory: [],
      };

      const result = recordCollectionService(testBin.id, testTruck.id, [testTruck], [testBin], 'collected');

      expect(result.isDuplicate).toBeFalsy();
      const updatedBin = result.updatedBins.find((b) => b.id === testBin.id)!;
      expect(updatedBin.collectionStatus).toBe('collected');
      expect(updatedBin.collectionHistory!.length).toBe(1);
      expect(updatedBin.collectionHistory![0].result).toBe('collected');
      expect(updatedBin.collectionHistory![0].truckId).toBe(testTruck.id);
      expect(updatedBin.collectionHistory![0].weightKg).toBe(testBin.estimatedKg);

      const updatedTruck = result.updatedTrucks.find((t) => t.id === testTruck.id)!;
      expect(updatedTruck.completedBinIds).toContain(testBin.id);
      expect(updatedTruck.currentLoadKg).toBe(testBin.estimatedKg);
    });

    it('rejects duplicate collection submissions idempotently without double-counting payload', () => {
      const testTruck: TruckRecord = {
        id: 'MH-12-PMC-4821',
        name: 'Hadapsar Heavy Tipper',
        driverName: 'Rajesh Sharma',
        driverPhone: '9829014821',
        capacityKg: 5000,
        currentLoadKg: 820,
        status: 'Available',
        depotName: 'Hadapsar Depot',
        depotCoords: { lat: 18.5089, lng: 73.9259 },
        currentCoords: { lat: 18.5089, lng: 73.9259 },
        headingDegrees: 0,
        assignedBinIds: ['WW-PUN-01'],
        completedBinIds: ['WW-PUN-01'], // ALREADY COMPLETED
        color: '#D97706',
        progressPercent: 100,
        currentSegmentIndex: 0,
      };

      const testBin: BinRecord = {
        ...INITIAL_PUNE_BINS[1],
        collectionStatus: 'collected', // ALREADY COLLECTED
        assignedTruckId: 'MH-12-PMC-4821',
      };

      const result = recordCollectionService(testBin.id, testTruck.id, [testTruck], [testBin], 'collected');

      // Must be flagged as duplicate
      expect(result.isDuplicate).toBe(true);
      expect(result.event.weightKg).toBe(0);
      const updatedTruck = result.updatedTrucks.find((t) => t.id === testTruck.id)!;
      // Load must remain exactly 820 kg (NOT inflated to 1640 kg)
      expect(updatedTruck.currentLoadKg).toBe(820);
    });
  });

  describe('Priority 5 — Routing Service Resilience & Road-Graph Fallback', () => {
    it('provides road-snapped fallback geometry along Pune arterial corridors when network API is unavailable', () => {
      const waypoints = [
        { lat: 18.5196, lng: 73.8553 }, // Shaniwar Wada
        { lat: 18.5132, lng: 73.8561 }, // Mandai Market
        { lat: 18.5012, lng: 73.8584 }, // Swargate
      ];

      const fallback = generateRoadSnappedFallback(waypoints);

      expect(fallback.isFallback).toBe(true);
      expect(fallback.distanceKm).toBeGreaterThan(0);
      expect(fallback.durationMinutes).toBeGreaterThan(0);
      expect(fallback.coordinates.length).toBeGreaterThanOrEqual(3);
      expect(fallback.statusMessage).toContain('Pune arterial road corridors');
    });

    it('excludes locationUnavailable (unmapped) bins from GPS waypoints during dispatch planning', async () => {
      const testTrucks: TruckRecord[] = [
        {
          id: 'TRK-TEST-01',
          name: 'Pune Compactor 1',
          driverName: 'Sanjay Jadhav',
          driverPhone: '9822011111',
          capacityKg: 5000,
          currentLoadKg: 0,
          status: 'Available',
          depotName: 'Hadapsar Depot',
          depotCoords: { lat: 18.5089, lng: 73.9259 },
          currentCoords: { lat: 18.5089, lng: 73.9259 },
          headingDegrees: 0,
          assignedBinIds: [],
          completedBinIds: [],
          color: '#D97706',
          progressPercent: 0,
          currentSegmentIndex: 0,
        },
      ];

      // Mixed bins: one mapped and one unmapped
      const testBins: BinRecord[] = [
        INITIAL_PUNE_BINS[0], // WW-PUN-00 (mapped)
        INITIAL_PUNE_BINS[13], // WW-PUN-14 (locationUnavailable: true)
      ];

      const plan = await generateProposedDispatch(testBins, testTrucks);
      expect(plan.assignedTrucks.length).toBe(1);
      const assignedRoute = plan.assignedTrucks[0].assignedRoute;

      if (assignedRoute) {
        // Road geometry must not contain (0,0) coordinates
        assignedRoute.roadGeometry.forEach(([lat, lng]) => {
          expect(lat).toBeGreaterThan(18.0);
          expect(lng).toBeGreaterThan(73.0);
        });
      }
    });
  });
});
