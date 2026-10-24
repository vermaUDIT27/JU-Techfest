import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const dashboardRouter = Router();

// GET /api/dashboard - Load operational dashboard data scoped to user permissions
dashboardRouter.get(
  '/',
  requireAuth,
  requireRole('municipal_head', 'ward_supervisor'),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const db = getDb();
      const user = req.user!;
      const isHead = user.role === 'municipal_head';
      const wardId = user.assignedWardId;

      // 1. Fetch Wards
      const wardsQuery = isHead
        ? 'SELECT id, ward_code, name, zone FROM wards ORDER BY ward_code'
        : 'SELECT id, ward_code, name, zone FROM wards WHERE id = ?';
      const wards = (isHead ? db.prepare(wardsQuery).all() : db.prepare(wardsQuery).all(wardId)) as any[];

      // 2. Fetch Trucks
      const trucksQuery = isHead
        ? 'SELECT * FROM trucks ORDER BY id'
        : 'SELECT * FROM trucks WHERE assigned_ward_id = ? ORDER BY id';
      const trucksRaw = (isHead ? db.prepare(trucksQuery).all() : db.prepare(trucksQuery).all(wardId)) as any[];

      // Format trucks to match client TruckRecord interface
      const trucks = trucksRaw.map((t) => {
        // Find assigned bins
        const assignedBins = db.prepare(`
          SELECT id FROM bins WHERE assigned_truck_id = ?
        `).all(t.id) as { id: string }[];

        const completedBins = db.prepare(`
          SELECT bin_id FROM collection_events WHERE truck_id = ? AND result = 'collected'
        `).all(t.id) as { bin_id: string }[];

        return {
          id: t.id,
          name: t.name,
          capacityKg: t.capacity_kg,
          currentLoadKg: t.current_load_kg,
          status: t.status,
          assignedWardId: t.assigned_ward_id,
          color: t.color,
          depotName: t.depot_name,
          depotCoords: { lat: t.depot_lat, lng: t.depot_lng },
          currentCoords: { lat: t.current_lat, lng: t.current_lng },
          headingDegrees: t.heading_degrees,
          assignedBinIds: assignedBins.map((b) => b.id),
          completedBinIds: Array.from(new Set(completedBins.map((b) => b.bin_id))),
          isSimulated: Boolean(t.is_simulated),
        };
      });

      // 3. Fetch Bins
      const binsQuery = isHead
        ? 'SELECT * FROM bins ORDER BY id'
        : 'SELECT * FROM bins WHERE ward_id = ? ORDER BY id';
      const binsRaw = (isHead ? db.prepare(binsQuery).all() : db.prepare(binsQuery).all(wardId)) as any[];

      const bins = binsRaw.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        hindiName: b.hindi_name,
        location: {
          lat: b.lat,
          lng: b.lng,
          address: b.address,
          hindiAddress: b.hindi_address,
          landmark: b.landmark,
          ward: b.ward_id === 'WARD-84' ? 'Ward 84' : 'Ward 85',
          sector: b.sector,
        },
        capacityLiters: b.capacity_liters,
        currentFillPercent: b.current_fill_percent,
        estimatedKg: b.estimated_kg,
        riskCategory: b.risk_category,
        collectionStatus: b.collection_status,
        assignedTruckId: b.assigned_truck_id || undefined,
        assignedStopOrder: b.assigned_stop_order || undefined,
        sensitiveZone: Boolean(b.sensitive_zone),
        supervisorTradeoffReason: b.supervisor_tradeoff_reason || undefined,
        dataFreshness: b.data_freshness || 'Simulated Sensor',
        isSimulated: Boolean(b.is_simulated),
      }));

      // 4. Fetch Recent Collection Events
      const eventsQuery = isHead
        ? `SELECT e.*, b.name as bin_name, b.code as bin_code, t.name as truck_name
           FROM collection_events e
           LEFT JOIN bins b ON e.bin_id = b.id
           LEFT JOIN trucks t ON e.truck_id = t.id
           ORDER BY e.created_at DESC LIMIT 50`
        : `SELECT e.*, b.name as bin_name, b.code as bin_code, t.name as truck_name
           FROM collection_events e
           JOIN bins b ON e.bin_id = b.id
           LEFT JOIN trucks t ON e.truck_id = t.id
           WHERE b.ward_id = ?
           ORDER BY e.created_at DESC LIMIT 50`;

      const eventsRaw = (isHead ? db.prepare(eventsQuery).all() : db.prepare(eventsQuery).all(wardId)) as any[];

      const events = eventsRaw.map((e) => ({
        id: e.id,
        timestamp: new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
        binId: e.bin_id,
        binCode: e.bin_code || e.bin_id,
        binName: e.bin_name || 'Unknown Bin',
        truckId: e.truck_id,
        driverName: e.driver_id || 'Assigned Crew',
        type: e.result,
        weightKg: e.weight_kg,
        fillPercentBefore: e.fill_percent_before,
        reason: e.failure_reason,
        notes: e.notes,
      }));

      // 5. Aggregate Metrics
      const totalBins = bins.length;
      const criticalBins = bins.filter((b) => b.riskCategory === 'critical').length;
      const highRiskBins = bins.filter((b) => b.riskCategory === 'critical' || b.riskCategory === 'high').length;
      const collectedBins = bins.filter((b) => b.collectionStatus === 'collected').length;
      const totalCapacity = trucks.reduce((sum, t) => sum + t.capacityKg, 0);
      const totalLoad = trucks.reduce((sum, t) => sum + t.currentLoadKg, 0);

      res.json({
        scope: isHead ? 'citywide' : `ward:${wardId}`,
        user: {
          id: user.userId,
          name: user.name,
          role: user.role,
        },
        wards,
        trucks,
        bins,
        events,
        metrics: {
          totalBins,
          criticalBins,
          highRiskBins,
          collectedBins,
          totalCapacityKg: totalCapacity,
          totalLoadKg: totalLoad,
          fleetUtilizationPercent: totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0,
        },
        isSimulated: true,
      });
    } catch (err) {
      next(err);
    }
  }
);
