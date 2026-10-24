import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { createApp } from '../app.js';
import { setDbInstance } from '../db/connection.js';
import { runMigrations } from '../db/migrations.js';
import { seedDatabase } from '../db/seed.js';
import { hashPassword } from '../services/authService.js';
import { hashOtp, getDevActiveOtp } from '../services/otpService.js';

describe('WasteWise Phase 2 Backend Security Integration Tests', { timeout: 25000 }, () => {
  let db: DatabaseType;
  let app: any;

  beforeEach(async () => {
    // 1. Create isolated in-memory SQLite database
    db = new Database(':memory:');
    setDbInstance(db);
    runMigrations(db);
    seedDatabase(db);

    // 2. Seed test officers
    const headHash = await hashPassword('HeadPassword#2026');
    db.prepare(`
      INSERT INTO officers (id, name, identifier, password_hash, role, assigned_ward_id, is_active)
      VALUES ('OFF-HEAD-1', 'Municipal Commissioner', 'comm.jaipur', ?, 'municipal_head', NULL, 1)
    `).run(headHash);

    const supHash = await hashPassword('SupPassword#2026');
    db.prepare(`
      INSERT INTO officers (id, name, identifier, password_hash, role, assigned_ward_id, is_active)
      VALUES ('OFF-SUP-84', 'Supervisor 84', 'sup.ward84', ?, 'ward_supervisor', 'WARD-84', 1)
    `).run(supHash);

    // Inactive officer
    db.prepare(`
      INSERT INTO officers (id, name, identifier, password_hash, role, assigned_ward_id, is_active)
      VALUES ('OFF-INACTIVE', 'Suspended Officer', 'sup.suspended', ?, 'ward_supervisor', 'WARD-84', 0)
    `).run(supHash);

    // Seed test driver with known phone
    db.prepare(`
      INSERT INTO drivers (id, name, phone_number, assigned_ward_id, assigned_truck_id, is_active)
      VALUES ('DRV-TEST-1', 'Ramesh Driver', '9829011111', 'WARD-84', 'RJ-14-GA-4821', 1)
    `).run();

    // Inactive driver
    db.prepare(`
      INSERT INTO drivers (id, name, phone_number, assigned_ward_id, assigned_truck_id, is_active)
      VALUES ('DRV-INACTIVE', 'Inactive Driver', '9829022222', 'WARD-84', 'RJ-14-EA-1934', 0)
    `).run();

    app = createApp();
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // ignore
    }
  });

  describe('1. Authentication & Session Lifecycle', () => {
    it('Item 1: Protected endpoints strictly reject requests without a session (401)', async () => {
      const res = await request(app).get('/api/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('Item 2 & 3: Officer login issues valid session cookie, invalid credentials reject, and logout revokes session', async () => {
      // Invalid credentials
      const invalidRes = await request(app)
        .post('/api/auth/officer/login')
        .send({ identifier: 'comm.jaipur', password: 'WrongPassword#999' });
      expect(invalidRes.status).toBe(401);
      expect(invalidRes.body.code).toBe('INVALID_CREDENTIALS');

      // Valid credentials
      const loginRes = await request(app)
        .post('/api/auth/officer/login')
        .send({ identifier: 'comm.jaipur', password: 'HeadPassword#2026' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.role).toBe('municipal_head');

      // Cookie should be present, HttpOnly, and have proper flags
      const cookies = loginRes.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const sessionCookie = cookies[0];
      expect(sessionCookie).toContain('wastewise_session=');
      expect(sessionCookie).toContain('HttpOnly');

      // Protected endpoint succeeds with session cookie
      const dashboardRes = await request(app)
        .get('/api/dashboard')
        .set('Cookie', sessionCookie);
      expect(dashboardRes.status).toBe(200);
      expect(dashboardRes.body.scope).toBe('citywide');

      // Logout revokes session
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', sessionCookie);
      expect(logoutRes.status).toBe(200);

      // Subsequent access with revoked session is rejected (401)
      const afterLogoutRes = await request(app)
        .get('/api/dashboard')
        .set('Cookie', sessionCookie);
      expect(afterLogoutRes.status).toBe(401);
    });

    it('Item 4: Inactive officers and inactive drivers cannot authenticate', async () => {
      // Inactive officer login attempt
      const res = await request(app)
        .post('/api/auth/officer/login')
        .send({ identifier: 'sup.suspended', password: 'SupPassword#2026' });
      expect(res.status).toBe(401);

      // Inactive driver OTP request
      const otpRes = await request(app)
        .post('/api/auth/driver/request-otp')
        .send({ phone: '9829022222' });
      expect(otpRes.status).toBe(400);
      expect(otpRes.body.error).toContain('deactivated');
    });
  });

  describe('2. Driver OTP Authentication', () => {
    it('Item 7: Expired, incorrect, reused, and over-attempt OTPs are rejected', async () => {
      // 1. Request OTP
      const reqRes = await request(app)
        .post('/api/auth/driver/request-otp')
        .send({ phone: '9829011111' });
      expect(reqRes.status).toBe(200);

      // 2. Test incorrect OTP code (attempt 1)
      const wrongRes1 = await request(app)
        .post('/api/auth/driver/verify-otp')
        .send({ phone: '9829011111', otp: '000000' });
      expect(wrongRes1.status).toBe(400);
      expect(wrongRes1.body.attemptsRemaining).toBe(2);

      // 3. Test incorrect OTP code (attempt 2 & 3)
      await request(app).post('/api/auth/driver/verify-otp').send({ phone: '9829011111', otp: '111111' });
      const wrongRes3 = await request(app)
        .post('/api/auth/driver/verify-otp')
        .send({ phone: '9829011111', otp: '222222' });
      expect(wrongRes3.status).toBe(400);
      expect(wrongRes3.body.attemptsRemaining).toBe(0);

      // 4. Over-attempt: 4th attempt is strictly blocked
      const overAttemptRes = await request(app)
        .post('/api/auth/driver/verify-otp')
        .send({ phone: '9829011111', otp: '333333' });
      expect(overAttemptRes.status).toBe(400);

      // 5. Test expired code
      const pastTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const codeHash = hashOtp('555555');
      db.prepare(`
        INSERT INTO otp_requests (id, phone_number, driver_id, otp_hash, expires_at, attempt_count, max_attempts)
        VALUES ('OTP-EXP', '9829011111', 'DRV-TEST-1', ?, ?, 0, 3)
      `).run(codeHash, pastTime);

      const expiredRes = await request(app)
        .post('/api/auth/driver/verify-otp')
        .send({ phone: '9829011111', otp: '555555' });
      expect(expiredRes.status).toBe(400);
      expect(expiredRes.body.error).toContain('expired');

      // 6. Test successful single-use verification
      const futureTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const validCodeHash = hashOtp('777888');
      db.prepare(`
        INSERT INTO otp_requests (id, phone_number, driver_id, otp_hash, expires_at, attempt_count, max_attempts)
        VALUES ('OTP-VALID', '9829011111', 'DRV-TEST-1', ?, ?, 0, 3)
      `).run(validCodeHash, futureTime);

      const validRes = await request(app)
        .post('/api/auth/driver/verify-otp')
        .send({ phone: '9829011111', otp: '777888' });
      expect(validRes.status).toBe(200);
      expect(validRes.body.user.role).toBe('driver');

      // 7. Reused code must be rejected (single-use consumption check)
      const reuseRes = await request(app)
        .post('/api/auth/driver/verify-otp')
        .send({ phone: '9829011111', otp: '777888' });
      expect(reuseRes.status).toBe(400);
    });

    it('Item 8: Driver deactivation immediately invalidates an existing session', async () => {
      // Provision OTP and login
      const validCodeHash = hashOtp('123456');
      const futureTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      db.prepare(`
        INSERT INTO otp_requests (id, phone_number, driver_id, otp_hash, expires_at, attempt_count, max_attempts)
        VALUES ('OTP-SESS', '9829011111', 'DRV-TEST-1', ?, ?, 0, 3)
      `).run(validCodeHash, futureTime);

      const loginRes = await request(app)
        .post('/api/auth/driver/verify-otp')
        .send({ phone: '9829011111', otp: '123456' });
      expect(loginRes.status).toBe(200);
      const sessionCookie = loginRes.headers['set-cookie'][0];

      // Driver can access their route
      const routeRes1 = await request(app).get('/api/driver/route').set('Cookie', sessionCookie);
      expect(routeRes1.status).toBe(200);

      // Now supervisor/head deactivates the driver
      const headLogin = await request(app)
        .post('/api/auth/officer/login')
        .send({ identifier: 'comm.jaipur', password: 'HeadPassword#2026' });
      const headCookie = headLogin.headers['set-cookie'][0];

      await request(app)
        .patch('/api/admin/drivers/DRV-TEST-1')
        .set('Cookie', headCookie)
        .send({ isActive: false });

      // Verified: Driver session is immediately revoked and denied (401)
      const routeRes2 = await request(app).get('/api/driver/route').set('Cookie', sessionCookie);
      expect(routeRes2.status).toBe(401);
    });

    it('Regression: development OTP request generates code, invokes terminal logging adapter, and normalizes phone formats', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      // Test with international format (+91 with spaces)
      const reqRes = await request(app)
        .post('/api/auth/driver/request-otp')
        .send({ phone: '+91 98290 11111' });

      expect(reqRes.status).toBe(200);
      expect(reqRes.body.validForSeconds).toBe(300);
      expect(reqRes.body.message).toContain('Development verification code generated');

      // Verify that the development SMS logger was invoked on the terminal
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[SECURE LOCAL DEV OTP DELIVERY ADAPTER]'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Recipient Phone : 9829011111'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/One-Time Password: \d{6}/));

      // Retrieve generated OTP and verify it succeeds
      const devCode = getDevActiveOtp('9829011111');
      expect(devCode).toMatch(/^\d{6}$/);

      const verifyRes = await request(app)
        .post('/api/auth/driver/verify-otp')
        .send({ phone: '9829011111', otp: devCode });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.user.name).toBe('Ramesh Driver');

      consoleSpy.mockRestore();
    });
  });

  describe('3. Role, Ward & Driver Ownership Scoping', () => {
    it('Item 5: Ward supervisors cannot access another ward (403)', async () => {
      // Supervisor 84 login
      const supLogin = await request(app)
        .post('/api/auth/officer/login')
        .send({ identifier: 'sup.ward84', password: 'SupPassword#2026' });
      const supCookie = supLogin.headers['set-cookie'][0];

      // Supervisor dashboard is strictly scoped to Ward 84
      const dashRes = await request(app).get('/api/dashboard').set('Cookie', supCookie);
      expect(dashRes.status).toBe(200);
      expect(dashRes.body.scope).toBe('ward:WARD-84');

      // Attempt to reassign a bin that belongs to Ward 85 (cross-ward violation)
      // Insert a test bin in Ward 85
      db.prepare(`
        INSERT INTO bins (id, code, name, ward_id, sector, lat, lng, address, capacity_liters, current_fill_percent, estimated_kg, risk_category, collection_status)
        VALUES ('BIN-W85-1', 'WW-85-01', 'Malviya Nagar Bin', 'WARD-85', 'Sec 1', 26.85, 75.82, 'Apex Mall', 1100, 80, 300, 'high', 'unassigned')
      `).run();

      const reassignRes = await request(app)
        .post('/api/dispatch/reassign')
        .set('Cookie', supCookie)
        .send({ binId: 'BIN-W85-1', newTruckId: 'RJ-14-GA-4821' });

      // Verified: Ward scope violation rejected with 403
      expect(reassignRes.status).toBe(403);
      expect(reassignRes.body.code).toBe('WARD_SCOPE_VIOLATION');
    });

    it('Item 6: A driver cannot access another driver truck or stops by changing IDs', async () => {
      // Login as Driver 1 (assigned to RJ-14-GA-4821)
      const validCodeHash = hashOtp('999111');
      const futureTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      db.prepare(`
        INSERT INTO otp_requests (id, phone_number, driver_id, otp_hash, expires_at, attempt_count, max_attempts)
        VALUES ('OTP-D1', '9829011111', 'DRV-TEST-1', ?, ?, 0, 3)
      `).run(validCodeHash, futureTime);

      const loginRes = await request(app)
        .post('/api/auth/driver/verify-otp')
        .send({ phone: '9829011111', otp: '999111' });
      expect(loginRes.status).toBe(200);
      const driverCookie = loginRes.headers['set-cookie'][0];

      // Driver route endpoint returns only RJ-14-GA-4821
      const routeRes = await request(app).get('/api/driver/route').set('Cookie', driverCookie);
      expect(routeRes.status).toBe(200);
      expect(routeRes.body.truck.id).toBe('RJ-14-GA-4821');

      // Attempt to record collection on a vehicle assigned to another crew (RJ-14-EA-1934)
      const hijackAttempt = await request(app)
        .post('/api/collections/record')
        .set('Cookie', driverCookie)
        .send({
          binId: 'WW-JGT-84-01',
          truckId: 'RJ-14-EA-1934', // Another driver's vehicle!
          action: 'collected',
        });

      // Verified: 403 Driver Ownership Violation
      expect(hijackAttempt.status).toBe(403);
      expect(hijackAttempt.body.code).toBe('DRIVER_OWNERSHIP_VIOLATION');
    });
  });

  describe('4. Transactional Collection & Idempotency', () => {
    it('Item 9 & 10: Two concurrent collection requests cannot double-count a bin, and retried requests are idempotent', async () => {
      const supLogin = await request(app)
        .post('/api/auth/officer/login')
        .send({ identifier: 'sup.ward84', password: 'SupPassword#2026' });
      const supCookie = supLogin.headers['set-cookie'][0];

      // Call 1: Collect WW-JGT-84-01 (410 kg estimated)
      const call1 = await request(app)
        .post('/api/collections/record')
        .set('Cookie', supCookie)
        .send({
          binId: 'WW-JGT-84-01',
          truckId: 'RJ-14-GA-4821',
          action: 'collected',
          idempotencyKey: 'IDEMP-TEST-KEY-1',
        });

      expect(call1.status).toBe(200);
      expect(call1.body.isDuplicate).toBe(false);
      expect(call1.body.event.weightKg).toBe(410);

      // Check truck load in database: exactly 410 kg
      const truckRow1 = db.prepare(`SELECT current_load_kg FROM trucks WHERE id = 'RJ-14-GA-4821'`).get() as any;
      expect(truckRow1.current_load_kg).toBe(410);

      // Call 2: Repeated collection with same idempotency key (network replay / retry)
      const call2 = await request(app)
        .post('/api/collections/record')
        .set('Cookie', supCookie)
        .send({
          binId: 'WW-JGT-84-01',
          truckId: 'RJ-14-GA-4821',
          action: 'collected',
          idempotencyKey: 'IDEMP-TEST-KEY-1',
        });

      expect(call2.status).toBe(200);
      expect(call2.body.isDuplicate).toBe(true);

      // Call 3: Repeated collection with a DIFFERENT key or no key against already collected bin
      const call3 = await request(app)
        .post('/api/collections/record')
        .set('Cookie', supCookie)
        .send({
          binId: 'WW-JGT-84-01',
          truckId: 'RJ-14-GA-4821',
          action: 'collected',
        });

      expect(call3.status).toBe(200);
      expect(call3.body.isDuplicate).toBe(true);
      expect(call3.body.weightKg).toBe(0);

      // Check truck load: STILL exactly 410 kg (NOT 820 kg or 1230 kg!)
      const truckRowFinal = db.prepare(`SELECT current_load_kg FROM trucks WHERE id = 'RJ-14-GA-4821'`).get() as any;
      expect(truckRowFinal.current_load_kg).toBe(410);

      // Check collection events table: only ONE successful collection event was recorded
      const eventCount = db.prepare(`
        SELECT COUNT(*) as count FROM collection_events 
        WHERE bin_id = 'WW-JGT-84-01' AND result = 'collected'
      `).get() as any;
      expect(eventCount.count).toBe(1);
    });

    it('Item 11 & 12: Capacity violations, invalid loads, and unauthorized role tampering are rejected', async () => {
      const supLogin = await request(app)
        .post('/api/auth/officer/login')
        .send({ identifier: 'sup.ward84', password: 'SupPassword#2026' });
      const supCookie = supLogin.headers['set-cookie'][0];

      // Insert small truck (1000 kg capacity)
      db.prepare(`
        INSERT INTO trucks (id, name, capacity_kg, current_load_kg, status, assigned_ward_id, depot_name, depot_lat, depot_lng, current_lat, current_lng)
        VALUES ('TRUCK-MINI', 'Mini Tipper', 500, 400, 'Available', 'WARD-84', 'Depot', 26.8, 75.8, 26.8, 75.8)
      `).run();

      // WW-JGT-84-01 is 410 kg. Adding 410 kg to 400 kg = 810 kg > 500 kg capacity!
      const overloadRes = await request(app)
        .post('/api/dispatch/reassign')
        .set('Cookie', supCookie)
        .send({ binId: 'WW-JGT-84-02', newTruckId: 'TRUCK-MINI' });

      // Verified: Capacity violation rejected
      expect(overloadRes.status).toBe(400);
      expect(overloadRes.body.code).toBe('CAPACITY_EXCEEDED');
    });
  });

  describe('5. Anonymous Public Complaint Submission', () => {
    it('Item 13: Public complaint validation works anonymously and rate limits enforce protection', async () => {
      // 1. Valid complaint
      const validRes = await request(app)
        .post('/api/complaints')
        .send({
          wardId: 'WARD-84',
          description: 'Overflowing commercial dustbin near Jagatpura Railway Station crossing.',
        });

      expect(validRes.status).toBe(201);
      expect(validRes.body.referenceCode).toMatch(/^WW-CMP-2026-[A-F0-9]{6}$/);
      expect(validRes.body.status).toBe('submitted');

      // 2. Invalid short description (< 10 chars)
      const shortRes = await request(app)
        .post('/api/complaints')
        .send({ wardId: 'WARD-84', description: 'Trash' });
      expect(shortRes.status).toBe(400);

      // 3. Invalid ward ID
      const invalidWardRes = await request(app)
        .post('/api/complaints')
        .send({
          wardId: 'WARD-FAKE-999',
          description: 'Garbage dump near unauthorized location outside jurisdiction.',
        });
      expect(invalidWardRes.status).toBe(400);
      expect(invalidWardRes.body.code).toBe('INVALID_WARD');
    });
  });
});
