import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/connection.js';
import { validateSessionToken, SessionData } from '../services/authService.js';

// Extend Express Request interface to include session user
declare global {
  namespace Express {
    interface Request {
      user?: SessionData;
    }
  }
}

export const SESSION_COOKIE_NAME = 'wastewise_session';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || 
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  if (!token) {
    res.status(401).json({
      error: 'Authentication required. Please sign in to access this resource.',
      code: 'UNAUTHENTICATED',
    });
    return;
  }

  const db = getDb();
  const session = validateSessionToken(db, token);

  if (!session) {
    res.clearCookie(SESSION_COOKIE_NAME);
    res.status(401).json({
      error: 'Session is invalid or has expired. Please sign in again.',
      code: 'SESSION_EXPIRED',
    });
    return;
  }

  req.user = session;
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Role '${req.user.role}' is not authorized for this action.`,
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
}

export function requireWardScope(wardIdParam: string = 'wardId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
      return;
    }

    // Municipal heads have citywide access across all wards
    if (req.user.role === 'municipal_head') {
      return next();
    }

    // Ward supervisors are strictly scoped to their assigned ward
    if (req.user.role === 'ward_supervisor') {
      const targetWardId = req.params[wardIdParam] || req.body[wardIdParam] || req.query[wardIdParam];
      
      if (!targetWardId || targetWardId !== req.user.assignedWardId) {
        res.status(403).json({
          error: `Access denied. Supervisors are only authorized to access their assigned ward (${req.user.assignedWardId}).`,
          code: 'WARD_SCOPE_VIOLATION',
        });
        return;
      }

      return next();
    }

    res.status(403).json({ error: 'Access denied.', code: 'FORBIDDEN' });
  };
}

export function requireDriverOwnership(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.userType !== 'driver') {
    res.status(403).json({ error: 'Driver access required.', code: 'FORBIDDEN' });
    return;
  }

  if (!req.user.assignedTruckId) {
    res.status(403).json({
      error: 'Driver is not currently assigned to an operational vehicle.',
      code: 'NO_ASSIGNED_TRUCK',
    });
    return;
  }

  next();
}
