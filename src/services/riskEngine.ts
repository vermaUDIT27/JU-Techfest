import { RiskLevel, BinRecord } from '../types';

/**
 * WasteWise Pune - Risk Categorization Engine
 * 
 * Consistent fill-level categories per specification:
 * - Critical: 90–100%, red (#DC2626)
 * - High: 75–89%, orange (#F97316)
 * - Medium: 50–74%, yellow (#EAB308)
 * - Low: 0–49%, green (#16A34A)
 */

export const RISK_COLORS = {
  critical: '#DC2626', // Red
  high: '#F97316',     // Orange
  medium: '#EAB308',   // Yellow
  low: '#16A34A',      // Green
} as const;

export function getRiskCategory(fillPercent: number): RiskLevel {
  if (fillPercent >= 90) return 'critical';
  if (fillPercent >= 75) return 'high';
  if (fillPercent >= 50) return 'medium';
  return 'low';
}

export function getRiskColor(level: RiskLevel): string {
  return RISK_COLORS[level] || RISK_COLORS.low;
}

export function getRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'critical':
      return 'Critical (90–100%)';
    case 'high':
      return 'High (75–89%)';
    case 'medium':
      return 'Medium (50–74%)';
    case 'low':
      return 'Low (0–49%)';
    default:
      return 'Normal';
  }
}

export function getRiskBadgeClasses(level: RiskLevel): string {
  switch (level) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-300 font-bold';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300 font-semibold';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-300 font-medium';
    default:
      return 'bg-sand-100 text-charcoal-700 border-sand-300';
  }
}

/**
 * Computes an operational priority score for the dispatch heuristic
 * Higher score = higher collection priority
 */
export function calculateBinPriorityScore(bin: BinRecord): number {
  let score = bin.currentFillPercent;

  // Level weightings
  if (bin.riskCategory === 'critical') {
    score += 100;
  } else if (bin.riskCategory === 'high') {
    score += 50;
  } else if (bin.riskCategory === 'medium') {
    score += 20;
  }

  // Sensitive Zone multiplier (hospitals, schools, temple pilgrim corridors)
  if (bin.sensitiveZone) {
    score += 30;
  }

  // Stale data uncertainty bonus (if data is stale, risk of unmonitored spillage increases)
  if (bin.dataFreshness.toLowerCase().includes('stale') || bin.dataFreshness.toLowerCase().includes('fault')) {
    score += 15;
  }

  return score;
}
