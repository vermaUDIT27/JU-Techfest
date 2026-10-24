import { describe, it, expect, beforeEach } from 'vitest';
import { recordCollectionService } from '../services/simulationEngine';
import { manuallyReassignBin } from '../services/dispatchEngine';
import { loadSavedDemoState, sanitizeDemoRole } from '../services/storageService';
import { escapeHtml, escapeAttr } from '../utils/sanitize';
import { createDustbinMarkerHtml } from '../components/common/DustbinMarkerIcon';
import { createTruckMarkerHtml } from '../components/common/TruckMarkerIcon';
import { BinRecord, TruckRecord } from '../types';

describe('WasteWise Security Remediation — Phase 1 & 1.1 Verification Suite', () => {
  beforeEach(() => {
    // In-memory localStorage polyfill for isolated Node test environment
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); }
    };
  });

  describe('A. Role & Storage Controls Verification (SEC-01 & SEC-02)', () => {
    it('sanitizes unexpected or hostile role strings and defaults to ward_supervisor', () => {
      expect(sanitizeDemoRole('super_admin')).toBe('ward_supervisor');
      expect(sanitizeDemoRole('root')).toBe('ward_supervisor');
      expect(sanitizeDemoRole(null)).toBe('ward_supervisor');
      expect(sanitizeDemoRole(undefined)).toBe('ward_supervisor');
      expect(sanitizeDemoRole(12345)).toBe('ward_supervisor');
      expect(sanitizeDemoRole({ role: 'admin' })).toBe('ward_supervisor');

      // Valid demo roles pass through
      expect(sanitizeDemoRole('ward_supervisor')).toBe('ward_supervisor');
      expect(sanitizeDemoRole('municipal_head')).toBe('municipal_head');
      expect(sanitizeDemoRole('driver')).toBe('driver');
    });

    it('rejects corrupt stored state containing negative capacities or negative loads', () => {
      // Manipulated state with negative capacity
      const corruptState = {
        bins: [
          {
            id: 'B1',
            code: 'WW-01',
            name: 'Corrupt Bin',
            capacityLiters: -100, // Negative capacity
            currentFillPercent: 50,
            estimatedKg: 200,
            riskCategory: 'medium',
            collectionStatus: 'unassigned',
          }
        ],
        trucks: [
          {
            id: 'TRUCK-1',
            name: 'Tipper',
            driverName: 'Driver',
            capacityKg: -500, // Negative capacity
            currentLoadKg: -100, // Negative load
            completedBinIds: [],
            assignedBinIds: [],
          }
        ],
        events: [],
        activeRole: 'ward_supervisor',
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('wastewise_jaipur_demo_v2', JSON.stringify(corruptState));

      // Verified: Corrupted state is rejected (returns null) instead of silently normalized
      const loaded = loadSavedDemoState();
      expect(loaded).toBeNull();
    });

    it('loads valid state with isUnauthenticatedDemo marker and role allowlist', () => {
      const validState = {
        bins: [
          {
            id: 'B1',
            code: 'WW-01',
            name: 'Valid Bin',
            capacityLiters: 1100,
            currentFillPercent: 50,
            estimatedKg: 200,
            riskCategory: 'medium',
            collectionStatus: 'unassigned',
          }
        ],
        trucks: [
          {
            id: 'TRUCK-1',
            name: 'Tipper',
            driverName: 'Driver',
            capacityKg: 1000,
            currentLoadKg: 200,
            completedBinIds: [],
            assignedBinIds: ['B1'],
          }
        ],
        events: [],
        activeRole: 'driver',
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('wastewise_jaipur_demo_v2', JSON.stringify(validState));
      const loaded = loadSavedDemoState();
      expect(loaded).not.toBeNull();
      expect(loaded?.activeRole).toBe('driver');
      expect(loaded?.isUnauthenticatedDemo).toBe(true);
    });
  });

  describe('B. Collection & Dispatch Integrity Verification (SEC-04 & SEC-05)', () => {
    it('verifies repeated collections keep weight, load, and event counts consistent (Idempotency)', () => {
      const bin: BinRecord = {
        id: 'BIN-IDEMP-1',
        code: 'WW-01',
        name: 'Idempotent Bin',
        hindiName: '',
        location: { lat: 26.8, lng: 75.8, address: '', hindiAddress: '', landmark: '', ward: '', sector: '' },
        capacityLiters: 1100,
        currentFillPercent: 90,
        estimatedKg: 400,
        riskCategory: 'critical',
        collectionStatus: 'assigned',
        lastCollectionTime: '',
        dataFreshness: '2 mins ago',
        isSimulated: true,
        sensitiveZone: false,
        supervisorTradeoffReason: '',
      };

      const truck: TruckRecord = {
        id: 'TRUCK-1',
        name: 'Tipper 1',
        driverName: 'Driver A',
        driverPhone: '',
        capacityKg: 1000,
        currentLoadKg: 0,
        status: 'Assigned',
        depotName: '',
        depotCoords: { lat: 26.8, lng: 75.8 },
        currentCoords: { lat: 26.8, lng: 75.8 },
        headingDegrees: 0,
        assignedBinIds: ['BIN-IDEMP-1'],
        completedBinIds: [],
        color: '#B04F34',
        progressPercent: 0,
        currentSegmentIndex: 0,
      };

      // Initial collection call: load goes from 0 -> 400 kg
      const firstCall = recordCollectionService('BIN-IDEMP-1', 'TRUCK-1', [truck], [bin], 'collected');
      expect(firstCall.updatedTrucks[0].currentLoadKg).toBe(400);
      expect(firstCall.updatedBins[0].collectionStatus).toBe('collected');
      expect(firstCall.event.weightKg).toBe(400);
      expect(firstCall.isDuplicate).toBeFalsy();

      // Repeated collection call (e.g. repeated button tap or network replay)
      const secondCall = recordCollectionService('BIN-IDEMP-1', 'TRUCK-1', firstCall.updatedTrucks, firstCall.updatedBins, 'collected');
      
      // Verified: Total weight collected does not increase (remains 400 kg)
      expect(secondCall.updatedTrucks[0].currentLoadKg).toBe(400);
      expect(secondCall.event.weightKg).toBe(0);
      // Verified: Flagged as duplicate so application event log is NOT inflated
      expect(secondCall.isDuplicate).toBe(true);
    });

    it('demonstrates concurrency limitation: parallel calls against stale state require server-side locking', () => {
      const bin: BinRecord = {
        id: 'BIN-RACE',
        code: 'WW-RACE',
        name: 'Race Bin',
        hindiName: '',
        location: { lat: 26.8, lng: 75.8, address: '', hindiAddress: '', landmark: '', ward: '', sector: '' },
        capacityLiters: 1100,
        currentFillPercent: 90,
        estimatedKg: 350,
        riskCategory: 'critical',
        collectionStatus: 'unassigned',
        lastCollectionTime: '',
        dataFreshness: '',
        isSimulated: true,
        sensitiveZone: false,
        supervisorTradeoffReason: '',
      };

      const truckA: TruckRecord = {
        id: 'TRUCK-A',
        name: 'Truck A',
        driverName: 'Driver A',
        driverPhone: '',
        capacityKg: 1000,
        currentLoadKg: 0,
        status: 'Available',
        depotName: '',
        depotCoords: { lat: 26.8, lng: 75.8 },
        currentCoords: { lat: 26.8, lng: 75.8 },
        headingDegrees: 0,
        assignedBinIds: [],
        completedBinIds: [],
        color: '#B04F34',
        progressPercent: 0,
        currentSegmentIndex: 0,
      };

      const truckB: TruckRecord = { ...truckA, id: 'TRUCK-B', name: 'Truck B' };

      // Simulate concurrent requests against stale state snapshot
      const concurrentCallA = recordCollectionService('BIN-RACE', 'TRUCK-A', [truckA, truckB], [bin], 'collected');
      const concurrentCallB = recordCollectionService('BIN-RACE', 'TRUCK-B', [truckA, truckB], [bin], 'collected');

      // In client-only architecture without transactional DB mutexes, both calls succeed on stale state
      expect(concurrentCallA.updatedTrucks[0].currentLoadKg).toBe(350);
      expect(concurrentCallB.updatedTrucks[1].currentLoadKg).toBe(350);
      // Proves that server-side atomic locking (Phase 2) is strictly necessary to prevent double-collection race conditions
    });

    it('rejects manual reassignment to offline vehicles and vehicles exceeding payload capacity', () => {
      const bin: BinRecord = {
        id: 'BIN-HEAVY',
        code: 'WW-HEAVY',
        name: 'Heavy Bin',
        hindiName: '',
        location: { lat: 26.8, lng: 75.8, address: '', hindiAddress: '', landmark: '', ward: '', sector: '' },
        capacityLiters: 5000,
        currentFillPercent: 95,
        estimatedKg: 3000,
        riskCategory: 'critical',
        collectionStatus: 'unassigned',
        lastCollectionTime: '',
        dataFreshness: '',
        isSimulated: true,
        sensitiveZone: false,
        supervisorTradeoffReason: '',
      };

      const offlineTruck: TruckRecord = {
        id: 'TRUCK-OFFLINE',
        name: 'Broken Tipper',
        driverName: 'Driver Inactive',
        driverPhone: '',
        capacityKg: 1000,
        currentLoadKg: 500,
        status: 'Offline',
        depotName: '',
        depotCoords: { lat: 26.8, lng: 75.8 },
        currentCoords: { lat: 26.8, lng: 75.8 },
        headingDegrees: 0,
        assignedBinIds: [],
        completedBinIds: [],
        color: '#9CA3AF',
        progressPercent: 0,
        currentSegmentIndex: 0,
      };

      // 1. Reassign to Offline truck is rejected
      const offlineResult = manuallyReassignBin('BIN-HEAVY', 'TRUCK-OFFLINE', [offlineTruck], [bin]);
      expect(offlineResult.error).toContain('Offline');
      expect(offlineResult.updatedTrucks[0].status).toBe('Offline');

      // 2. Reassign to truck exceeding capacity is rejected
      const smallTruck: TruckRecord = {
        ...offlineTruck,
        id: 'TRUCK-SMALL',
        status: 'Available',
        capacityKg: 1500,
        currentLoadKg: 0,
      };
      const capacityResult = manuallyReassignBin('BIN-HEAVY', 'TRUCK-SMALL', [smallTruck], [bin]);
      expect(capacityResult.error).toContain('exceeds vehicle capacity');
      expect(capacityResult.updatedTrucks[0].currentLoadKg).toBe(0);
    });

    it('rejects negative payloads and non-positive truck capacities in reassignment and collection', () => {
      const negativeBin: BinRecord = {
        id: 'BIN-NEG',
        code: 'WW-NEG',
        name: 'Negative Payload Bin',
        hindiName: '',
        location: { lat: 26.8, lng: 75.8, address: '', hindiAddress: '', landmark: '', ward: '', sector: '' },
        capacityLiters: 1000,
        currentFillPercent: 50,
        estimatedKg: -500, // Invalid negative payload
        riskCategory: 'medium',
        collectionStatus: 'unassigned',
        lastCollectionTime: '',
        dataFreshness: '',
        isSimulated: true,
        sensitiveZone: false,
        supervisorTradeoffReason: '',
      };

      const normalTruck: TruckRecord = {
        id: 'TRUCK-1',
        name: 'Normal Tipper',
        driverName: 'Driver',
        driverPhone: '',
        capacityKg: 1000,
        currentLoadKg: 100,
        status: 'Available',
        depotName: '',
        depotCoords: { lat: 26.8, lng: 75.8 },
        currentCoords: { lat: 26.8, lng: 75.8 },
        headingDegrees: 0,
        assignedBinIds: [],
        completedBinIds: [],
        color: '#B04F34',
        progressPercent: 0,
        currentSegmentIndex: 0,
      };

      // Negative payload bin reassignment is rejected
      const reassignResult = manuallyReassignBin('BIN-NEG', 'TRUCK-1', [normalTruck], [negativeBin]);
      expect(reassignResult.error).toContain('Invalid negative or non-finite payload');
      expect(reassignResult.updatedTrucks[0].currentLoadKg).toBe(100);

      // Negative payload collection is rejected
      const collectionResult = recordCollectionService('BIN-NEG', 'TRUCK-1', [normalTruck], [negativeBin], 'collected');
      expect(collectionResult.error).toContain('Invalid negative bin payload');
      expect(collectionResult.updatedTrucks[0].currentLoadKg).toBe(100);
    });

    it('resolves reassignment conflicts across trucks cleanly (Mutex Transfer)', () => {
      const bin: BinRecord = {
        id: 'BIN-MUTEX',
        code: 'WW-MUTEX',
        name: 'Moving Bin',
        hindiName: '',
        location: { lat: 26.8, lng: 75.8, address: '', hindiAddress: '', landmark: '', ward: '', sector: '' },
        capacityLiters: 1000,
        currentFillPercent: 60,
        estimatedKg: 300,
        riskCategory: 'medium',
        collectionStatus: 'assigned',
        assignedTruckId: 'TRUCK-1',
        lastCollectionTime: '',
        dataFreshness: '',
        isSimulated: true,
        sensitiveZone: false,
        supervisorTradeoffReason: '',
      };

      const truck1: TruckRecord = {
        id: 'TRUCK-1',
        name: 'Truck 1',
        driverName: 'Driver 1',
        driverPhone: '',
        capacityKg: 1000,
        currentLoadKg: 300,
        status: 'Assigned',
        depotName: '',
        depotCoords: { lat: 26.8, lng: 75.8 },
        currentCoords: { lat: 26.8, lng: 75.8 },
        headingDegrees: 0,
        assignedBinIds: ['BIN-MUTEX'],
        completedBinIds: [],
        color: '#B04F34',
        progressPercent: 0,
        currentSegmentIndex: 0,
      };

      const truck2: TruckRecord = {
        id: 'TRUCK-2',
        name: 'Truck 2',
        driverName: 'Driver 2',
        driverPhone: '',
        capacityKg: 1000,
        currentLoadKg: 100,
        status: 'Available',
        depotName: '',
        depotCoords: { lat: 26.8, lng: 75.8 },
        currentCoords: { lat: 26.8, lng: 75.8 },
        headingDegrees: 0,
        assignedBinIds: [],
        completedBinIds: [],
        color: '#2563EB',
        progressPercent: 0,
        currentSegmentIndex: 0,
      };

      // Reassign BIN-MUTEX from TRUCK-1 to TRUCK-2
      const result = manuallyReassignBin('BIN-MUTEX', 'TRUCK-2', [truck1, truck2], [bin]);
      const updatedT1 = result.updatedTrucks.find((t) => t.id === 'TRUCK-1');
      const updatedT2 = result.updatedTrucks.find((t) => t.id === 'TRUCK-2');
      const updatedBin = result.updatedBins.find((b) => b.id === 'BIN-MUTEX');

      // Truck 1: Bin removed, payload decremented (300 -> 0 kg)
      expect(updatedT1?.assignedBinIds).not.toContain('BIN-MUTEX');
      expect(updatedT1?.currentLoadKg).toBe(0);

      // Truck 2: Bin added, payload incremented (100 + 300 = 400 kg)
      expect(updatedT2?.assignedBinIds).toContain('BIN-MUTEX');
      expect(updatedT2?.currentLoadKg).toBe(400);

      // Bin record: assignedTruckId updated to TRUCK-2
      expect(updatedBin?.assignedTruckId).toBe('TRUCK-2');
    });
  });

  describe('C. DOM & Leaflet XSS Sanitization Verification (SEC-06)', () => {
    it('escapes special HTML characters in strings and attributes', () => {
      const scriptPayload = "<script>alert('xss')</script>";
      expect(escapeHtml(scriptPayload)).toBe("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");

      const imgPayload = '<img src=x onerror=alert(1)>';
      expect(escapeAttr(imgPayload)).toBe("&lt;img src=x onerror=alert(1)&gt;");

      const quoteBreak = '" onfocus="alert(1)" autofocus="';
      expect(escapeAttr(quoteBreak)).toBe("&quot; onfocus=&quot;alert(1)&quot; autofocus=&quot;");
    });

    it('neutralizes hostile payloads in dustbin markers', () => {
      const hostileBin: BinRecord = {
        id: 'BIN-HOSTILE',
        code: 'WW-<script>alert("code")</script>',
        name: 'Hostile Bin <img src=x onerror=alert("name")>',
        hindiName: '<b onmouseover=alert("hi")>Hindi</b>',
        location: { lat: 26.8, lng: 75.8, address: '', hindiAddress: '', landmark: '', ward: '', sector: '' },
        capacityLiters: 1100,
        currentFillPercent: 85,
        estimatedKg: 350,
        riskCategory: 'high',
        collectionStatus: 'unassigned',
        lastCollectionTime: '',
        dataFreshness: '',
        isSimulated: true,
        sensitiveZone: false,
        supervisorTradeoffReason: '',
      };

      const html = createDustbinMarkerHtml(hostileBin);
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;img src=x');
    });

    it('neutralizes hostile payloads in truck markers and enforces hex color validation', () => {
      const hostileTruck: TruckRecord = {
        id: 'TRUCK-<script>alert("id")</script>',
        name: 'Tipper',
        driverName: 'Attacker " onclick=alert("driver")',
        driverPhone: '',
        capacityKg: 1000,
        currentLoadKg: 0,
        status: 'Available',
        depotName: '',
        depotCoords: { lat: 26.8, lng: 75.8 },
        currentCoords: { lat: 26.8, lng: 75.8 },
        headingDegrees: 0,
        assignedBinIds: [],
        completedBinIds: [],
        color: 'red; background-image: url("evil.com")', // Malicious CSS color injection
        progressPercent: 0,
        currentSegmentIndex: 0,
      };

      const html = createTruckMarkerHtml(hostileTruck);
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('evil.com');
      // Hex validation fell back to default #B04F34
      expect(html).toContain('#B04F34');
      expect(html).not.toContain('" onclick=alert');
    });
  });
});
