import { BinRecord } from '../../types';
import { RISK_COLORS } from '../../services/riskEngine';
import { escapeHtml, escapeAttr } from '../../utils/sanitize';

/**
 * Creates custom HTML string for Leaflet DivIcon representing a dustbin
 * per specification:
 * - Critical: 90–100%, red (#DC2626)
 * - High: 75–89%, orange (#F97316)
 * - Medium: 50–74%, yellow (#EAB308)
 * - Low: 0–49%, green (#16A34A)
 * Does not rely on color alone (includes clear percentage, status text, and shape cues)
 * 
 * Sanitized to neutralize DOM XSS from untrusted bin telemetry or names.
 */
export function createDustbinMarkerHtml(
  bin: BinRecord,
  isSelected: boolean = false
): string {
  const color = RISK_COLORS[bin.riskCategory] || '#16A34A';
  const isCollected = bin.collectionStatus === 'collected';
  const isUnable = bin.collectionStatus === 'unable_to_collect';
  const isCritical = bin.riskCategory === 'critical';

  // Pulsing aura for critical bins
  const pulseHtml = isCritical && !isCollected
    ? `<span class="absolute -inset-1 rounded-full opacity-60 animate-ping" style="background-color: ${escapeAttr(color)};"></span>`
    : '';

  // Selected state ring
  const selectedRingStyle = isSelected
    ? `box-shadow: 0 0 0 3px #1D1D21, 0 0 10px rgba(0,0,0,0.4); transform: scale(1.15);`
    : `box-shadow: 0 2px 5px rgba(0,0,0,0.25);`;

  // Status icon overlay
  let statusBadgeHtml = '';
  if (isCollected) {
    statusBadgeHtml = `
      <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold border border-white" title="Collected">
        ✓
      </div>
    `;
  } else if (isUnable) {
    statusBadgeHtml = `
      <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-700 text-white flex items-center justify-center text-[9px] font-bold border border-white" title="Unable to collect">
        ✕
      </div>
    `;
  } else if (bin.assignedTruckId) {
    const stopNum = Number(bin.assignedStopOrder) || 1;
    statusBadgeHtml = `
      <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[8px] font-bold border border-white" title="Truck Assigned">
        #${stopNum}
      </div>
    `;
  }

  const fillText = isCollected ? '0%' : `${Number(bin.currentFillPercent) || 0}%`;
  const safeCategory = escapeHtml(bin.riskCategory.slice(0, 4));
  const safeCode = escapeAttr(bin.code);
  const safeName = escapeAttr(bin.name);
  const safeRisk = escapeAttr(bin.riskCategory);

  return `
    <div 
      class="relative flex items-center justify-center select-none cursor-pointer"
      style="width: 38px; height: 38px;"
      role="button"
      tabindex="0"
      aria-label="Dustbin ${safeCode}: ${safeName}, ${bin.currentFillPercent}% fill, Risk: ${safeRisk}"
    >
      ${pulseHtml}
      
      <!-- Dustbin Container Body -->
      <div 
        style="background-color: ${isCollected ? '#16A34A' : escapeAttr(color)}; ${selectedRingStyle}"
        class="relative flex flex-col items-center justify-between w-8 h-9 rounded-md text-white p-0.5 border-2 border-white transition-all hover:scale-110"
      >
        <!-- Bin Lid Handle Motif -->
        <div class="w-4 h-1 bg-white/70 rounded-xs mb-0.5"></div>

        <!-- Fill % Text (Color is not the only indicator!) -->
        <span class="text-[10px] font-extrabold leading-none tracking-tight font-sans">
          ${fillText}
        </span>

        <!-- Accessible Risk / Category Indicator Shape -->
        <span class="text-[7.5px] uppercase font-bold tracking-wider opacity-95 leading-none">
          ${isCollected ? 'DONE' : safeCategory}
        </span>
      </div>

      ${statusBadgeHtml}
    </div>
  `;
}
