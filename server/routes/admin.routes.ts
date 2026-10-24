import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { getDb } from '../db/connection.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { invalidateAllUserSessions } from '../services/authService.js';
import { logAuditEvent } from '../services/auditService.js';
import { normalizePhone } from '../db/seed.js';

export const adminRouter = Router();

const provisionDriverSchema = z.object({
  name: z.string().min(2, 'Driver name required'),
  phone: z.string().min(10, 'Valid 10-digit phone required'),
  wardId: z.string().min(1, 'wardId is required'),
  truckId: z.string().nullable().optional(),
});

const updateDriverSchema = z.object({
  name: z.string().min(2).optional(),
  truckId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// 1. List Drivers (GET /api/admin/drivers)
adminRouter.get(
  '/drivers',
  requireAuth,
  requireRole('municipal_head', 'ward_supervisor'),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const db = getDb();
      const user = req.user!;
      const isHead = user.role === 'municipal_head';

      const query = isHead
        ? `SELECT d.*, t.name as truck_name, w.name as ward_name
           FROM drivers d
           LEFT JOIN trucks t ON d.assigned_truck_id = t.id
           LEFT JOIN wards w ON d.assigned_ward_id = w.id
           ORDER BY d.name ASC`
        : `SELECT d.*, t.name as truck_name, w.name as ward_name
           FROM drivers d
           LEFT JOIN trucks t ON d.assigned_truck_id = t.id
           LEFT JOIN wards w ON d.assigned_ward_id = w.id
           WHERE d.assigned_ward_id = ?
           ORDER BY d.name ASC`;

      const drivers = (isHead ? db.prepare(query).all() : db.prepare(query).all(user.assignedWardId)) as any[];

      res.json({
        drivers: drivers.map((d) => ({
          id: d.id,
          name: d.name,
          phone: d.phone_number,
          wardId: d.assigned_ward_id,
          wardName: d.ward_name,
          truckId: d.assigned_truck_id,
          truckName: d.truck_name,
          isActive: Boolean(d.is_active),
          createdAt: d.created_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// 2. Provision New Driver (POST /api/admin/drivers)
adminRouter.post(
  '/drivers',
  requireAuth,
  requireRole('municipal_head', 'ward_supervisor'),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { name, phone: rawPhone, wardId, truckId } = provisionDriverSchema.parse(req.body);
      const phone = normalizePhone(rawPhone);
      const db = getDb();
      const user = req.user!;

      // Enforce ward scope
      if (user.role === 'ward_supervisor' && wardId !== user.assignedWardId) {
        res.status(403).json({
          error: 'Ward scope violation: Supervisor cannot provision drivers in another ward.',
          code: 'WARD_SCOPE_VIOLATION',
        });
        return;
      }

      // Check phone uniqueness
      const existing = db.prepare(`SELECT id FROM drivers WHERE phone_number = ?`).get(phone) as any;
      if (existing) {
        res.status(400).json({
          error: 'A driver with this mobile phone number is already registered.',
          code: 'PHONE_EXISTS',
        });
        return;
      }

      const driverId = `DRV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      db.prepare(`
        INSERT INTO drivers (
          id, name, phone_number, assigned_ward_id, assigned_truck_id, is_active
        ) VALUES (?, ?, ?, ?, ?, 1)
      `).run(driverId, name, phone, wardId, truckId || null);

      logAuditEvent(db, {
        actorType: 'officer',
        actorId: user.userId,
        action: 'DRIVER_PROVISIONED',
        entityType: 'driver',
        entityId: driverId,
        details: { name, phone, wardId, truckId },
        ipAddress: req.ip,
      });

      res.status(201).json({
        message: 'Driver profile provisioned successfully.',
        driverId,
      });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Update Driver / Deactivate (PATCH /api/admin/drivers/:id)
adminRouter.patch(
  '/drivers/:id',
  requireAuth,
  requireRole('municipal_head', 'ward_supervisor'),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = String(req.params.id);
      const { name, truckId, isActive } = updateDriverSchema.parse(req.body);
      const db = getDb();
      const user = req.user!;

      const driver = db.prepare(`SELECT * FROM drivers WHERE id = ?`).get(id) as any;
      if (!driver) {
        res.status(404).json({ error: 'Driver profile not found.', code: 'NOT_FOUND' });
        return;
      }

      // Enforce ward scope
      if (user.role === 'ward_supervisor' && driver.assigned_ward_id !== user.assignedWardId) {
        res.status(403).json({
          error: 'Ward scope violation: Cannot manage driver outside assigned ward.',
          code: 'WARD_SCOPE_VIOLATION',
        });
        return;
      }

      const newName = name !== undefined ? name : driver.name;
      const newTruck = truckId !== undefined ? truckId : driver.assigned_truck_id;
      const newActive = isActive !== undefined ? (isActive ? 1 : 0) : driver.is_active;

      db.prepare(`
        UPDATE drivers
        SET name = ?, assigned_truck_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newName, newTruck, newActive, id);

      // SECURITY CRITICAL: If driver is deactivated, immediately invalidate all their active sessions!
      if (isActive === false) {
        invalidateAllUserSessions(db, 'driver', id);
        logAuditEvent(db, {
          actorType: 'officer',
          actorId: user.userId,
          action: 'DRIVER_DEACTIVATED_SESSIONS_REVOKED',
          entityType: 'driver',
          entityId: id,
          ipAddress: req.ip,
        });
      }

      res.json({ message: 'Driver profile updated successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

// 4. Scoped Audit Logs (GET /api/admin/audit-logs)
adminRouter.get(
  '/audit-logs',
  requireAuth,
  requireRole('municipal_head', 'ward_supervisor'),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const db = getDb();
      const user = req.user!;
      const isHead = user.role === 'municipal_head';

      // Scoped audit trail
      const logs = db.prepare(`
        SELECT * FROM audit_logs
        ORDER BY created_at DESC LIMIT 100
      `).all() as any[];

      res.json({
        auditLogs: logs.map((l) => ({
          id: l.id,
          actorType: l.actor_type,
          actorId: l.actor_id,
          action: l.action,
          entityType: l.entity_type,
          entityId: l.entity_id,
          details: l.details_json ? JSON.parse(l.details_json) : null,
          ipAddress: isHead ? l.ip_address : undefined, // Mask raw IPs for supervisors
          createdAt: l.created_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);
