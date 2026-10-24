import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Database as DatabaseType } from 'better-sqlite3';
import { env } from '../config/env.js';

const BCRYPT_ROUNDS = 12;

export interface SessionData {
  sessionId: string;
  token: string;
  userType: 'officer' | 'driver';
  userId: string;
  role: string;
  name: string;
  assignedWardId: string | null;
  assignedTruckId: string | null;
  expiresAt: string;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createSession(
  db: DatabaseType,
  userType: 'officer' | 'driver',
  userId: string,
  role: string,
  name: string,
  assignedWardId: string | null,
  assignedTruckId: string | null,
  ipAddress?: string,
  userAgent?: string
): SessionData {
  // Generate cryptographically random opaque 256-bit token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const sessionId = `SES-${crypto.randomUUID()}`;

  const expiresDate = new Date(Date.now() + env.SESSION_MAX_AGE_HOURS * 60 * 60 * 1000);
  const expiresAt = expiresDate.toISOString();

  db.prepare(`
    INSERT INTO sessions (
      id, token_hash, user_type, user_id, role,
      assigned_ward_id, assigned_truck_id, expires_at,
      ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sessionId,
    tokenHash,
    userType,
    userId,
    role,
    assignedWardId,
    assignedTruckId,
    expiresAt,
    ipAddress || null,
    userAgent || null
  );

  return {
    sessionId,
    token,
    userType,
    userId,
    role,
    name,
    assignedWardId,
    assignedTruckId,
    expiresAt,
  };
}

export function validateSessionToken(
  db: DatabaseType,
  token: string
): (SessionData & { isActive: boolean }) | null {
  if (!token || typeof token !== 'string') return null;

  const tokenHash = hashToken(token);

  const session = db.prepare(`
    SELECT 
      s.id as sessionId,
      s.token_hash as tokenHash,
      s.user_type as userType,
      s.user_id as userId,
      s.role,
      s.assigned_ward_id as assignedWardId,
      s.assigned_truck_id as assignedTruckId,
      s.expires_at as expiresAt,
      s.revoked_at as revokedAt
    FROM sessions s
    WHERE s.token_hash = ?
      AND s.revoked_at IS NULL
      AND datetime(s.expires_at) > datetime('now')
  `).get(tokenHash) as any;

  if (!session) return null;

  // Verify that the underlying officer or driver is still active!
  let isActive = false;
  let userName = '';

  if (session.userType === 'officer') {
    const officer = db.prepare(`
      SELECT name, is_active FROM officers WHERE id = ?
    `).get(session.userId) as any;
    if (officer && officer.is_active === 1) {
      isActive = true;
      userName = officer.name;
    }
  } else if (session.userType === 'driver') {
    const driver = db.prepare(`
      SELECT name, is_active, assigned_truck_id FROM drivers WHERE id = ?
    `).get(session.userId) as any;
    if (driver && driver.is_active === 1) {
      isActive = true;
      userName = driver.name;
      // Keep assignedTruckId fresh in case it was updated by supervisor
      session.assignedTruckId = driver.assigned_truck_id;
    }
  }

  if (!isActive) {
    // If user is inactive, immediately revoke session
    revokeSession(db, token);
    return null;
  }

  return {
    sessionId: session.sessionId,
    token,
    userType: session.userType,
    userId: session.userId,
    role: session.role,
    name: userName,
    assignedWardId: session.assignedWardId,
    assignedTruckId: session.assignedTruckId,
    expiresAt: session.expiresAt,
    isActive: true,
  };
}

export function revokeSession(db: DatabaseType, token: string): void {
  const tokenHash = hashToken(token);
  db.prepare(`
    UPDATE sessions 
    SET revoked_at = CURRENT_TIMESTAMP 
    WHERE token_hash = ? AND revoked_at IS NULL
  `).run(tokenHash);
}

export function invalidateAllUserSessions(
  db: DatabaseType,
  userType: 'officer' | 'driver',
  userId: string
): void {
  db.prepare(`
    UPDATE sessions 
    SET revoked_at = CURRENT_TIMESTAMP 
    WHERE user_type = ? AND user_id = ? AND revoked_at IS NULL
  `).run(userType, userId);
}
