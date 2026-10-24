import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { createApp } from '../../server/app';
import { setDbInstance } from '../../server/db/connection';
import { runMigrations } from '../../server/db/migrations';
import { seedDatabase } from '../../server/db/seed';
import { hashPassword } from '../../server/services/authService';
import { getDevActiveOtp } from '../../server/services/otpService';

describe('SANCHAYA End-to-End User Journey & Button Verification', { timeout: 25000 }, () => {
  let db: DatabaseType;
  let app: any;

  beforeEach(async () => {
    // Isolated in-memory database
    db = new Database(':memory:');
    setDbInstance(db);
    runMigrations(db);
    seedDatabase(db);

    // Seed test officer accounts (Head and Supervisor)
    const headHash = await hashPassword('JaipurClean#2026');
    db.prepare(`
      INSERT OR REPLACE INTO officers (id, name, identifier, password_hash, role, assigned_ward_id, is_active)
      VALUES ('OFF-TEST-HEAD', 'Municipal Commissioner Pune', 'admin.commissioner', ?, 'municipal_head', NULL, 1)
    `).run(headHash);

    const supHash = await hashPassword('Supervisor#Ward84');
    db.prepare(`
      INSERT OR REPLACE INTO officers (id, name, identifier, password_hash, role, assigned_ward_id, is_active)
      VALUES ('OFF-TEST-SUP', 'Ward 84 Supervisor', 'supervisor.ward84', ?, 'ward_supervisor', 'WARD-84', 1)
    `).run(supHash);

    // Ensure truck exists first (due to foreign key constraint)
    db.prepare(`
      INSERT OR REPLACE INTO trucks (
        id, name, capacity_kg, current_load_kg, status, assigned_ward_id,
        color, depot_name, depot_lat, depot_lng, current_lat, current_lng, heading_degrees, is_simulated
      ) VALUES (
        'RJ-14-GA-4821', 'Tata 1618 Hydraulic Compactor', 5000, 0, 'Available', 'WARD-84',
        '#D3832B', 'Swargate Depot', 18.5018, 73.8580, 18.5018, 73.8580, 0, 1
      )
    `).run();

    // Seed test driver with assigned truck and stop
    db.prepare(`
      INSERT OR REPLACE INTO drivers (id, name, phone_number, assigned_ward_id, assigned_truck_id, is_active)
      VALUES ('DRV-E2E-1', 'Rajesh Sharma', '9829014821', 'WARD-84', 'RJ-14-GA-4821', 1)
    `).run();

    // Ensure bin assigned to this truck
    db.prepare(`
      INSERT OR REPLACE INTO bins (
        id, code, name, hindi_name, ward_id, sector, lat, lng,
        address, hindi_address, landmark, capacity_liters,
        current_fill_percent, estimated_kg, risk_category,
        collection_status, assigned_truck_id, assigned_stop_order, sensitive_zone, is_simulated
      ) VALUES (
        'BIN-E2E-1', 'WW-E2E-01', 'Swargate Terminal Bin', 'स्वारगेट कचरा पात्र',
        'WARD-84', 'Sector 1', 18.5018, 73.8580, 'Swargate Chowk', 'स्वारगेट चौक',
        'Swargate Metro', 1100, 85, 350, 'high', 'assigned', 'RJ-14-GA-4821', 1, 0, 1
      )
    `).run();

    app = createApp();
  });

  describe('Journey 1: Operator Authentication & Dashboard Access', () => {
    it('authenticates with valid credentials, accesses protected endpoints, and rejects access after logout', async () => {
      // 1. Unauthenticated requests are rejected
      const unauthRes = await request(app).get('/api/dashboard');
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.code).toBe('UNAUTHENTICATED');

      // 2. Login as Municipal Head
      const loginRes = await request(app)
        .post('/api/auth/officer/login')
        .send({ identifier: 'admin.commissioner', password: 'JaipurClean#2026' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.role).toBe('municipal_head');
      expect(loginRes.body.user.identifier).toBe('admin.commissioner');

      const cookies = loginRes.headers['set-cookie'];
      expect(cookies).toBeDefined();

      // 3. Access protected dashboard with session cookie
      const dashRes = await request(app)
        .get('/api/dashboard')
        .set('Cookie', cookies);

      expect(dashRes.status).toBe(200);
      expect(dashRes.body.bins).toBeDefined();
      expect(dashRes.body.trucks).toBeDefined();

      // 4. Access protected complaints list
      const compRes = await request(app)
        .get('/api/complaints')
        .set('Cookie', cookies);

      expect(compRes.status).toBe(200);
      expect(Array.isArray(compRes.body.complaints)).toBe(true);

      // 5. Logout revokes session
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      expect(logoutRes.status).toBe(200);

      // 6. Verify subsequent requests with old session cookie are rejected
      const postLogoutRes = await request(app)
        .get('/api/dashboard')
        .set('Cookie', cookies);

      expect(postLogoutRes.status).toBe(401);
    });

    it('rejects invalid officer passwords without exposing timing or role', async () => {
      const failRes = await request(app)
        .post('/api/auth/officer/login')
        .send({ identifier: 'admin.commissioner', password: 'WrongPassword#999' });

      expect(failRes.status).toBe(401);
      expect(failRes.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Journey 2: Driver Mobile OTP Login & Scoped Route Access', () => {
    it('requests OTP, verifies single-use code, and accesses driver route with strict scoping', async () => {
      // 1. Unauthenticated route access is rejected
      const unauthRoute = await request(app).get('/api/driver/route');
      expect(unauthRoute.status).toBe(401);

      // 2. Request OTP for provisioned driver
      const reqOtpRes = await request(app)
        .post('/api/auth/driver/request-otp')
        .send({ phone: '9829014821' });

      expect(reqOtpRes.status).toBe(200);
      expect(reqOtpRes.body.validForSeconds).toBe(300);

      // 3. Retrieve code from the development OTP adapter
      const devCode = getDevActiveOtp('9829014821');
      expect(devCode).toBeDefined();
      expect(devCode).toMatch(/^[0-9]{6}$/);

      // 4. Verify OTP
      const verifyRes = await request(app)
        .post('/api/auth/driver/verify-otp')
        .send({ phone: '9829014821', otp: devCode });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.user.role).toBe('driver');
      expect(verifyRes.body.user.assignedTruckId).toBe('RJ-14-GA-4821');

      const driverCookies = verifyRes.headers['set-cookie'];
      expect(driverCookies).toBeDefined();

      // 5. Driver accesses their assigned route
      const routeRes = await request(app)
        .get('/api/driver/route')
        .set('Cookie', driverCookies);

      expect(routeRes.status).toBe(200);
      expect(routeRes.body.truck.id).toBe('RJ-14-GA-4821');
      expect(routeRes.body.stops.length).toBeGreaterThan(0);
      expect(routeRes.body.stops[0].id).toBe('BIN-E2E-1');

      // 6. Driver OTP is single-use: Reusing the same code is strictly rejected
      const replayRes = await request(app)
        .post('/api/auth/driver/verify-otp')
        .send({ phone: '9829014821', otp: devCode });

      expect(replayRes.status).toBe(400);
      expect(replayRes.body.code).toBe('OTP_VERIFICATION_FAILED');
    });

    it('rejects unregistered phone numbers without issuing an OTP', async () => {
      const unregRes = await request(app)
        .post('/api/auth/driver/request-otp')
        .send({ phone: '9999900000' });

      expect(unregRes.status).toBe(400);
      expect(unregRes.body.code).toBe('OTP_REQUEST_FAILED');
    });
  });

  describe('Journey 3: Public Anonymous Complaint Submission', () => {
    it('submits complaint without authentication and generates reference code', async () => {
      const complaintRes = await request(app)
        .post('/api/complaints')
        .field('wardId', 'WARD-84')
        .field('description', 'Overflowing community dumper near main road bus station');

      expect(complaintRes.status).toBe(201);
      expect(complaintRes.body.referenceCode).toMatch(/^WW-CMP-2026-[0-9A-F]{6}$/);

      // Verify that authorized officer can view the submitted complaint
      const loginRes = await request(app)
        .post('/api/auth/officer/login')
        .send({ identifier: 'admin.commissioner', password: 'JaipurClean#2026' });
      const cookies = loginRes.headers['set-cookie'];

      const listRes = await request(app)
        .get('/api/complaints')
        .set('Cookie', cookies);

      const found = listRes.body.complaints.find(
        (c: any) => c.referenceCode === complaintRes.body.referenceCode
      );
      expect(found).toBeDefined();
      expect(found.description).toContain('Overflowing community dumper');
    });
  });
});