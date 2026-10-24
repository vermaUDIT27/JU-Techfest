/**
 * WasteWise Pune - HTML & DOM Sanitization Utilities
 * 
 * Provides defense-in-depth sanitization for dynamic strings injected into
 * Leaflet DivIcons, popups, and raw HTML attribute templates.
 */

/**
 * Escapes characters with special meaning in HTML to prevent XSS injection.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escapes characters for safe inclusion inside an HTML attribute value.
 */
export function escapeAttr(str: unknown): string {
  return escapeHtml(str);
}
