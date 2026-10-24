import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAuditEvent } from '../services/auditService.js';
import { simulateSensorTrigger, getActivityStream } from '../services/autoDispatchService.js';

export const dispatchRouter = Router();

const reassignBinSchema = z.object({
  binId: z.string().min(1, 'binId is required'),
  newTruckId: z.string().nullable(),
});

// POST /api/dispatch/reassign - Manually assign, reassign, or unassign a bin
dispatchRouter.post(
  '/reassign',
  requireAuth,
  requireRole('municipal_head', 'ward_supervisor'),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { binId, newTruckId } = reassignBinSchema.parse(req.body);
      const db = getDb();
      const user = req.user!;

      // 1. Fetch bin
      const bin = db.prepare(`SELECT * FROM bins WHERE id = ?`).get(binId) as any;
      if (!bin) {
        res.status(404).json({ error: `Dustbin '${binId}' not found.`, code: 'BIN_NOT_FOUND' });
        return;
      }

      // 2. Enforce ward scope for supervisors
      if (user.role === 'ward_supervisor' && bin.ward_id !== user.assignedWardId) {
        res.status(403).json({
          error: `Ward scope violation: Supervisor cannot modify bin in ward '${bin.ward_id}'.`,
          code: 'WARD_SCOPE_VIOLATION',
        });
        return;
      }

      // Reject non-positive or negative bin payloads
      if (!Number.isFinite(bin.estimated_kg) || bin.estimated_kg < 0) {
        res.status(400).json({
          error: `Invalid negative bin payload (${bin.estimated_kg} kg).`,
          code: 'INVALID_PAYLOAD',
        });
        return;
      }

      // Case A: Unassign bin
      if (newTruckId === null) {
        db.transaction(() => {
          const prevTruckId = bin.assigned_truck_id;

          db.prepare(`
            UPDATE bins 
            SET assigned_truck_id = NULL, collection_status = 'unassigned', assigned_stop_order = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(binId);

          if (prevTruckId) {
            db.prepare(`
              UPDATE trucks 
              SET current_load_kg = MAX(0, current_load_kg - ?), updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(bin.estimated_kg, prevTruckId);
          }

          logAuditEvent(db, {
            actorType: 'officer',
            actorId: user.userId,
            action: 'DISPATCH_UNASSIGN_BIN',
            entityType: 'bin',
            entityId: binId,
            details: { previousTruckId: prevTruckId, estimatedKg: bin.estimated_kg },
            ipAddress: req.ip,
          });
        })();

        res.json({ message: `Bin '${binId}' successfully unassigned.` });
        return;
      }

      // Case B: Assign to new truck
      const targetTruck = db.prepare(`SELECT * FROM trucks WHERE id = ?`).get(newTruckId) as any;
      if (!targetTruck) {
        res.status(404).json({ error: `Target vehicle '${newTruckId}' not found.`, code: 'TRUCK_NOT_FOUND' });
        return;
      }

      // Check ward scope for target truck
      if (user.role === 'ward_supervisor' && targetTruck.assigned_ward_id !== user.assignedWardId) {
        res.status(403).json({
          error: `Ward scope violation: Target vehicle '${newTruckId}' belongs to another ward.`,
          code: 'WARD_SCOPE_VIOLATION',
        });
        return;
      }

      // Validate truck availability
      if (targetTruck.status === 'Offline') {
        res.status(400).json({
          error: `Vehicle '${targetTruck.id}' (${targetTruck.name}) is currently Offline and cannot accept assignments.`,
          code: 'TRUCK_OFFLINE',
        });
        return;
      }

      // If already assigned to this exact truck, return no-op
      if (bin.assigned_truck_id === newTruckId) {
        res.json({ message: `Bin '${binId}' is already assigned to '${newTruckId}'.` });
        return;
      }

      // Validate payload capacity limit
      const projectedLoad = targetTruck.current_load_kg + bin.estimated_kg;
      if (projectedLoad > targetTruck.capacity_kg) {
        res.status(400).json({
          error: `Reassignment exceeds vehicle capacity (${projectedLoad} kg > ${targetTruck.capacity_kg} kg limit).`,
          code: 'CAPACITY_EXCEEDED',
          details: { projectedLoad, capacityKg: targetTruck.capacity_kg },
        });
        return;
      }

      // Execute atomic transaction preserving mutex
      db.transaction(() => {
        const prevTruckId = bin.assigned_truck_id;

        // 1. Decrement load on old truck if moving from another truck
        if (prevTruckId && prevTruckId !== newTruckId) {
          db.prepare(`
            UPDATE trucks 
            SET current_load_kg = MAX(0, current_load_kg - ?), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(bin.estimated_kg, prevTruckId);
        }

        // 2. Increment load on new truck
        db.prepare(`
          UPDATE trucks 
          SET current_load_kg = current_load_kg + ?, status = 'Assigned', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(bin.estimated_kg, newTruckId);

        // 3. Update bin assignment
        db.prepare(`
          UPDATE bins 
          SET assigned_truck_id = ?, collection_status = 'assigned', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newTruckId, binId);

        logAuditEvent(db, {
          actorType: 'officer',
          actorId: user.userId,
          action: 'DISPATCH_REASSIGN_BIN',
          entityType: 'bin',
          entityId: binId,
          details: {
            fromTruckId: prevTruckId || null,
            toTruckId: newTruckId,
            estimatedKg: bin.estimated_kg,
            projectedLoad,
          },
          ipAddress: req.ip,
        });
      })();

      res.json({
        message: `Bin '${binId}' successfully assigned to vehicle '${newTruckId}'.`,
        assignedTruckId: newTruckId,
      });
    } catch (err) {
      next(err);
    }
  }
);

const simulateSensorSchema = z.object({
  binId: z.string().min(1, 'binId is required'),
  newFillPercent: z.number().min(0).max(100),
});

// POST /api/dispatch/simulate-sensor - Spikes bin fill and triggers auto-dispatch if critical (>= 85%)
dispatchRouter.post(
  '/simulate-sensor',
  requireAuth,
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { binId, newFillPercent } = simulateSensorSchema.parse(req.body);
      const db = getDb();
      const result = simulateSensorTrigger(db, binId, newFillPercent);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/dispatch/activity-stream - Fetch recent audit and auto-dispatch logs
dispatchRouter.get(
  '/activity-stream',
  requireAuth,
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const db = getDb();
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const activities = getActivityStream(db, limit);
      res.json({ activities });
    } catch (err) {
      next(err);
    }
  }
);

