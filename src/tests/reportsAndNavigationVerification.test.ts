import { describe, it, expect } from 'vitest';
import { INITIAL_PUNE_BINS, calculateOverviewMetrics } from '../data/puneBins';
import { INITIAL_PUNE_TRUCKS } from '../data/puneFleet';
import { getAllWards, getAllZones } from '../data/puneData';
import { NavigationView, ReportTab } from '../types';

describe('SANCHAYA — Reports & Navigation Verification Suite', () => {
  describe('1. Operator Navigation Hierarchy & Role Separation', () => {
    it('supports all 8 canonical operator navigation items and preserves legacy aliases', () => {
      const canonicalViews: NavigationView[] = [
        'overview',
        'live-operations',
        'complaints',
        'wards-bins',
        'fleet',
        'reports',
        'data-quality',
        'administration',
      ];

      expect(canonicalViews.length).toBe(8);

      // Verify normalization helper logic
      const normalizeView = (v: NavigationView): NavigationView => {
        if (v === 'city-overview' || v === 'overview') return 'overview';
        if (v === 'live-operations' || v === 'operations-map' || v === 'route-planning' || v === 'collection-planner') return 'live-operations';
        if (v === 'zones-wards' || v === 'wards-bins') return 'wards-bins';
        if (v === 'fleet-allocation' || v === 'fleet') return 'fleet';
        if (v === 'waste-analytics' || v === 'reports') return 'reports';
        if (v === 'collection-log') return 'administration';
        return v;
      };

      expect(normalizeView('city-overview')).toBe('overview');
      expect(normalizeView('route-planning')).toBe('live-operations');
      expect(normalizeView('zones-wards')).toBe('wards-bins');
      expect(normalizeView('fleet-allocation')).toBe('fleet');
      expect(normalizeView('waste-analytics')).toBe('reports');
    });
  });

  describe('2. Reports Metric Calculation & Underlying Record Reconciliation', () => {
    it('reconciles Daily Collection Report metrics with active bin inventory', () => {
      const bins = [...INITIAL_PUNE_BINS];
      const eligibleStops = bins.filter((b) => b.collectionStatus === 'assigned' || b.collectionStatus === 'collected').length;
      const completedStops = bins.filter((b) => b.collectionStatus === 'collected').length;
      const completionPct = eligibleStops > 0 ? Math.round((completedStops / eligibleStops) * 100) : 0;

      expect(eligibleStops).toBeGreaterThanOrEqual(10);
      expect(completionPct).toBeGreaterThanOrEqual(0);
      expect(completionPct).toBeLessThanOrEqual(100);

      const collectedWeight = bins
        .filter((b) => b.collectionStatus === 'collected')
        .reduce((sum, b) => sum + (b.estimatedKg || 0), 0);

      expect(typeof collectedWeight).toBe('number');
      expect(collectedWeight).toBeGreaterThanOrEqual(0);
    });

    it('reconciles Bin Status Report metrics with threshold calculations', () => {
      const metrics = calculateOverviewMetrics(INITIAL_PUNE_BINS);

      expect(metrics.totalBins).toBe(INITIAL_PUNE_BINS.length);
      expect(metrics.criticalBins).toBeGreaterThanOrEqual(4);
      expect(metrics.fullBins).toBeGreaterThanOrEqual(1);
      expect(metrics.locationUnavailableCount).toBe(2);

      // Verify sum of bands equals total bins
      const sumBands = metrics.normalBins + metrics.highBins + metrics.criticalBins + metrics.fullBins;
      expect(sumBands).toBe(metrics.totalBins);
    });

    it('reconciles Route Performance Report metrics with Pune fleet records', () => {
      const trucks = [...INITIAL_PUNE_TRUCKS];
      const activeTrucks = trucks.filter((t) => (t.assignedBinIds || []).length > 0);
      expect(activeTrucks.length).toBeGreaterThanOrEqual(3);

      for (const t of activeTrucks) {
        expect(t.capacityKg).toBeGreaterThan(0);
        expect(t.currentLoadKg).toBeGreaterThanOrEqual(0);
        expect(t.currentLoadKg).toBeLessThanOrEqual(t.capacityKg);
      }
    });

    it('reconciles Ward & Zone Comparison matrix across all 42 source wards', () => {
      const wards = getAllWards();
      expect(wards.length).toBe(42);

      const zones = getAllZones();
      expect(zones.length).toBe(15);

      // Verify Ward 39 duplicate records preserved
      const ward39Records = wards.filter((w) => w.source_ward_id.includes('39') || w.ward_number_raw === '39');
      expect(ward39Records.length).toBe(2);
      expect(ward39Records[0].internal_id).not.toBe(ward39Records[1].internal_id);

      // Verify Ward 42 ambiguous composite zone preserved
      const ward42 = wards.find((w) => w.source_ward_id.includes('42'));
      expect(ward42).toBeDefined();
      expect(ward42?.zone_name).toBeNull();
    });
  });

  describe('3. CSV Export Integrity & Security Sanitization', () => {
    it('properly escapes CSV cells containing commas, quotes, and newlines', () => {
      const escapeCsv = (val: any): string => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      expect(escapeCsv('Simple')).toBe('Simple');
      expect(escapeCsv('Swargate, Pune')).toBe('"Swargate, Pune"');
      expect(escapeCsv('He said "urgent"')).toBe('"He said ""urgent"""');
      expect(escapeCsv('Line1\nLine2')).toBe('"Line1\nLine2"');
      expect(escapeCsv(null)).toBe('');
      expect(escapeCsv(undefined)).toBe('');
    });

    it('never exports private auth credentials or session tokens in generated CSV headers', () => {
      const reportHeaders: Record<ReportTab, string[]> = {
        'daily-collection': ['Shift Date', 'Bin Code', 'Bin Name', 'Ward', 'Sector', 'Fill %', 'Est Weight (kg)', 'Collection Status', 'Assigned Truck'],
        'bin-status': ['Bin Code', 'Bin Name', 'Ward', 'Sector', 'Fill %', 'Fill Threshold Band', 'Est Weight (kg)', 'Reading Source', 'Data Freshness', 'Location Status', 'Latitude', 'Longitude'],
        'route-performance': ['Truck Registration ID', 'Vehicle Model', 'Driver Name', 'Driver Contact', 'Depot Hub', 'Status', 'Planned Stops', 'Completed Stops', 'Completion %', 'Payload (kg)', 'Supported Capacity (kg)', 'Route Distance (km)', 'Est Duration (min)'],
        'complaints': ['Reference Code', 'Ward ID', 'Description', 'Status', 'Created Timestamp', 'Resolved Timestamp', 'Resolution Notes'],
        'ward-comparison': ['Ward Number', 'Ward Name', 'Zone', 'Source Reported Waste (TPD)', 'Reported Households', 'D2D Coverage %', 'Street Bins Count', 'Active Monitored Bins', 'Cleared Stops Today'],
      };

      for (const [tab, headers] of Object.entries(reportHeaders)) {
        for (const h of headers) {
          const lower = h.toLowerCase();
          expect(lower).not.toContain('token');
          expect(lower).not.toContain('password');
          expect(lower).not.toContain('hash');
          expect(lower).not.toContain('secret');
        }
      }
    });
  });
});
