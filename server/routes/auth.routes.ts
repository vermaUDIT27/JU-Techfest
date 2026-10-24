import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import {
  verifyPassword,
  createSession,
  revokeSession,
} from '../services/authService.js';
import { requestDriverOtp, verifyDriverOtp, getDevActiveOtp } from '../services/otpService.js';
import { logAuditEvent } from '../services/auditService.js';
import { requireAuth, SESSION_COOKIE_NAME } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { env } from '../config/env.js';

export const authRouter = Router();

const officerLoginSchema = z.object({
  identifier: z.string().min(3, 'Identifier must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const driverRequestOtpSchema = z.object({
  phone: z.string().min(10, 'Valid 10-digit mobile number required'),
});

const driverVerifyOtpSchema = z.object({
  phone: z.string().min(10, 'Valid 10-digit mobile number required'),
  otp: z.string().length(6, 'OTP must be a 6-digit code'),
});

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: env.SESSION_MAX_AGE_HOURS * 60 * 60 * 1000,
    path: '/',
  });
}

// 1. Officer Login
authRouter.post(
  '/officer/login',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { identifier, password } = officerLoginSchema.parse(req.body);
      const db = getDb();

      // Look up officer by unique identifier
      const officer = db.prepare(`
        SELECT id, name, identifier, password_hash, role, assigned_ward_id, is_active
        FROM officers
        WHERE identifier = ?
      `).get(identifier) as any;

      // Constant-time check: even if officer doesn't exist, verify a dummy hash to prevent timing enumeration
      if (!officer || officer.is_active !== 1) {
        await verifyPassword(password, '$2a$12$e80yqZf1n29q8d7F5vL6zO1yN2vN6u9L2e80yqZf1n29q8d7F5vL6');
        res.status(401).json({
          error: 'Invalid credentials or inactive officer account.',
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }

      const passwordValid = await verifyPassword(password, officer.password_hash);
      if (!passwordValid) {
        logAuditEvent(db, {
          actorType: 'anonymous',
          action: 'OFFICER_LOGIN_FAILED',
          entityType: 'officer',
          entityId: officer.id,
          details: { identifier },
          ipAddress: req.ip,
        });

        res.status(401).json({
          error: 'Invalid credentials or inactive officer account.',
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Create new session token (stored as SHA-256 hash in DB)
      const session = createSession(
        db,
        'officer',
        officer.id,
        officer.role,
        officer.name,
        officer.assigned_ward_id,
        null,
        req.ip,
        req.headers['user-agent']
      );

      setSessionCookie(res, session.token);

      logAuditEvent(db, {
        actorType: 'officer',
        actorId: officer.id,
        action: 'OFFICER_LOGIN_SUCCESS',
        entityType: 'session',
        entityId: session.sessionId,
        details: { role: officer.role, ward: officer.assigned_ward_id },
        ipAddress: req.ip,
      });

      res.json({
        message: 'Authentication successful',
        user: {
          id: officer.id,
          name: officer.name,
          identifier: officer.identifier,
          role: officer.role,
          assignedWardId: officer.assigned_ward_id,
          userType: 'officer',
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// 2. Driver Request OTP
authRouter.post(
  '/driver/request-otp',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone } = driverRequestOtpSchema.parse(req.body);
      const db = getDb();

      const result = await requestDriverOtp(db, phone);

      if (!result.success) {
        res.status(400).json({
          error: result.error || 'Failed to generate verification code.',
          code: 'OTP_REQUEST_FAILED',
          cooldownSeconds: result.cooldownSeconds,
        });
        return;
      }

      const message = env.OTP_DEV_MODE
        ? 'Development verification code generated (logged to backend terminal).'
        : 'A 6-digit verification code has been dispatched to your mobile number.';

      res.json({
        message,
        validForSeconds: 300,
        devMode: env.OTP_DEV_MODE,
      });
    } catch (err) {
      next(err);
    }
  }
);

// 3b. Development OTP Preview (strictly disabled in production)
authRouter.get(
  '/driver/dev-otp-preview',
  (req: Request, res: Response): void => {
    if (env.NODE_ENV === 'production' || !env.OTP_DEV_MODE) {
      res.status(403).json({ error: 'Dev OTP preview is disabled in production.', code: 'FORBIDDEN' });
      return;
    }
    const phone = typeof req.query.phone === 'string' ? req.query.phone : '';
    const code = getDevActiveOtp(phone);
    if (!code) {
      res.status(404).json({ error: 'No active OTP found for this number or code expired.', code: 'NOT_FOUND' });
      return;
    }
    res.json({
      phone,
      devOtp: code,
      notice: '[DEV ONLY] Active OTP delivered via local development adapter. Subject to normal single-use verification.',
    });
  }
);

// 3. Driver Verify OTP
authRouter.post(
  '/driver/verify-otp',
  authLimiter,
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { phone, otp } = driverVerifyOtpSchema.parse(req.body);
      const db = getDb();

      const result = verifyDriverOtp(db, phone, otp);

      if (!result.success || !result.driver) {
        res.status(400).json({
          error: result.error || 'Invalid or expired OTP code.',
          code: 'OTP_VERIFICATION_FAILED',
          attemptsRemaining: result.attemptsRemaining,
        });
        return;
      }

      const driver = result.driver;

      // Issue driver session
      const session = createSession(
        db,
        'driver',
        driver.id,
        'driver',
        driver.name,
        driver.assigned_ward_id,
        driver.assigned_truck_id,
        req.ip,
        req.headers['user-agent']
      );

      setSessionCookie(res, session.token);

      logAuditEvent(db, {
        actorType: 'driver',
        actorId: driver.id,
        action: 'DRIVER_OTP_LOGIN_SUCCESS',
        entityType: 'session',
        entityId: session.sessionId,
        details: { truckId: driver.assigned_truck_id },
        ipAddress: req.ip,
      });

      res.json({
        message: 'Driver verified successfully',
        user: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone_number,
          role: 'driver',
          assignedWardId: driver.assigned_ward_id,
          assignedTruckId: driver.assigned_truck_id,
          userType: 'driver',
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// 4. Current Authenticated Session Profile (/api/auth/me)
authRouter.get(
  '/me',
  requireAuth,
  (req: Request, res: Response): void => {
    res.json({
      user: {
        id: req.user!.userId,
        name: req.user!.name,
        role: req.user!.role,
        userType: req.user!.userType,
        assignedWardId: req.user!.assignedWardId,
        assignedTruckId: req.user!.assignedTruckId,
        expiresAt: req.user!.expiresAt,
      },
    });
  }
);

// 5. Logout & Revocation (/api/auth/logout)
authRouter.post(
  '/logout',
  requireAuth,
  (req: Request, res: Response): void => {
    const db = getDb();
    if (req.user?.token) {
      revokeSession(db, req.user.token);
    }

    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });

    logAuditEvent(db, {
      actorType: req.user!.userType,
      actorId: req.user!.userId,
      action: 'LOGOUT',
      entityType: 'session',
      entityId: req.user!.sessionId,
      ipAddress: req.ip,
    });

    res.json({ message: 'Session revoked successfully' });
  }
);
