import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth, requireRole, requireDriverOwnership } from '../middleware/auth.js';
import { ensureAutoDispatchForTruck } from '../services/autoDispatchService.js';

export const driverRouter = Router();

// GET /api/driver/route - Fetch the authenticated driver's assigned vehicle, route, and stops
driverRouter.get(
  '/route',
  requireAuth,
  requireRole('driver'),
  requireDriverOwnership,
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const db = getDb();
      const user = req.user!;
      const truckId = user.assignedTruckId!;

      // 1. Fetch assigned truck
      const truck = db.prepare(`SELECT * FROM trucks WHERE id = ?`).get(truckId) as any;
      if (!truck) {
        res.status(404).json({ error: 'Assigned truck not found.', code: 'TRUCK_NOT_FOUND' });
        return;
      }

      // 2. Ensure initial route exists if truck has no routes at all
      ensureAutoDispatchForTruck(db, truckId, user.userId);

      // Re-fetch truck to get updated current_load_kg and status
      const updatedTruck = db.prepare(`SELECT * FROM trucks WHERE id = ?`).get(truckId) as any;

      // 3. Fetch completed bins for this truck from collection_events
      const completedBins = db.prepare(`
        SELECT DISTINCT bin_id FROM collection_events
        WHERE truck_id = ? AND result = 'collected'
      `).all(truckId) as { bin_id: string }[];
      const completedBinIds = completedBins.map((c) => c.bin_id);

      // 4. Fetch active route from routes table (earliest active route first)
      let routeRecord = db.prepare(`
        SELECT * FROM routes WHERE truck_id = ? AND status IN ('pending', 'in_progress')
        ORDER BY created_at ASC LIMIT 1
      `).get(truckId) as any;

      let assignedBinsRaw: any[] = [];

      if (routeRecord) {
        // Fetch stops for this route via route_stops or fallback to bins table
        const routeStops = db.prepare(`
          SELECT rs.stop_order, b.*
          FROM route_stops rs
          JOIN bins b ON rs.bin_id = b.id
          WHERE rs.route_id = ?
          ORDER BY rs.stop_order ASC
        `).all(routeRecord.id) as any[];

        assignedBinsRaw = routeStops.length > 0
          ? routeStops
          : db.prepare(`
              SELECT * FROM bins
              WHERE assigned_truck_id = ?
              ORDER BY assigned_stop_order ASC, id ASC
            `).all(truckId) as any[];

        const pendingStops = assignedBinsRaw.filter(
          (b) => !completedBinIds.includes(b.id) && b.collection_status !== 'collected'
        );

        // If this route has stops and all stops are now completed, mark this route completed!
        if (assignedBinsRaw.length > 0 && pendingStops.length === 0) {
          db.prepare(`UPDATE routes SET status = 'completed' WHERE id = ?`).run(routeRecord.id);
          db.prepare(`
            UPDATE route_stops SET status = 'collected', completed_at = CURRENT_TIMESTAMP
            WHERE route_id = ? AND status = 'pending'
          `).run(routeRecord.id);

          // Check if another active route is assigned to this truck
          routeRecord = db.prepare(`
            SELECT * FROM routes WHERE truck_id = ? AND status IN ('pending', 'in_progress')
            ORDER BY created_at ASC LIMIT 1
          `).get(truckId) as any;

          if (routeRecord) {
            const nextRouteStops = db.prepare(`
              SELECT rs.stop_order, b.*
              FROM route_stops rs
              JOIN bins b ON rs.bin_id = b.id
              WHERE rs.route_id = ?
              ORDER BY rs.stop_order ASC
            `).all(routeRecord.id) as any[];

            assignedBinsRaw = nextRouteStops.length > 0
              ? nextRouteStops
              : db.prepare(`
                  SELECT * FROM bins
                  WHERE assigned_truck_id = ? AND collection_status != 'collected'
                  ORDER BY assigned_stop_order ASC, id ASC
                `).all(truckId) as any[];
          } else {
            assignedBinsRaw = [];
          }
        }
      }

      let roadGeometry: [number, number][] = [];
      if (routeRecord?.road_geometry_json) {
        try {
          roadGeometry = JSON.parse(routeRecord.road_geometry_json);
        } catch {
          roadGeometry = [];
        }
      }

      // Format assigned bins
      const formattedBins = assignedBinsRaw.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        hindiName: b.hindi_name,
        wardId: b.ward_id,
        location: {
          lat: b.lat,
          lng: b.lng,
          address: b.address,
          hindiAddress: b.hindi_address,
          landmark: b.landmark,
          ward: b.ward_id,
          sector: b.sector,
        },
        capacityLiters: b.capacity_liters,
        currentFillPercent: b.current_fill_percent,
        estimatedKg: b.estimated_kg,
        riskCategory: b.risk_category,
        collectionStatus: b.collection_status,
        assignedTruckId: b.assigned_truck_id,
        assignedStopOrder: b.assigned_stop_order || b.stop_order,
        sensitiveZone: Boolean(b.sensitive_zone),
        isSimulated: Boolean(b.is_simulated),
        dataFreshness: b.data_freshness,
      }));

      const assignedBinIds = formattedBins.map((b) => b.id);
      const nextStop = formattedBins.find(
        (b) => !completedBinIds.includes(b.id) && b.collectionStatus !== 'collected'
      );

      const routeInfo = routeRecord
        ? {
            id: routeRecord.id,
            truckId: routeRecord.truck_id,
            color: updatedTruck.color || '#D3832B',
            totalDistanceKm: routeRecord.total_distance_km,
            totalDurationMinutes: routeRecord.total_duration_minutes,
            roadGeometry,
          }
        : null;

      // Completed stops specifically belonging to this active route
      const routeCompletedBinIds = formattedBins
        .filter((b) => completedBinIds.includes(b.id) || b.collectionStatus === 'collected')
        .map((b) => b.id);

      const totalStops = formattedBins.length;
      const completedCount = routeCompletedBinIds.length;
      const progressPercent = totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;

      res.json({
        driver: {
          id: user.userId,
          name: user.name,
          assignedWardId: user.assignedWardId,
          assignedTruckId: truckId,
        },
        truck: {
          id: updatedTruck.id,
          name: updatedTruck.name,
          capacityKg: updatedTruck.capacity_kg,
          currentLoadKg: updatedTruck.current_load_kg,
          status: updatedTruck.status,
          color: updatedTruck.color || '#D3832B',
          depotName: updatedTruck.depot_name,
          depotCoords: { lat: updatedTruck.depot_lat, lng: updatedTruck.depot_lng },
          currentCoords: { lat: updatedTruck.current_lat, lng: updatedTruck.current_lng },
          assignedBinIds,
          completedBinIds: routeCompletedBinIds,
          nextStopBinId: nextStop?.id || null,
          assignedRoute: routeInfo,
        },
        stops: formattedBins,
        completedBinIds: routeCompletedBinIds,
        assignedBinIds,
        nextStopBin: nextStop || null,
        route: routeInfo,
        metrics: {
          totalStops,
          completedCount,
          progressPercent,
        },
        isSimulated: true,
      });
    } catch (err) {
      next(err);
    }
  }
);
