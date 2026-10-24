import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { logAuditEvent } from '../services/auditService.js';

export const collectionsRouter = Router();

const recordCollectionSchema = z.object({
  binId: z.string().min(1, 'binId is required'),
  truckId: z.string().min(1, 'truckId is required'),
  action: z.enum(['collected', 'unable_to_collect']),
  failureReason: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

// POST /api/collections/record - Transactional collection logging with idempotency & race condition defense
collectionsRouter.post(
  '/record',
  requireAuth,
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const {
        binId,
        truckId,
        action,
        failureReason,
        notes,
        idempotencyKey,
      } = recordCollectionSchema.parse(req.body);

      const db = getDb();
      const user = req.user!;

      // 1. Authorization: If driver, verify they own this truck
      if (user.userType === 'driver') {
        if (!user.assignedTruckId || user.assignedTruckId !== truckId) {
          res.status(403).json({
            error: `Access denied. Driver is only authorized to operate vehicle '${user.assignedTruckId}'.`,
            code: 'DRIVER_OWNERSHIP_VIOLATION',
          });
          return;
        }
      }

      // 2. Fetch Bin
      const bin = db.prepare(`SELECT * FROM bins WHERE id = ?`).get(binId) as any;
      if (!bin) {
        res.status(404).json({ error: `Dustbin '${binId}' not found.`, code: 'BIN_NOT_FOUND' });
        return;
      }

      // If supervisor, verify ward scope
      if (user.role === 'ward_supervisor' && bin.ward_id !== user.assignedWardId) {
        res.status(403).json({
          error: `Ward scope violation: Supervisor cannot record collection in ward '${bin.ward_id}'.`,
          code: 'WARD_SCOPE_VIOLATION',
        });
        return;
      }

      // 3. Fetch Truck
      const truck = db.prepare(`SELECT * FROM trucks WHERE id = ?`).get(truckId) as any;
      if (!truck) {
        res.status(404).json({ error: `Vehicle '${truckId}' not found.`, code: 'TRUCK_NOT_FOUND' });
        return;
      }

      // 4. Idempotency Key Guard: check if an event with this exact key already exists
      if (idempotencyKey) {
        const existingEvent = db.prepare(`
          SELECT * FROM collection_events WHERE idempotency_key = ?
        `).get(idempotencyKey) as any;

        if (existingEvent) {
          res.json({
            message: 'Idempotent request: collection event already processed.',
            isDuplicate: true,
            event: {
              id: existingEvent.id,
              result: existingEvent.result,
              weightKg: existingEvent.weight_kg,
              timestamp: existingEvent.created_at,
            },
          });
          return;
        }
      }

      // 5. Transactional Execution with Atomic Mutex
      const eventId = `EVT-${crypto.randomUUID()}`;
      const effectiveKey = idempotencyKey || `AUTO-${eventId}`;

      if (action === 'collected') {
        let collectionSucceeded = false;
        let collectedWeight = 0;

        db.transaction(() => {
          // ATOMIC CONDITIONAL UPDATE:
          // Only updates the bin if it is NOT ALREADY marked 'collected'.
          // If two concurrent requests hit this row, SQLite row locking ensures only ONE gets changes = 1!
          const result = db.prepare(`
            UPDATE bins
            SET 
              collection_status = 'collected',
              current_fill_percent = 5,
              estimated_kg = ROUND(0.05 * (capacity_liters * 0.35)),
              risk_category = 'low',
              last_collected_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND collection_status != 'collected'
          `).run(binId);

          if (result.changes === 0) {
            // Already collected by another concurrent worker or double tap!
            collectionSucceeded = false;
            return;
          }

          collectionSucceeded = true;
          collectedWeight = bin.estimated_kg;

          // Atomically increment truck load, capped at vehicle capacity
          db.prepare(`
            UPDATE trucks
            SET 
              current_load_kg = MIN(capacity_kg, current_load_kg + ?),
              status = 'Collecting',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(collectedWeight, truckId);

          const driverId = user.userType === 'driver' ? user.userId : null;

          // Insert immutable collection audit event
          db.prepare(`
            INSERT INTO collection_events (
              id, idempotency_key, bin_id, truck_id, driver_id,
              result, weight_kg, fill_percent_before, notes, is_simulated
            ) VALUES (?, ?, ?, ?, ?, 'collected', ?, ?, ?, 1)
          `).run(
            eventId,
            effectiveKey,
            binId,
            truckId,
            driverId,
            collectedWeight,
            bin.current_fill_percent,
            notes || null
          );

          logAuditEvent(db, {
            actorType: user.userType,
            actorId: user.userId,
            action: 'COLLECTION_RECORD_SUCCESS',
            entityType: 'bin',
            entityId: binId,
            details: { truckId, weightKg: collectedWeight },
            ipAddress: req.ip,
          });
        })();

        if (!collectionSucceeded) {
          // Idempotent duplicate response: 0 weight added
          res.json({
            message: 'Bin is already marked collected. No additional weight added.',
            isDuplicate: true,
            weightKg: 0,
          });
          return;
        }

        res.json({
          message: `Bin '${bin.code}' successfully collected. ${collectedWeight} kg added to payload.`,
          isDuplicate: false,
          event: {
            id: eventId,
            binId,
            truckId,
            result: 'collected',
            weightKg: collectedWeight,
          },
        });
      } else {
        // Unable to collect
        const driverId = user.userType === 'driver' ? user.userId : null;

        db.transaction(() => {
          db.prepare(`
            UPDATE bins
            SET collection_status = 'unable_to_collect', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(binId);

          db.prepare(`
            INSERT INTO collection_events (
              id, idempotency_key, bin_id, truck_id, driver_id,
              result, weight_kg, fill_percent_before, failure_reason, notes, is_simulated
            ) VALUES (?, ?, ?, ?, ?, 'unable_to_collect', 0, ?, ?, ?, 1)
          `).run(
            eventId,
            effectiveKey,
            binId,
            truckId,
            driverId,
            bin.current_fill_percent,
            failureReason || 'road_blocked',
            notes || null
          );

          logAuditEvent(db, {
            actorType: user.userType,
            actorId: user.userId,
            action: 'COLLECTION_RECORD_UNABLE',
            entityType: 'bin',
            entityId: binId,
            details: { failureReason, notes },
            ipAddress: req.ip,
          });
        })();

        res.json({
          message: `Bin marked unable to collect. Reason: ${failureReason || 'road_blocked'}.`,
          isDuplicate: false,
          event: {
            id: eventId,
            binId,
            truckId,
            result: 'unable_to_collect',
            failureReason,
          },
        });
      }
    } catch (err) {
      next(err);
    }
  }
);
