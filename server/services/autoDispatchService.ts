import { Database as DatabaseType } from 'better-sqlite3';
import { logAuditEvent } from './auditService.js';

export interface RouteGeometryPoint {
  lat: number;
  lng: number;
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

/**
 * Seeds preloaded, deterministic demo routes into SQLite.
 * Ensures at least 2 distinct routes with multiple stops (including >85% critical bins).
 */
export function seedAutoDispatchRoutes(db: DatabaseType, force = false): void {
  // If not forced and routes already exist, keep persisted progress
  const existingRouteCount = db.prepare('SELECT COUNT(*) as count FROM routes').get() as { count: number };
  if (!force && existingRouteCount && existingRouteCount.count > 0) {
    return;
  }

  db.transaction(() => {
    if (force) {
      db.prepare('DELETE FROM route_stops').run();
      db.prepare('DELETE FROM routes').run();
    }

    const today = new Date().toISOString().slice(0, 10);

    // Scenario Configuration for Pune Demo
    const demoRoutesConfig = [
      {
        routeId: 'ROUTE-MH-12-PMC-4821',
        truckId: 'MH-12-PMC-4821',
        driverPhone: '9822011111',
        binIds: ['WW-PUN-00', 'WW-PUN-01', 'WW-PUN-02', 'WW-PUN-03'],
      },
      {
        routeId: 'ROUTE-MH-12-PMC-5134',
        truckId: 'MH-12-PMC-5134',
        driverPhone: '9822022222',
        binIds: ['WW-PUN-04', 'WW-PUN-05', 'WW-PUN-12'],
      },
      {
        routeId: 'ROUTE-MH-12-PMC-3912',
        truckId: 'MH-12-PMC-3912',
        driverPhone: '9822033333',
        binIds: ['WW-PUN-06', 'WW-PUN-07'],
      },
    ];

    for (const config of demoRoutesConfig) {
      // 1. Fetch Truck
      const truck = db.prepare('SELECT * FROM trucks WHERE id = ?').get(config.truckId) as any;
      if (!truck) continue;

      // 2. Fetch Driver
      const driver = db.prepare('SELECT * FROM drivers WHERE assigned_truck_id = ?').get(config.truckId) as any;
      const driverId = driver ? driver.id : null;

      // 3. Fetch Bins in order
      const placeholders = config.binIds.map(() => '?').join(',');
      const bins = db.prepare(`SELECT * FROM bins WHERE id IN (${placeholders})`).all(...config.binIds) as any[];

      // Sort bins strictly in the configured stop order
      const orderedBins = config.binIds
        .map((id) => bins.find((b) => b.id === id))
        .filter(Boolean);

      if (orderedBins.length === 0) continue;

      // 4. Calculate Waypoints, Road Geometry & Distance
      const waypoints: [number, number][] = [
        [truck.depot_lat, truck.depot_lng],
        ...orderedBins.map((b) => [b.lat, b.lng] as [number, number]),
        [truck.depot_lat, truck.depot_lng], // Return to depot
      ];

      let totalDist = 0;
      for (let i = 0; i < waypoints.length - 1; i++) {
        totalDist += haversineDistanceKm(
          waypoints[i][0],
          waypoints[i][1],
          waypoints[i + 1][0],
          waypoints[i + 1][1]
        );
      }
      const totalDistanceKm = parseFloat(totalDist.toFixed(2));
      const totalDurationMinutes = Math.round(totalDistanceKm * 4.5); // Approx 13 km/h urban municipal speed

      // 5. Insert Route Record
      db.prepare(`
        INSERT OR REPLACE INTO routes (
          id, truck_id, driver_id, shift_date, status, total_distance_km,
          total_duration_minutes, road_geometry_json
        ) VALUES (?, ?, ?, ?, 'in_progress', ?, ?, ?)
      `).run(
        config.routeId,
        config.truckId,
        driverId,
        today,
        totalDistanceKm,
        totalDurationMinutes,
        JSON.stringify(waypoints)
      );

      // 6. Insert Route Stops and Update Bins
      let accumulatedLoad = 0;
      for (let i = 0; i < orderedBins.length; i++) {
        const bin = orderedBins[i];
        const stopOrder = i + 1;
        const stopId = `RSTOP-${config.truckId}-${bin.id}`;

        accumulatedLoad += bin.estimated_kg || 0;

        db.prepare(`
          INSERT OR REPLACE INTO route_stops (
            id, route_id, bin_id, stop_order, status
          ) VALUES (?, ?, ?, ?, 'pending')
        `).run(stopId, config.routeId, bin.id, stopOrder);

        db.prepare(`
          UPDATE bins
          SET assigned_truck_id = ?,
              assigned_stop_order = ?,
              collection_status = 'assigned',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(config.truckId, stopOrder, bin.id);
      }

      // 7. Update Truck Status and Current Load
      db.prepare(`
        UPDATE trucks
        SET current_load_kg = ?,
            status = 'Assigned',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(accumulatedLoad, config.truckId);

      // 8. Log Audit Event
      logAuditEvent(db, {
        actorType: 'system',
        action: 'AUTO_DISPATCH_ROUTE_GENERATED',
        entityType: 'route',
        entityId: config.routeId,
        details: {
          truckId: config.truckId,
          driverId,
          stopCount: orderedBins.length,
          totalLoadKg: accumulatedLoad,
          totalDistanceKm,
        },
      });
    }
  })();
}

/**
 * Ensures a truck has an active auto-dispatched route.
 * If the truck has 0 assigned stops in the database, this queries unassigned critical/high bins
 * and dispatches a valid route on the fly.
 */
export function ensureAutoDispatchForTruck(
  db: DatabaseType,
  truckId: string,
  driverId?: string
): void {
  // 1. Fetch Truck
  const truck = db.prepare('SELECT * FROM trucks WHERE id = ?').get(truckId) as any;
  if (!truck) return;

  // 2. Check existing assigned stops
  const currentAssigned = db.prepare(`
    SELECT * FROM bins WHERE assigned_truck_id = ? AND collection_status != 'collected'
  `).all(truckId) as any[];

  // Also check if an active route record already exists
  const existingRoute = db.prepare(`
    SELECT * FROM routes WHERE truck_id = ? AND status IN ('pending', 'in_progress')
  `).get(truckId) as any;

  if (currentAssigned.length > 0 && existingRoute) {
    // Truck already has an active route and stops
    return;
  }

  // If the truck completed an earlier route and has no pending stops, do not auto-generate new ones
  const completedRoute = db.prepare(`
    SELECT id FROM routes WHERE truck_id = ? AND status = 'completed' LIMIT 1
  `).get(truckId) as any;

  if (completedRoute && currentAssigned.length === 0) {
    return;
  }

  db.transaction(() => {
    // 3. If there are no assigned stops, find unassigned critical/high bins
    let eligibleBins: any[] = [];
    if (currentAssigned.length === 0) {
      const unassigned = db.prepare(`
        SELECT * FROM bins 
        WHERE collection_status = 'unassigned'
        ORDER BY 
          CASE WHEN current_fill_percent >= 85 THEN 1
               WHEN current_fill_percent >= 70 THEN 2
               ELSE 3 END ASC,
          current_fill_percent DESC
      `).all() as any[];

      let remainingCapacity = truck.capacity_kg - truck.current_load_kg;
      for (const bin of unassigned) {
        if (bin.estimated_kg <= remainingCapacity && eligibleBins.length < 5) {
          eligibleBins.push(bin);
          remainingCapacity -= bin.estimated_kg;
        }
      }
    } else {
      eligibleBins = currentAssigned;
    }

    if (eligibleBins.length === 0) return;

    // 4. Order stops geographically from truck depot
    let currentLat = truck.depot_lat;
    let currentLng = truck.depot_lng;
    const ordered: any[] = [];
    const pool = [...eligibleBins];

    while (pool.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < pool.length; i++) {
        const d = haversineDistanceKm(currentLat, currentLng, pool[i].lat, pool[i].lng);
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }
      const [chosen] = pool.splice(nearestIdx, 1);
      ordered.push(chosen);
      currentLat = chosen.lat;
      currentLng = chosen.lng;
    }

    const routeId = `ROUTE-${truckId}`;
    const today = new Date().toISOString().slice(0, 10);

    const waypoints: [number, number][] = [
      [truck.depot_lat, truck.depot_lng],
      ...ordered.map((b) => [b.lat, b.lng] as [number, number]),
      [truck.depot_lat, truck.depot_lng],
    ];

    let totalDist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDist += haversineDistanceKm(
        waypoints[i][0],
        waypoints[i][1],
        waypoints[i + 1][0],
        waypoints[i + 1][1]
      );
    }
    const totalDistanceKm = parseFloat(totalDist.toFixed(2));
    const totalDurationMinutes = Math.round(totalDistanceKm * 4.5);

    // 5. Insert/Update Route
    db.prepare(`
      INSERT OR REPLACE INTO routes (
        id, truck_id, driver_id, shift_date, status, total_distance_km,
        total_duration_minutes, road_geometry_json
      ) VALUES (?, ?, ?, ?, 'in_progress', ?, ?, ?)
    `).run(
      routeId,
      truckId,
      driverId || null,
      today,
      totalDistanceKm,
      totalDurationMinutes,
      JSON.stringify(waypoints)
    );

    // 6. Update Bins & Route Stops
    let totalLoad = 0;
    for (let i = 0; i < ordered.length; i++) {
      const bin = ordered[i];
      const stopOrder = i + 1;
      const stopId = `RSTOP-${truckId}-${bin.id}`;
      totalLoad += bin.estimated_kg || 0;

      db.prepare(`
        INSERT OR REPLACE INTO route_stops (
          id, route_id, bin_id, stop_order, status
        ) VALUES (?, ?, ?, ?, 'pending')
      `).run(stopId, routeId, bin.id, stopOrder);

      db.prepare(`
        UPDATE bins
        SET assigned_truck_id = ?,
            assigned_stop_order = ?,
            collection_status = 'assigned',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(truckId, stopOrder, bin.id);
    }

    // 7. Update Truck
    db.prepare(`
      UPDATE trucks
      SET current_load_kg = ?,
          status = 'Assigned',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(totalLoad, truckId);

    // 8. Log Audit Event
    logAuditEvent(db, {
      actorType: 'system',
      action: 'AUTO_DISPATCH_ENSURED',
      entityType: 'route',
      entityId: routeId,
      details: {
        truckId,
        driverId,
        stopCount: ordered.length,
        totalLoadKg: totalLoad,
        message: `Automatic route ensured for truck ${truckId} with ${ordered.length} stops.`,
      },
    });
  })();
}

export interface SimulateSensorResult {
  success: boolean;
  binId: string;
  binCode: string;
  previousFillPercent: number;
  newFillPercent: number;
  riskCategory: string;
  autoDispatched: boolean;
  assignedTruckId?: string | null;
  message: string;
  reason?: string;
}

/**
 * Simulates a sensor reading update (e.g. fill spike to >= 85%).
 * If critical, automatically evaluates available trucks with capacity and assigns the bin.
 */
export function simulateSensorTrigger(
  db: DatabaseType,
  binId: string,
  newFillPercent: number
): SimulateSensorResult {
  const boundedFill = Math.max(0, Math.min(100, Math.round(newFillPercent)));

  const bin = db.prepare('SELECT * FROM bins WHERE id = ?').get(binId) as any;
  if (!bin) {
    throw new Error(`Dustbin '${binId}' not found.`);
  }

  const previousFill = bin.current_fill_percent;
  let riskCategory = 'low';
  if (boundedFill >= 85) riskCategory = 'critical';
  else if (boundedFill >= 70) riskCategory = 'high';
  else if (boundedFill >= 40) riskCategory = 'medium';

  // Calculate updated weight proportional to capacity
  const estimatedKg = Math.round((bin.capacity_liters || 1500) * (boundedFill / 100) * 0.4);
  const freshness = 'Just now (DEMO SENSOR Spike)';

  let result: SimulateSensorResult = {
    success: true,
    binId,
    binCode: bin.code,
    previousFillPercent: previousFill,
    newFillPercent: boundedFill,
    riskCategory,
    autoDispatched: false,
    assignedTruckId: bin.assigned_truck_id,
    message: '',
  };

  db.transaction(() => {
    // 1. Update bin telemetry
    db.prepare(`
      UPDATE bins
      SET current_fill_percent = ?,
          estimated_kg = ?,
          risk_category = ?,
          data_freshness = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(boundedFill, estimatedKg, riskCategory, freshness, binId);

    // 2. If Critical (>= 85%) and not collected
    if (boundedFill >= 85 && bin.collection_status !== 'collected') {
      if (!bin.assigned_truck_id) {
        // Bin is unassigned: find compatible truck with remaining capacity
        const candidateTrucks = db.prepare(`
          SELECT * FROM trucks 
          WHERE status != 'Offline' 
            AND (capacity_kg - current_load_kg) >= ?
          ORDER BY (capacity_kg - current_load_kg) DESC
        `).all(estimatedKg) as any[];

        if (candidateTrucks.length > 0) {
          const chosenTruck = candidateTrucks[0];

          // Determine next stop order
          const maxOrderRow = db.prepare(`
            SELECT MAX(assigned_stop_order) as maxOrder 
            FROM bins 
            WHERE assigned_truck_id = ?
          `).get(chosenTruck.id) as { maxOrder: number | null };
          const nextStopOrder = (maxOrderRow?.maxOrder || 0) + 1;

          // Assign bin to truck
          db.prepare(`
            UPDATE bins
            SET assigned_truck_id = ?,
                assigned_stop_order = ?,
                collection_status = 'assigned',
                supervisor_tradeoff_reason = 'Auto-dispatched via simulated sensor threshold spike (>= 85%)',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(chosenTruck.id, nextStopOrder, binId);

          // Update truck load
          db.prepare(`
            UPDATE trucks
            SET current_load_kg = current_load_kg + ?,
                status = 'Assigned',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(estimatedKg, chosenTruck.id);

          // Update route stops
          const activeRoute = db.prepare(`
            SELECT * FROM routes WHERE truck_id = ? AND status IN ('pending', 'in_progress')
          `).get(chosenTruck.id) as any;

          if (activeRoute) {
            const stopId = `RSTOP-${chosenTruck.id}-${binId}`;
            db.prepare(`
              INSERT OR REPLACE INTO route_stops (
                id, route_id, bin_id, stop_order, status
              ) VALUES (?, ?, ?, ?, 'pending')
            `).run(stopId, activeRoute.id, binId, nextStopOrder);
          }

          const msg = `Demo bin ${bin.code} reached ${boundedFill}% — automatically included in route ${chosenTruck.id}`;
          result.autoDispatched = true;
          result.assignedTruckId = chosenTruck.id;
          result.message = msg;

          logAuditEvent(db, {
            actorType: 'system',
            action: 'DEMO_SENSOR_AUTO_DISPATCH',
            entityType: 'bin',
            entityId: binId,
            details: {
              binCode: bin.code,
              previousFill,
              newFillPercent: boundedFill,
              assignedTruckId: chosenTruck.id,
              message: msg,
            },
          });
        } else {
          // No vehicle has capacity
          const msg = `Demo bin ${bin.code} reached ${boundedFill}% — critical fill awaiting vehicle dispatch (all vehicles at capacity)`;
          result.autoDispatched = false;
          result.reason = 'vehicle_capacity_full';
          result.message = msg;

          db.prepare(`
            UPDATE bins
            SET supervisor_tradeoff_reason = 'Awaiting dispatch: vehicle capacity full',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(binId);

          logAuditEvent(db, {
            actorType: 'system',
            action: 'DEMO_SENSOR_CAPACITY_EXCEEDED',
            entityType: 'bin',
            entityId: binId,
            details: {
              binCode: bin.code,
              previousFill,
              newFillPercent: boundedFill,
              message: msg,
            },
          });
        }
      } else {
        // Bin was already assigned: adjust truck load delta
        const weightDelta = estimatedKg - (bin.estimated_kg || 0);
        if (weightDelta !== 0) {
          db.prepare(`
            UPDATE trucks
            SET current_load_kg = MAX(0, current_load_kg + ?),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(weightDelta, bin.assigned_truck_id);
        }

        const msg = `Demo sensor: assigned bin ${bin.code} telemetry updated to ${boundedFill}% (truck ${bin.assigned_truck_id})`;
        result.autoDispatched = false;
        result.assignedTruckId = bin.assigned_truck_id;
        result.message = msg;

        logAuditEvent(db, {
          actorType: 'system',
          action: 'DEMO_SENSOR_UPDATE',
          entityType: 'bin',
          entityId: binId,
          details: {
            binCode: bin.code,
            previousFill,
            newFillPercent: boundedFill,
            truckId: bin.assigned_truck_id,
            message: msg,
          },
        });
      }
    } else {
      // Non-critical update (< 85%)
      const msg = `Demo sensor: bin ${bin.code} updated to ${boundedFill}%`;
      result.message = msg;

      logAuditEvent(db, {
        actorType: 'system',
        action: 'DEMO_SENSOR_UPDATE',
        entityType: 'bin',
        entityId: binId,
        details: {
          binCode: bin.code,
          previousFill,
          newFillPercent: boundedFill,
          message: msg,
        },
      });
    }
  })();

  return result;
}

/**
 * Returns recent activity stream logs for the operator dashboard.
 */
export function getActivityStream(db: DatabaseType, limit = 20): any[] {
  const rows = db.prepare(`
    SELECT * FROM audit_logs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map((r) => {
    let details: any = {};
    try {
      details = r.details_json ? JSON.parse(r.details_json) : {};
    } catch {
      details = {};
    }

    return {
      id: r.id,
      actorType: r.actor_type,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      message: details.message || details.reason || `${r.action} on ${r.entity_type} ${r.entity_id || ''}`,
      details,
      createdAt: r.created_at,
    };
  });
}
