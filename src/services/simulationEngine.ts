import { TruckRecord, BinRecord, CollectionEvent } from '../types';

/**
 * WasteWise Pune - Road-Based Truck Movement Simulation Engine
 * Interpolates truck positions along actual road geometry coordinates and
 * calculates rotation heading angles so truck markers follow the road direction.
 */

export function calculateHeadingDegrees(from: [number, number], to: [number, number]): number {
  const dLat = to[0] - from[0];
  const dLng = to[1] - from[1];
  const rad = Math.atan2(dLng, dLat);
  const deg = (rad * 180) / Math.PI;
  return Math.round((deg + 360) % 360);
}

export interface SimulationTickResult {
  updatedTrucks: TruckRecord[];
  updatedBins: BinRecord[];
  newEvents: CollectionEvent[];
}

/**
 * Advances simulated trucks along their assigned road geometry by one step
 */
export function tickTruckSimulation(
  trucks: TruckRecord[],
  bins: BinRecord[],
  speedMultiplier: 1 | 2 | 5 = 1
): SimulationTickResult {
  const newEvents: CollectionEvent[] = [];

  const updatedBins = [...bins];

  const updatedTrucks = trucks.map((truck) => {
    // Skip offline trucks or trucks without assigned routes
    if (truck.status === 'Offline' || !truck.assignedRoute || truck.assignedRoute.roadGeometry.length < 2) {
      return truck;
    }

    const geometry = truck.assignedRoute.roadGeometry;
    const totalPoints = geometry.length;
    const stepIncrement = speedMultiplier;

    let nextIndex = truck.currentSegmentIndex + stepIncrement;

    // If reached end of route, truck completes work and returns to depot
    if (nextIndex >= totalPoints - 1) {
      nextIndex = totalPoints - 1;
      const endCoords = geometry[nextIndex];

      return {
        ...truck,
        currentCoords: { lat: endCoords[0], lng: endCoords[1] },
        currentSegmentIndex: nextIndex,
        status: (truck.completedBinIds.length === truck.assignedBinIds.length && truck.assignedBinIds.length > 0
          ? 'Available'
          : truck.status) as any,
        progressPercent: 100,
      };
    }

    const currentPos = geometry[nextIndex];
    const prevPos = geometry[Math.max(0, nextIndex - 1)];

    // Calculate heading angle along road segment
    const headingDegrees = calculateHeadingDegrees(prevPos, currentPos);

    // Calculate progress along route
    const progressPercent = Math.round((nextIndex / (totalPoints - 1)) * 100);

    // Check if truck is arriving at an assigned bin stop
    let currentStatus = truck.status;
    let nextStop = truck.nextStopBinId;

    if (truck.assignedBinIds.length > 0) {
      currentStatus = 'En route';

      // Check distance to remaining assigned stops
      for (const binId of truck.assignedBinIds) {
        if (truck.completedBinIds.includes(binId)) continue;

        const bin = updatedBins.find((b) => b.id === binId);
        if (bin) {
          const latDiff = Math.abs(currentPos[0] - bin.location.lat);
          const lngDiff = Math.abs(currentPos[1] - bin.location.lng);

          // Close proximity threshold ~50 meters
          if (latDiff < 0.0006 && lngDiff < 0.0006) {
            currentStatus = 'Collecting';
            nextStop = binId;
            break;
          }
        }
      }
    }

    return {
      ...truck,
      currentCoords: { lat: currentPos[0], lng: currentPos[1] },
      currentSegmentIndex: nextIndex,
      headingDegrees,
      status: currentStatus,
      nextStopBinId: nextStop,
      progressPercent,
    };
  });

  return {
    updatedTrucks,
    updatedBins,
    newEvents,
  };
}

/**
 * Executes a simulated collection event for a specific bin and truck.
 * 
 * Includes idempotency enforcement to prevent repeated collection actions or
 * network replays from inflating truck payloads.
 */
export function recordCollectionService(
  binId: string,
  truckId: string,
  trucks: TruckRecord[],
  bins: BinRecord[],
  action: 'collected' | 'unable_to_collect',
  failureReason?: any,
  failureNote?: string
): { updatedTrucks: TruckRecord[]; updatedBins: BinRecord[]; event: CollectionEvent; isDuplicate?: boolean; error?: string } {
  const targetBin = bins.find((b) => b.id === binId);
  const targetTruck = trucks.find((t) => t.id === truckId);

  // If bin not found, return safe fallback without mutating state
  if (!targetBin) {
    const fallbackEvent: CollectionEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
      binId,
      binCode: binId,
      binName: 'Unknown Bin',
      truckId,
      driverName: targetTruck ? targetTruck.driverName : 'Assigned Crew',
      type: action,
      weightKg: 0,
      fillPercentBefore: 0,
      reason: failureReason,
      notes: failureNote || 'Bin not found',
    };
    return { updatedTrucks: trucks, updatedBins: bins, event: fallbackEvent, isDuplicate: true, error: 'Bin not found' };
  }

  // Reject invalid or negative bin payload
  if (!Number.isFinite(targetBin.estimatedKg) || targetBin.estimatedKg < 0) {
    const errorEvent: CollectionEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
      binId,
      binCode: targetBin.code,
      binName: targetBin.name,
      truckId,
      driverName: targetTruck ? targetTruck.driverName : 'Assigned Crew',
      type: action,
      weightKg: 0,
      fillPercentBefore: targetBin.currentFillPercent,
      notes: 'Collection rejected: invalid negative bin payload',
    };
    return { updatedTrucks: trucks, updatedBins: bins, event: errorEvent, isDuplicate: true, error: 'Invalid negative bin payload' };
  }

  // Idempotency check: has this bin already been collected?
  const isAlreadyCollected = targetBin.collectionStatus === 'collected';
  const isAlreadyInTruckCompleted = targetTruck ? targetTruck.completedBinIds.includes(binId) : false;

  // Duplicate collection safeguard: if already collected, do not inflate payload or rewrite state
  if (action === 'collected' && (isAlreadyCollected || isAlreadyInTruckCompleted)) {
    const duplicateEvent: CollectionEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
      binId,
      binCode: targetBin.code,
      binName: targetBin.name,
      truckId,
      driverName: targetTruck ? targetTruck.driverName : 'Assigned Crew',
      type: action,
      weightKg: 0, // Duplicate action yields 0 additional load
      fillPercentBefore: targetBin.currentFillPercent,
      notes: 'Duplicate collection action ignored: bin already marked collected',
    };
    return { updatedTrucks: trucks, updatedBins: bins, event: duplicateEvent, isDuplicate: true };
  }

  const fillBefore = targetBin.currentFillPercent;
  const weight = targetBin.estimatedKg;

  const event: CollectionEvent = {
    id: `EVT-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
    binId,
    binCode: targetBin.code,
    binName: targetBin.name,
    truckId,
    driverName: targetTruck ? targetTruck.driverName : 'Assigned Crew',
    type: action,
    weightKg: action === 'collected' ? weight : 0,
    fillPercentBefore: fillBefore,
    reason: failureReason,
    notes: failureNote,
  };

  const updatedBins = bins.map((b) => {
    if (b.id !== binId) return b;

    if (action === 'collected') {
      const historyItem = {
        timestamp: new Date().toISOString(),
        truckId,
        result: 'collected',
        weightKg: weight,
        notes: 'Cleared during driver shift',
      };
      return {
        ...b,
        currentFillPercent: 5, // Prototype tare reading post-clearance
        estimatedKg: Math.round(0.05 * (b.capacityLiters * 0.35)),
        riskCategory: 'low' as const,
        collectionStatus: 'collected' as const,
        lastCollectionTime: 'Just now (Simulated)',
        collectedAtTimestamp: new Date().toISOString(),
        collectionHistory: [...(b.collectionHistory || []), historyItem],
      };
    } else {
      const failureHistoryItem = {
        timestamp: new Date().toISOString(),
        truckId,
        result: 'unable_to_collect',
        notes: failureNote || failureReason,
      };
      return {
        ...b,
        collectionStatus: 'unable_to_collect' as const,
        failureReason,
        failureNote,
        collectionHistory: [...(b.collectionHistory || []), failureHistoryItem],
      };
    }
  });

  const updatedTrucks = trucks.map((t) => {
    if (t.id !== truckId) return t;

    const newCompleted = t.completedBinIds.includes(binId)
      ? t.completedBinIds
      : [...t.completedBinIds, binId];

    const newNextStop = t.assignedBinIds.find((id) => !newCompleted.includes(id));
    const addedWeight = action === 'collected' ? weight : 0;
    // Cap at vehicle capacity to prevent structural overload
    const newLoad = Math.min(t.capacityKg, Math.max(0, t.currentLoadKg + addedWeight));

    return {
      ...t,
      completedBinIds: newCompleted,
      nextStopBinId: newNextStop,
      currentLoadKg: newLoad,
      status: (newCompleted.length === t.assignedBinIds.length && t.assignedBinIds.length > 0
        ? 'Available'
        : t.status) as any,
    };
  });

  return { updatedTrucks, updatedBins, event };
}
