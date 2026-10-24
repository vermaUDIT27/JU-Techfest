import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { getDb } from '../db/connection.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { complaintLimiter } from '../middleware/rateLimiters.js';
import {
  generateComplaintReferenceCode,
  ensureUploadDir,
  validateImageMagicBytes,
} from '../services/complaintService.js';
import { logAuditEvent } from '../services/auditService.js';
import { env } from '../config/env.js';

export const complaintsRouter = Router();

ensureUploadDir();

// Configure secure Multer storage outside public web root with randomized names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cmp-${Date.now()}-${randomHex}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Only JPEG, PNG, and WEBP are permitted.'));
    }
  },
});

const submitComplaintSchema = z.object({
  wardId: z.string().min(1, 'wardId is required'),
  description: z
    .string()
    .min(10, 'Complaint description must be at least 10 characters')
    .max(1000, 'Complaint description cannot exceed 1000 characters'),
});

const updateComplaintSchema = z.object({
  status: z.enum(['submitted', 'under_review', 'assigned', 'resolved', 'rejected']),
  resolutionNotes: z.string().optional(),
});

// 1. Anonymous Public Complaint Submission (POST /api/complaints)
complaintsRouter.post(
  '/',
  complaintLimiter,
  upload.single('photo'),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { wardId, description } = submitComplaintSchema.parse(req.body);
      const db = getDb();

      // Verify ward existence
      const ward = db.prepare(`SELECT id, name FROM wards WHERE id = ?`).get(wardId) as any;
      if (!ward) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(400).json({
          error: `Ward '${wardId}' is not recognized in Pune Municipal Corporation (PMC).`,
          code: 'INVALID_WARD',
        });
        return;
      }

      // If photo was uploaded, verify actual magic bytes (defense against renamed malicious files)
      let photoPath: string | null = null;
      if (req.file) {
        const isGenuineImage = validateImageMagicBytes(req.file.path);
        if (!isGenuineImage) {
          fs.unlinkSync(req.file.path);
          res.status(400).json({
            error: 'Uploaded file is not a valid image format.',
            code: 'INVALID_IMAGE_CONTENT',
          });
          return;
        }
        // Store relative path securely
        photoPath = path.basename(req.file.path);
      }

      const id = `CMP-${crypto.randomUUID()}`;
      const referenceCode = generateComplaintReferenceCode();

      db.prepare(`
        INSERT INTO complaints (
          id, reference_code, ward_id, description, photo_path, status
        ) VALUES (?, ?, ?, ?, ?, 'submitted')
      `).run(id, referenceCode, wardId, description, photoPath);

      logAuditEvent(db, {
        actorType: 'anonymous',
        action: 'PUBLIC_COMPLAINT_SUBMITTED',
        entityType: 'complaint',
        entityId: id,
        details: { referenceCode, wardId, hasPhoto: Boolean(photoPath) },
        ipAddress: req.ip,
      });

      res.status(201).json({
        message: 'Your civic waste complaint has been registered with Pune Municipal Corporation (PMC).',
        referenceCode,
        status: 'submitted',
        privacyNotice: 'No resident identity fields (name, phone, email) were requested or stored.',
      });
    } catch (err) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(err);
    }
  }
);

// 2. Protected Operator Complaint Listing (GET /api/complaints)
complaintsRouter.get(
  '/',
  requireAuth,
  requireRole('municipal_head', 'ward_supervisor'),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const db = getDb();
      const user = req.user!;
      const isHead = user.role === 'municipal_head';

      const query = isHead
        ? `SELECT c.*, w.name as ward_name, o.name as resolved_by_officer_name
           FROM complaints c
           LEFT JOIN wards w ON c.ward_id = w.id
           LEFT JOIN officers o ON c.resolved_by_officer_id = o.id
           ORDER BY c.created_at DESC`
        : `SELECT c.*, w.name as ward_name, o.name as resolved_by_officer_name
           FROM complaints c
           LEFT JOIN wards w ON c.ward_id = w.id
           LEFT JOIN officers o ON c.resolved_by_officer_id = o.id
           WHERE c.ward_id = ?
           ORDER BY c.created_at DESC`;

      const rows = (isHead ? db.prepare(query).all() : db.prepare(query).all(user.assignedWardId)) as any[];

      res.json({
        complaints: rows.map((r) => ({
          id: r.id,
          referenceCode: r.reference_code,
          wardId: r.ward_id,
          wardName: r.ward_name,
          description: r.description,
          hasPhoto: Boolean(r.photo_path),
          status: r.status,
          resolutionNotes: r.resolution_notes,
          resolvedBy: r.resolved_by_officer_name,
          createdAt: r.created_at,
          resolvedAt: r.resolved_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Protected Complaint Resolution (PATCH /api/complaints/:id)
complaintsRouter.patch(
  '/:id',
  requireAuth,
  requireRole('municipal_head', 'ward_supervisor'),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = String(req.params.id);
      const { status, resolutionNotes } = updateComplaintSchema.parse(req.body);
      const db = getDb();
      const user = req.user!;

      const complaint = db.prepare(`SELECT * FROM complaints WHERE id = ?`).get(id) as any;
      if (!complaint) {
        res.status(404).json({ error: 'Complaint not found.', code: 'NOT_FOUND' });
        return;
      }

      // Enforce ward scope
      if (user.role === 'ward_supervisor' && complaint.ward_id !== user.assignedWardId) {
        res.status(403).json({
          error: 'Ward scope violation: Supervisor cannot manage complaints outside assigned ward.',
          code: 'WARD_SCOPE_VIOLATION',
        });
        return;
      }

      const isResolved = status === 'resolved' || status === 'rejected';

      db.prepare(`
        UPDATE complaints
        SET 
          status = ?,
          resolution_notes = ?,
          resolved_by_officer_id = ?,
          resolved_at = ?
        WHERE id = ?
      `).run(
        status,
        resolutionNotes || null,
        user.userId,
        isResolved ? new Date().toISOString() : null,
        id
      );

      logAuditEvent(db, {
        actorType: 'officer',
        actorId: user.userId,
        action: 'COMPLAINT_STATUS_UPDATED',
        entityType: 'complaint',
        entityId: id,
        details: { status, resolutionNotes },
        ipAddress: req.ip,
      });

      res.json({ message: 'Complaint status updated successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

// 4. Protected Complaint Photo Retrieval (GET /api/complaints/:id/photo)
complaintsRouter.get(
  '/:id/photo',
  requireAuth,
  requireRole('municipal_head', 'ward_supervisor'),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = String(req.params.id);
      const db = getDb();
      const user = req.user!;

      const complaint = db.prepare(`SELECT * FROM complaints WHERE id = ?`).get(id) as any;
      if (!complaint || !complaint.photo_path) {
        res.status(404).json({ error: 'Complaint photo not found.', code: 'NOT_FOUND' });
        return;
      }

      if (user.role === 'ward_supervisor' && complaint.ward_id !== user.assignedWardId) {
        res.status(403).json({
          error: 'Ward scope violation: Supervisor cannot inspect photos outside assigned ward.',
          code: 'WARD_SCOPE_VIOLATION',
        });
        return;
      }

      const safeFilename = path.basename(complaint.photo_path);
      const filePath = path.join(env.UPLOAD_DIR, safeFilename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Image file missing on server disk.', code: 'FILE_NOT_FOUND' });
        return;
      }

      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }
);
