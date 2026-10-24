import crypto from 'node:crypto';
import { Database as DatabaseType } from 'better-sqlite3';
import { env } from '../config/env.js';
import { normalizePhone } from '../db/seed.js';

export interface SmsProvider {
  sendOtp(phoneNumber: string, code: string): Promise<boolean>;
}

export class DevelopmentSmsProvider implements SmsProvider {
  private lastOtpMap: Map<string, { code: string; expiresAt: number }> = new Map();

  async sendOtp(phoneNumber: string, code: string): Promise<boolean> {
    if (env.NODE_ENV === 'production' || !env.OTP_DEV_MODE) {
      throw new Error('Development SMS delivery adapter is disabled in production.');
    }
    const cleanPhone = normalizePhone(phoneNumber);
    this.lastOtpMap.set(cleanPhone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
    // Secure local development logging — NEVER sent to client or returned in JSON responses
    console.log(`\n======================================================`);
    console.log(`[SECURE LOCAL DEV OTP DELIVERY ADAPTER]`);
    console.log(`Recipient Phone : ${cleanPhone}`);
    console.log(`One-Time Password: ${code}`);
    console.log(`Expires In      : 5 minutes (Max 3 attempts, Single-Use)`);
    console.log(`======================================================\n`);
    return true;
  }

  getDevOtp(phoneNumber: string): string | null {
    if (env.NODE_ENV === 'production' || !env.OTP_DEV_MODE) return null;
    const cleanPhone = normalizePhone(phoneNumber);
    const item = this.lastOtpMap.get(cleanPhone);
    if (!item || item.expiresAt < Date.now()) return null;
    return item.code;
  }
}

const smsProvider = new DevelopmentSmsProvider();

export function getDevActiveOtp(phoneNumber: string): string | null {
  return smsProvider.getDevOtp(normalizePhone(phoneNumber));
}

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export interface RequestOtpResult {
  success: boolean;
  error?: string;
  cooldownSeconds?: number;
}

export async function requestDriverOtp(
  db: DatabaseType,
  rawPhone: string,
  provider: SmsProvider = smsProvider
): Promise<RequestOtpResult> {
  const phone = normalizePhone(rawPhone);

  if (!phone || phone.length < 10) {
    return {
      success: false,
      error: 'Please enter a valid 10-digit mobile number.',
    };
  }

  // 1. Verify that driver exists and is active (match 10-digit, +91, 0 prefix, or stripped punctuation)
  const driver = db.prepare(`
    SELECT id, name, is_active, phone_number FROM drivers
    WHERE phone_number = ? 
       OR phone_number = ? 
       OR phone_number = ? 
       OR phone_number = ?
       OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '+91', ''), '+', ''), '91', '') = ?
  `).get(phone, `+91${phone}`, `91${phone}`, `0${phone}`, phone) as any;

  if (!driver) {
    return {
      success: false,
      error: 'Phone number not registered or driver profile is not provisioned.',
    };
  }

  if (driver.is_active !== 1) {
    return {
      success: false,
      error: 'Driver profile has been deactivated. Please contact your ward supervisor.',
    };
  }

  // 2. Check rate limit / cooldown (1 request per 60 seconds)
  const recentRequest = db.prepare(`
    SELECT created_at FROM otp_requests
    WHERE (phone_number = ? OR phone_number = ? OR phone_number = ?)
      AND datetime(created_at) > datetime('now', '-60 seconds')
    ORDER BY created_at DESC LIMIT 1
  `).get(phone, `+91${phone}`, `91${phone}`) as any;

  if (recentRequest) {
    return {
      success: false,
      error: 'OTP request rate limit exceeded. Please wait 60 seconds before requesting another code.',
      cooldownSeconds: 60,
    };
  }

  // 3. Invalidate any existing active OTPs for this driver
  db.prepare(`
    UPDATE otp_requests
    SET consumed_at = CURRENT_TIMESTAMP
    WHERE driver_id = ? AND consumed_at IS NULL
  `).run(driver.id);

  // 4. Generate cryptographically secure 6-digit numeric OTP (100000 - 999999)
  const codeInt = crypto.randomInt(100000, 1000000);
  const code = codeInt.toString();
  const otpHash = hashOtp(code);
  const otpId = `OTP-${crypto.randomUUID()}`;

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO otp_requests (
      id, phone_number, driver_id, otp_hash, expires_at, attempt_count, max_attempts
    ) VALUES (?, ?, ?, ?, ?, 0, 3)
  `).run(otpId, phone, driver.id, otpHash, expiresAt);

  // 5. Deliver OTP via configured provider
  try {
    await provider.sendOtp(phone, code);
  } catch (deliveryErr: any) {
    console.error('[OTP Delivery Error]', deliveryErr);
    return {
      success: false,
      error: deliveryErr.message || 'Failed to dispatch verification code.',
    };
  }

  return { success: true };
}

export interface VerifyOtpResult {
  success: boolean;
  driver?: {
    id: string;
    name: string;
    phone_number: string;
    assigned_ward_id: string;
    assigned_truck_id: string | null;
  };
  error?: string;
  attemptsRemaining?: number;
}

export function verifyDriverOtp(
  db: DatabaseType,
  rawPhone: string,
  enteredCode: string
): VerifyOtpResult {
  const phone = normalizePhone(rawPhone);

  const driver = db.prepare(`
    SELECT id, name, phone_number, assigned_ward_id, assigned_truck_id, is_active
    FROM drivers
    WHERE phone_number = ? 
       OR phone_number = ? 
       OR phone_number = ? 
       OR phone_number = ?
       OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '+91', ''), '+', ''), '91', '') = ?
  `).get(phone, `+91${phone}`, `91${phone}`, `0${phone}`, phone) as any;

  if (!driver || driver.is_active !== 1) {
    return { success: false, error: 'Driver profile not found or inactive.' };
  }

  // Find latest active OTP request for this phone (check both formats)
  const otpRecord = db.prepare(`
    SELECT id, otp_hash, expires_at, attempt_count, max_attempts, consumed_at
    FROM otp_requests
    WHERE (phone_number = ? OR phone_number = ? OR phone_number = ?) AND consumed_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  `).get(phone, `+91${phone}`, `91${phone}`) as any;

  if (!otpRecord) {
    return { success: false, error: 'No active OTP request found. Please request a new code.' };
  }

  // Check expiration
  if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
    db.prepare(`UPDATE otp_requests SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(otpRecord.id);
    return { success: false, error: 'OTP code has expired. Please request a new one.' };
  }

  // Check attempt limit
  if (otpRecord.attempt_count >= otpRecord.max_attempts) {
    db.prepare(`UPDATE otp_requests SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(otpRecord.id);
    return { success: false, error: 'Maximum verification attempts exceeded. Code has been invalidated.' };
  }

  // Verify hash using constant-time comparison to prevent timing attacks
  const enteredHash = hashOtp(enteredCode);
  const hashMatches = crypto.timingSafeEqual(
    Buffer.from(enteredHash, 'hex'),
    Buffer.from(otpRecord.otp_hash, 'hex')
  );

  if (!hashMatches) {
    const newAttempts = otpRecord.attempt_count + 1;
    db.prepare(`UPDATE otp_requests SET attempt_count = ? WHERE id = ?`).run(newAttempts, otpRecord.id);
    const attemptsRemaining = Math.max(0, otpRecord.max_attempts - newAttempts);
    return {
      success: false,
      error: `Incorrect OTP code. ${attemptsRemaining} attempt(s) remaining.`,
      attemptsRemaining,
    };
  }

  // Mark single-use consumption
  db.prepare(`
    UPDATE otp_requests SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(otpRecord.id);

  return {
    success: true,
    driver: {
      id: driver.id,
      name: driver.name,
      phone_number: driver.phone_number,
      assigned_ward_id: driver.assigned_ward_id,
      assigned_truck_id: driver.assigned_truck_id,
    },
  };
}
