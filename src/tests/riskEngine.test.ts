import { describe, it, expect } from 'vitest';
import { getRiskCategory, getRiskColor, calculateBinPriorityScore, RISK_COLORS } from '../services/riskEngine';
import { BinRecord } from '../types';

describe('WasteWise Risk Categorization Engine', () => {
  it('correctly maps fill percentages to risk categories per specification', () => {
    // Critical: 90–100%, red (#DC2626)
    expect(getRiskCategory(100)).toBe('critical');
    expect(getRiskCategory(95)).toBe('critical');
    expect(getRiskCategory(90)).toBe('critical');
    expect(getRiskColor('critical')).toBe('#DC2626');

    // High: 75–89%, orange (#F97316)
    expect(getRiskCategory(89)).toBe('high');
    expect(getRiskCategory(80)).toBe('high');
    expect(getRiskCategory(75)).toBe('high');
    expect(getRiskColor('high')).toBe('#F97316');

    // Medium: 50–74%, yellow (#EAB308)
    expect(getRiskCategory(74)).toBe('medium');
    expect(getRiskCategory(60)).toBe('medium');
    expect(getRiskCategory(50)).toBe('medium');
    expect(getRiskColor('medium')).toBe('#EAB308');

    // Low: 0–49%, green (#16A34A)
    expect(getRiskCategory(49)).toBe('low');
    expect(getRiskCategory(25)).toBe('low');
    expect(getRiskCategory(0)).toBe('low');
    expect(getRiskColor('low')).toBe('#16A34A');
  });

  it('boosts priority score for sensitive zones and critical levels', () => {
    const regularLowBin: BinRecord = {
      id: 'B1',
      code: 'B1',
      name: 'Residential Bin',
      hindiName: '',
      location: { lat: 26.8, lng: 75.8, address: '', hindiAddress: '', landmark: '', ward: '', sector: '' },
      capacityLiters: 1100,
      currentFillPercent: 40,
      estimatedKg: 100,
      riskCategory: 'low',
      collectionStatus: 'unassigned',
      lastCollectionTime: '',
      dataFreshness: '10 mins ago',
      isSimulated: true,
      sensitiveZone: false,
      supervisorTradeoffReason: '',
    };

    const criticalHospitalBin: BinRecord = {
      ...regularLowBin,
      id: 'B2',
      name: 'Hospital Zone Bin',
      currentFillPercent: 92,
      riskCategory: 'critical',
      sensitiveZone: true,
      dataFreshness: '14 hours ago (Stale)',
    };

    const regularScore = calculateBinPriorityScore(regularLowBin);
    const criticalScore = calculateBinPriorityScore(criticalHospitalBin);

    // Critical + sensitive zone + stale data should yield significantly higher priority
    expect(criticalScore).toBeGreaterThan(regularScore + 100);
  });
});
