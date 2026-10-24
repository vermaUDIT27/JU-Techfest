import { BinRecord, TruckRecord, CollectionEvent, UserRole } from '../types';
import { INITIAL_PUNE_BINS } from '../data/puneBins';
import { INITIAL_PUNE_TRUCKS } from '../data/puneFleet';

/**
 * WasteWise Pune Edition - Client-Side Demo State Persistence
 * 
 * SECURITY NOTICE:
 * localStorage is used EXCLUSIVELY as a transient client-side simulation cache
 * for prototype testing across page refreshes.
 * It is NOT an authenticated identity store, session store, or authorization mechanism.
 * Real municipal operations require server-side session cookies and RBAC middleware.
 */

const STORAGE_KEY = 'wastewise_pune_demo_v1';
const LEGACY_STORAGE_KEY = 'wastewise_jaipur_demo_v2';

const VALID_ROLES: UserRole[] = ['ward_supervisor', 'municipal_head', 'driver'];

export interface StoredDemoState {
  bins: BinRecord[];
  trucks: TruckRecord[];
  events: CollectionEvent[];
  activeRole: UserRole;
  lastUpdated: string;
  isUnauthenticatedDemo: true;
}

/**
 * Validates whether an arbitrary input string is a legitimate demo role.
 * Sanitizes input to prevent role injection or unexpected privileges.
 */
export function sanitizeDemoRole(role: unknown): UserRole {
  if (typeof role === 'string' && VALID_ROLES.includes(role as UserRole)) {
    return role as UserRole;
  }
  return 'ward_supervisor';
}

export function loadSavedDemoState(): StoredDemoState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.bins) && Array.isArray(parsed.trucks)) {
      // Validate and sanitize activeRole against strict allowlist
      const sanitizedRole = sanitizeDemoRole(parsed.activeRole);

      // Integrity Check: Reject corrupt, negative, or non-finite capacities and loads
      const hasCorruptTruck = parsed.trucks.some((t: any) => {
        const cap = Number(t.capacityKg);
        const load = Number(t.currentLoadKg);
        return !Number.isFinite(cap) || cap <= 0 || !Number.isFinite(load) || load < 0 || load > cap;
      });

      const hasCorruptBin = parsed.bins.some((b: any) => {
        const estKg = Number(b.estimatedKg);
        const capL = Number(b.capacityLiters);
        const fill = Number(b.currentFillPercent);
        return !Number.isFinite(estKg) || estKg < 0 || !Number.isFinite(capL) || capL <= 0 || !Number.isFinite(fill) || fill < 0 || fill > 100;
      });

      if (hasCorruptTruck || hasCorruptBin) {
        console.warn('[Storage Integrity Guard] Stored state contains invalid/negative capacities or payloads. Rejecting corrupt state and reverting to defaults.');
        return null;
      }

      // Validate trucks structure cleanly
      const sanitizedTrucks: TruckRecord[] = parsed.trucks.map((t: any) => ({
        ...t,
        currentLoadKg: Number(t.currentLoadKg),
        capacityKg: Number(t.capacityKg),
        completedBinIds: Array.isArray(t.completedBinIds) ? t.completedBinIds : [],
        assignedBinIds: Array.isArray(t.assignedBinIds) ? t.assignedBinIds : [],
      }));

      return {
        bins: parsed.bins,
        trucks: sanitizedTrucks,
        events: Array.isArray(parsed.events) ? parsed.events : [],
        activeRole: sanitizedRole,
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        isUnauthenticatedDemo: true,
      };
    }
  } catch (e) {
    console.warn('Failed to parse saved WasteWise demo state from localStorage; falling back to clean defaults:', e);
  }
  return null;
}

export function saveDemoState(
  bins: BinRecord[],
  trucks: TruckRecord[],
  events: CollectionEvent[],
  activeRole: UserRole
): void {
  try {
    const sanitizedRole = sanitizeDemoRole(activeRole);
    const payload: StoredDemoState = {
      bins,
      trucks,
      events,
      activeRole: sanitizedRole,
      lastUpdated: new Date().toISOString(),
      isUnauthenticatedDemo: true,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to persist WasteWise demo state to localStorage:', e);
  }
}

export function resetDemoState(): {
  bins: BinRecord[];
  trucks: TruckRecord[];
  events: CollectionEvent[];
  activeRole: UserRole;
} {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    // Ignore storage clear error
  }

  return {
    bins: INITIAL_PUNE_BINS,
    trucks: INITIAL_PUNE_TRUCKS,
    events: [],
    activeRole: 'ward_supervisor',
  };
}
