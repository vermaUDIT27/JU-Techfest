import { TruckRecord } from '../../types';
import { escapeHtml, escapeAttr } from '../../utils/sanitize';

/**
 * Creates custom HTML string for Leaflet DivIcon representing a collection truck
 * Rotates the SVG icon based on headingDegrees along road geometry.
 * 
 * Sanitized to prevent DOM XSS from driver names or vehicle registration tags.
 */
export function createTruckMarkerHtml(
  truck: TruckRecord,
  isSelected: boolean = false
): string {
  const isCollecting = truck.status === 'Collecting';
  const isOffline = truck.status === 'Offline';
  const rotation = Number(truck.headingDegrees) || 0;
  const isValidColor = typeof truck.color === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(truck.color);
  const safeColor = isValidColor ? truck.color : '#B04F34';

  const collectingPulse = isCollecting
    ? `<span class="absolute -inset-2 rounded-full bg-amber-400 opacity-60 animate-ping"></span>`
    : '';

  const selectedRing = isSelected
    ? `box-shadow: 0 0 0 3px #1D1D21, 0 0 12px ${safeColor}; transform: scale(1.15);`
    : `box-shadow: 0 2px 6px rgba(0,0,0,0.3);`;

  const safeId = escapeAttr(truck.id);
  const safeDriver = escapeAttr(truck.driverName);
  const safeStatus = escapeAttr(truck.status);
  const shortId = escapeHtml(truck.id.replace(/^(MH-12-|RJ-14-)/, ''));

  return `
    <div 
      class="relative flex items-center justify-center select-none cursor-pointer"
      style="width: 44px; height: 44px;"
      role="button"
      tabindex="0"
      aria-label="Truck ${safeId} (${safeDriver}), Status: ${safeStatus}"
    >
      ${collectingPulse}

      <!-- Rotatable Truck Icon Body -->
      <div 
        style="transform: rotate(${rotation}deg); transition: transform 0.3s ease-out;"
        class="relative flex items-center justify-center w-10 h-10"
      >
        <svg 
          viewBox="0 0 36 36" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          class="w-10 h-10 drop-shadow-md"
        >
          <!-- Truck Chassis / Cab & Compactor Body -->
          <rect x="7" y="11" width="16" height="14" rx="2" fill="${safeColor}" stroke="#FFFFFF" stroke-width="1.5" />
          <path d="M23 14H29L32 19V25H23V14Z" fill="${isOffline ? '#6B7280' : '#1F2937'}" stroke="#FFFFFF" stroke-width="1.5" />
          
          <!-- Cab Window -->
          <path d="M24 16H28L30 19H24V16Z" fill="#93C5FD" />

          <!-- Waste Compactor Hopper Detail -->
          <line x1="10" y1="14" x2="10" y2="22" stroke="#FFFFFF" stroke-width="1" stroke-dasharray="1 1" />
          <line x1="15" y1="14" x2="15" y2="22" stroke="#FFFFFF" stroke-width="1" stroke-dasharray="1 1" />

          <!-- Wheels -->
          <circle cx="12" cy="26" r="3.2" fill="#111827" stroke="#E5E7EB" stroke-width="1.2" />
          <circle cx="27" cy="26" r="3.2" fill="#111827" stroke="#E5E7EB" stroke-width="1.2" />
          <circle cx="12" cy="26" r="1.2" fill="#9CA3AF" />
          <circle cx="27" cy="26" r="1.2" fill="#9CA3AF" />

          <!-- Front Headlights (Pointing Right = Heading 90) -->
          <circle cx="31" cy="23" r="1" fill="#FEF08A" />
        </svg>
      </div>

      <!-- Static Label Badge (Not Rotated for Legibility) -->
      <div 
        style="background-color: ${safeColor}; ${selectedRing}"
        class="absolute -bottom-2 text-[8.5px] font-mono font-bold text-white px-1.5 py-0.2 rounded-full border border-white whitespace-nowrap z-10 shadow-xs"
      >
        ${shortId}
      </div>

      <!-- Collecting status indicator -->
      ${isCollecting ? `
        <div class="absolute -top-2 px-1 py-0.2 rounded bg-amber-400 text-amber-950 font-extrabold text-[8px] uppercase tracking-wider animate-bounce border border-amber-600">
          LOAD
        </div>
      ` : ''}
    </div>
  `;
}
