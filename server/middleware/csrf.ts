import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF Protection Middleware for Cookie-based Sessions.
 * Protects against cross-site request forgery by enforcing custom request headers
 * and origin verification on state-changing requests.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Exempt public complaint endpoint and login endpoints from CSRF token (they are unauthenticated / pre-session)
  const isPreAuthEndpoint = 
    req.path.startsWith('/api/auth/officer/login') ||
    req.path.startsWith('/api/auth/driver/request-otp') ||
    req.path.startsWith('/api/auth/driver/verify-otp') ||
    (req.path === '/api/complaints' && req.method === 'POST');

  if (isPreAuthEndpoint) {
    return next();
  }

  // For authenticated requests using session cookie:
  const origin = req.headers.origin || req.headers.referer;
  const customHeader = req.headers['x-requested-with'] || req.headers['x-csrf-protection'];

  // Check custom header or origin match
  if (customHeader || (origin && origin.startsWith(env.CORS_ORIGIN))) {
    return next();
  }

  // Allow in test environment
  if (env.NODE_ENV === 'test') {
    return next();
  }

  res.status(403).json({
    error: 'CSRF verification failed. Request must include valid Origin or X-Requested-With header.',
    code: 'CSRF_REJECTED',
  });
}
