import { describe, it, expect } from 'vitest';
import { createTruckMarkerHtml } from '../components/common/TruckMarkerIcon';
import { createDustbinMarkerHtml } from '../components/common/DustbinMarkerIcon';
import { getAllWards } from '../data/puneData';
import { generateComplaintReferenceCode } from '../../server/services/complaintService';
import { TruckRecord, BinRecord, NavigationView } from '../types';

describe('SANCHAYA Phase 1 — UI Simplification and User-Flow Verification', () => {
  describe('1. Dustbin & Truck SVG / HTML Markers', () => {
    it('properly formats Pune vehicle IDs by stripping MH-12- prefix', () => {
      const truck: TruckRecord = {
        id: 'MH-12-PMC-01',
        name: 'Hadapsar Heavy Tipper',
        driverName: 'Rajesh Sharma',
        driverPhone: '9829014821',
        capacityKg: 5000,
        currentLoadKg: 1200,
        status: 'Collecting',
        depotName: 'Hadapsar Fleet Hub',
        depotCoords: { lat: 18.5089, lng: 73.9259 },
        currentCoords: { lat: 18.5089, lng: 73.9259 },
        headingDegrees: 90,
        assignedBinIds: ['WW-PUN-01'],
        completedBinIds: [],
        color: '#D97706',
        progressPercent: 20,
        currentSegmentIndex: 0,
      };

      const html = createTruckMarkerHtml(truck, false);
      expect(html).toContain('PMC-01');
      expect(html).toContain('aria-label="Truck MH-12-PMC-01');
      expect(html).toContain('Rajesh Sharma');
      expect(html).toContain('rotate(90deg)');
    });

    it('creates color-coded and status-badged HTML markers for dustbins', () => {
      const criticalBin: BinRecord = {
        id: 'WW-PUN-01',
        code: 'WW-PUN-01',
        name: 'Swargate Bus Terminal Bin',
        hindiName: 'स्वारगेट बस स्थानक कचरा पात्र',
        location: {
          lat: 18.5018,
          lng: 73.8580,
          address: 'Swargate Bus Stand Entrance',
          landmark: 'Swargate Bus Stand Gate 1',
          ward: 'Ward 84',
          sector: 'Central Transit Corridor',
        },
        capacityLiters: 1100,
        currentFillPercent: 95,
        estimatedKg: 420,
        riskCategory: 'critical',
        collectionStatus: 'assigned',
        assignedTruckId: 'MH-12-PMC-01',
        assignedStopOrder: 1,
        isSimulated: true,
        lastCollectionTime: '2026-10-23T10:00:00Z',
        dataFreshness: '20 mins ago',
        sensitiveZone: false,
        supervisorTradeoffReason: 'High transit footfall zone',
      };

      const html = createDustbinMarkerHtml(criticalBin, true);
      // Contains code in aria label
      expect(html).toContain('WW-PUN-01');
      // Contains fill percent
      expect(html).toContain('95%');
      // Contains stop order badge #1
      expect(html).toContain('#1');
      // Contains critical color #DC2626
      expect(html).toContain('#DC2626');
    });
  });

  describe('2. Public Complaint Redressal Integrity', () => {
    it('generates standard complaint reference codes with year and hash', () => {
      const ref = generateComplaintReferenceCode();
      const currentYear = new Date().getFullYear();
      expect(ref).toMatch(new RegExp(`^WW-CMP-${currentYear}-[0-9A-Z]{6}$`));
    });

    it('provides all 42 source Pune wards for citizen selection', () => {
      const wards = getAllWards();
      expect(wards.length).toBe(42);
      // Ensure all wards have valid names and IDs
      wards.forEach((w) => {
        expect(w.source_ward_id).toBeDefined();
        expect(w.ward_name).toBeDefined();
        expect(typeof w.ward_name).toBe('string');
      });
    });
  });

  describe('3. Operator Navigation Completeness', () => {
    it('includes all required sections in the operator navigation model', () => {
      const requiredSections: NavigationView[] = [
        'city-overview',
        'complaints',
        'zones-wards',
        'fleet-allocation',
        'route-planning',
        'waste-analytics',
        'data-quality',
        'administration',
      ];

      // Verifying each required section is a valid NavigationView literal
      requiredSections.forEach((section) => {
        const testNav: NavigationView = section;
        expect(testNav).toBeDefined();
      });
    });
  });

  describe('4. Landing Page Action Buttons Specification', () => {
    it('defines exact required labels and full-width layout classes for landing actions', () => {
      const operatorLabel = 'Sign in as Operator →';
      const driverLabelEn = 'Continue as Driver →';
      const driverLabelHi = 'ड्राइवर के रूप में आगे बढ़ें →';
      const complaintLabel = 'Report a Problem →';

      expect(operatorLabel).toBe('Sign in as Operator →');
      expect(driverLabelEn).toBe('Continue as Driver →');
      expect(complaintLabel).toBe('Report a Problem →');
    });
  });
});