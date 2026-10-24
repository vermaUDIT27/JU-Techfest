import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import request from 'supertest';
import { createApp } from '../../server/app.js';
import { setDbInstance } from '../../server/db/connection.js';
import { runMigrations } from '../../server/db/migrations.js';
import { seedDatabase } from '../../server/db/seed.js';
import {
  seedAutoDispatchRoutes,
  ensureAutoDispatchForTruck,
  simulateSensorTrigger,
  getActivityStream,
} from '../../server/services/autoDispatchService.js';
import { getDevActiveOtp } from '../../server/services/otpService.js';

describe('SANCHAYA — Automatic Demo Dispatch & Preloaded Driver Routes Verification', { timeout: 30000 }, () => {
  let db: DatabaseType;
  let app: any;

  beforeEach(async () => {
    db = new Database(':memory:');
    setDbInstance(db);
    runMigrations(db);
    seedDatabase(db);
    app = createApp();
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // ignore
    }
  });

  describe('1. Active Deterministic Demo Scenario & Fleet Seeding', () => {
    it('seeds at least 2 demo trucks, 2 demo drivers, and 6+ mapped demo bins in Pune', () => {
      const trucks = db.prepare('SELECT * FROM trucks WHERE is_simulated = 1').all() as any[];
      expect(trucks.length).toBeGreaterThanOrEqual(2);

      const drivers = db.prepare('SELECT * FROM drivers WHERE is_active = 1').all() as any[];
      expect(drivers.length).toBeGreaterThanOrEqual(2);

      const bins = db.prepare('SELECT * FROM bins').all() as any[];
      expect(bins.length).toBeGreaterThanOrEqual(6);

      // Verify no Jaipur identifiers in Pune records
      const puneTrucks = db.prepare("SELECT * FROM trucks WHERE id LIKE 'MH-12%'").all() as any[];
      expect(puneTrucks.length).toBeGreaterThanOrEqual(3);
      for (const t of puneTrucks) {
        expect(t.id).not.toContain('RJ-14');
        expect(t.assigned_ward_id).not.toBe('WARD-84');
      }

      const puneDrivers = db.prepare("SELECT * FROM drivers WHERE id LIKE 'DRV-PMC%'").all() as any[];
      expect(puneDrivers.length).toBeGreaterThanOrEqual(3);
    });

    it('contains critical and full bins exceeding 85% fill', () => {
      const criticalBins = db.prepare('SELECT * FROM bins WHERE current_fill_percent >= 85').all() as any[];
      expect(criticalBins.length).toBeGreaterThanOrEqual(4);

      const fullBins = db.prepare('SELECT * FROM bins WHERE current_fill_percent = 100').all() as any[];
      expect(fullBins.length).toBeGreaterThanOrEqual(1);
      expect(fullBins[0].id).toBe('WW-PUN-00');
    });

    it('creates at least 2 distinct preloaded routes with ordered stops', () => {
      const routes = db.prepare('SELECT * FROM routes').all() as any[];
      expect(routes.length).toBeGreaterThanOrEqual(2);

      // Route 1: MH-12-PMC-4821 (Swargate)
      const route1Stops = db.prepare(`
        SELECT rs.*, b.code, b.current_fill_percent
        FROM route_stops rs
        JOIN bins b ON rs.bin_id = b.id
        WHERE rs.route_id = 'ROUTE-MH-12-PMC-4821'
        ORDER BY rs.stop_order ASC
      `).all() as any[];

      expect(route1Stops.length).toBe(4);
      expect(route1Stops[0].stop_order).toBe(1);
      expect(route1Stops[0].bin_id).toBe('WW-PUN-00');
      expect(route1Stops[1].bin_id).toBe('WW-PUN-01');

      // Route 2: MH-12-PMC-5134 (Shivajinagar)
      const route2Stops = db.prepare(`
        SELECT rs.*, b.code
        FROM route_stops rs
        JOIN bins b ON rs.bin_id = b.id
        WHERE rs.route_id = 'ROUTE-MH-12-PMC-5134'
        ORDER BY rs.stop_order ASC
      `).all() as any[];

      expect(route2Stops.length).toBe(3);
      expect(route2Stops[0].bin_id).toBe('WW-PUN-04');
    });

    it('is idempotent: re-running seedAutoDispatchRoutes does not duplicate routes or corrupt stop sequences', () => {
      const initialRouteCount = (db.prepare('SELECT COUNT(*) as c FROM routes').get() as any).c;
      const initialStopCount = (db.prepare('SELECT COUNT(*) as c FROM route_stops').get() as any).c;

      seedAutoDispatchRoutes(db, false);

      const finalRouteCount = (db.prepare('SELECT COUNT(*) as c FROM routes').get() as any).c;
      const finalStopCount = (db.prepare('SELECT COUNT(*) as c FROM route_stops').get() as any).c;

      expect(finalRouteCount).toBe(initialRouteCount);
      expect(finalStopCount).toBe(initialStopCount);
    });
  });

  describe('2. Driver Route Retrieval & Authorization Boundary', () => {
    it('Driver 1 (Ramesh Shinde) receives active route and stops immediately on login without operator intervention', async () => {
      // 1. Driver 1 Login
      await request(app)
        .post('/api/auth/driver/request-otp')
        .send({ phone: '9822011111' });

      const devOtp = getDevActiveOtp('9822011111');
      expect(devOtp).toBeDefined();

      const verifyRes = await request(app)
        .post('/api/auth/driver/verify-otp')
        .send({ phone: '9822011111', otp: devOtp });

      expect(verifyRes.status).toBe(200);
      const cookie = verifyRes.headers['set-cookie'][0];

      // 2. Fetch Driver Route
      const routeRes = await request(app)
        .get('/api/driver/route')
        .set('Cookie', cookie);

      expect(routeRes.status).toBe(200);
      expect(routeRes.body.driver.name).toBe('Ramesh Shinde');
      expect(routeRes.body.truck.id).toBe('MH-12-PMC-4821');
      expect(routeRes.body.stops.length).toBe(4);
      expect(routeRes.body.assignedBinIds.length).toBe(4);
      expect(routeRes.body.completedBinIds.length).toBe(0);
      expect(routeRes.body.truck.assignedBinIds.length).toBe(4);
      expect(routeRes.body.nextStopBin).toBeDefined();
      expect(routeRes.body.nextStopBin.code).toBe('WW-PUN-00');
      expect(routeRes.body.truck.assignedRoute).toBeDefined();
      expect(routeRes.body.truck.assignedRoute.roadGeometry.length).toBeGreaterThan(1);
    });

    it('strictly isolates Driver 2 from Driver 1: Driver 2 only receives Driver 2 vehicle and stops', async () => {
      await request(app)
        .post('/api/auth/driver/request-otp')
        .send({ phone: '9822022222' });

      const devOtp = getDevActiveOtp('9822022222');
      const verifyRes = await request(app)
        .post('/api/auth/driver/verify-otp')
        .send({ phone: '9822022222', otp: devOtp });

      const cookie = verifyRes.headers['set-cookie'][0];

      const routeRes = await request(app)
        .get('/api/driver/route')
        .set('Cookie', cookie);

      expect(routeRes.status).toBe(200);
      expect(routeRes.body.driver.name).toBe('Santosh Jadhav');
      expect(routeRes.body.truck.id).toBe('MH-12-PMC-5134');
      expect(routeRes.body.stops.length).toBe(3);

      // Verify no Driver 1 stops are present
      const driver2BinIds = routeRes.body.stops.map((s: any) => s.id);
      expect(driver2BinIds).not.toContain('WW-PUN-00');
      expect(driver2BinIds).not.toContain('WW-PUN-01');
      expect(driver2BinIds).toContain('WW-PUN-04');
    });

    it('ensures automatic dispatch on the fly if a truck has 0 assigned stops', () => {
      // Create a new truck with 0 assigned stops
      db.prepare(`
        INSERT INTO trucks (
          id, name, capacity_kg, current_load_kg, status, assigned_ward_id,
          color, depot_name, depot_lat, depot_lng, current_lat, current_lng, is_simulated
        ) VALUES ('MH-12-PMC-9999', 'Demo Spare Tipper', 4000, 0, 'Available', 'pune-ward-15',
                  '#FF5722', 'Swargate Depot', 18.5018, 73.8580, 18.5018, 73.8580, 1)
      `).run();

      // Run ensureAutoDispatchForTruck
      ensureAutoDispatchForTruck(db, 'MH-12-PMC-9999');

      const route = db.prepare("SELECT * FROM routes WHERE truck_id = 'MH-12-PMC-9999'").get() as any;
      expect(route).toBeDefined();

      const stops = db.prepare("SELECT * FROM bins WHERE assigned_truck_id = 'MH-12-PMC-9999'").all() as any[];
      expect(stops.length).toBeGreaterThan(0);
    });
  });

  describe('3. Collection Workflow & State Persistence', () => {
    it('marks stop collected, updates truck load, advances next stop, and persists across subsequent calls', async () => {
      // Login Driver 1
      await request(app).post('/api/auth/driver/request-otp').send({ phone: '9822011111' });
      const devOtp = getDevActiveOtp('9822011111');
      const verifyRes = await request(app).post('/api/auth/driver/verify-otp').send({ phone: '9822011111', otp: devOtp });
      const cookie = verifyRes.headers['set-cookie'][0];

      // Mark WW-PUN-00 collected
      const collectRes = await request(app)
        .post('/api/collections/record')
        .set('Cookie', cookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          binId: 'WW-PUN-00',
          truckId: 'MH-12-PMC-4821',
          action: 'collected',
          idempotencyKey: 'E2E-IDEM-001',
        });

      expect(collectRes.status).toBe(200);
      expect(collectRes.body.event.result).toBe('collected');
      expect(collectRes.body.event.weightKg).toBe(980);

      // Verify Route updates
      const routeRes = await request(app)
        .get('/api/driver/route')
        .set('Cookie', cookie);

      expect(routeRes.body.completedBinIds).toContain('WW-PUN-00');
      expect(routeRes.body.metrics.completedCount).toBe(1);
      expect(routeRes.body.metrics.progressPercent).toBe(25);
      expect(routeRes.body.nextStopBin.code).toBe('WW-PUN-01');

      // Verify idempotency guard rejects duplicate collection
      const dupRes = await request(app)
        .post('/api/collections/record')
        .set('Cookie', cookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          binId: 'WW-PUN-00',
          truckId: 'MH-12-PMC-4821',
          action: 'collected',
          idempotencyKey: 'E2E-IDEM-001',
        });

      expect(dupRes.status).toBe(200);
      expect(dupRes.body.isDuplicate).toBe(true);
    });

    it('completing all stops marks the route completed and transitions to no active route assigned empty state', async () => {
      // Login Driver 1
      await request(app).post('/api/auth/driver/request-otp').send({ phone: '9822011111' });
      const devOtp = getDevActiveOtp('9822011111');
      const verifyRes = await request(app).post('/api/auth/driver/verify-otp').send({ phone: '9822011111', otp: devOtp });
      const cookie = verifyRes.headers['set-cookie'][0];

      // Collect all 4 stops for Driver 1's route
      const binsToCollect = ['WW-PUN-00', 'WW-PUN-01', 'WW-PUN-02', 'WW-PUN-03'];
      for (const binId of binsToCollect) {
        const res = await request(app)
          .post('/api/collections/record')
          .set('Cookie', cookie)
          .set('X-Requested-With', 'XMLHttpRequest')
          .send({
            binId,
            truckId: 'MH-12-PMC-4821',
            action: 'collected',
          });
        expect(res.status).toBe(200);
      }

      // Fetch Driver Route after completing all stops
      const routeRes = await request(app)
        .get('/api/driver/route')
        .set('Cookie', cookie);

      expect(routeRes.status).toBe(200);
      // Route must be completed and return empty active stops (No Active Route Assigned)
      expect(routeRes.body.stops.length).toBe(0);
      expect(routeRes.body.assignedBinIds.length).toBe(0);
      expect(routeRes.body.nextStopBin).toBeNull();
      expect(routeRes.body.route).toBeNull();
      expect(routeRes.body.metrics.totalStops).toBe(0);
      expect(routeRes.body.metrics.completedCount).toBe(0);

      // Verify route record in SQLite is marked 'completed'
      const routeInDb = db.prepare("SELECT * FROM routes WHERE id = 'ROUTE-MH-12-PMC-4821'").get() as any;
      expect(routeInDb.status).toBe('completed');

      // Verify refreshing / subsequent calls never restore the completed route as active
      const refreshedRes = await request(app)
        .get('/api/driver/route')
        .set('Cookie', cookie);

      expect(refreshedRes.body.stops.length).toBe(0);
      expect(refreshedRes.body.route).toBeNull();
    });

    it('advances to next active route if another assigned route exists after completing the first route', async () => {
      // Create a second active route for Driver 1 in the database
      db.prepare(`
        INSERT INTO routes (
          id, truck_id, driver_id, shift_date, status, total_distance_km,
          total_duration_minutes, road_geometry_json
        ) VALUES (
          'ROUTE-MH-12-PMC-4821-SECOND', 'MH-12-PMC-4821', 'DRV-PMC-01', '2026-10-24',
          'pending', 3.5, 15, '[[18.5018,73.8580],[18.5100,73.8600]]'
        )
      `).run();

      db.prepare(`
        INSERT INTO route_stops (id, route_id, bin_id, stop_order, status)
        VALUES ('RSTOP-SECOND-1', 'ROUTE-MH-12-PMC-4821-SECOND', 'WW-PUN-08', 1, 'pending'),
               ('RSTOP-SECOND-2', 'ROUTE-MH-12-PMC-4821-SECOND', 'WW-PUN-09', 2, 'pending')
      `).run();

      // Login Driver 1
      await request(app).post('/api/auth/driver/request-otp').send({ phone: '9822011111' });
      const devOtp = getDevActiveOtp('9822011111');
      const verifyRes = await request(app).post('/api/auth/driver/verify-otp').send({ phone: '9822011111', otp: devOtp });
      const cookie = verifyRes.headers['set-cookie'][0];

      // Complete all 4 stops of the first route
      for (const binId of ['WW-PUN-00', 'WW-PUN-01', 'WW-PUN-02', 'WW-PUN-03']) {
        await request(app)
          .post('/api/collections/record')
          .set('Cookie', cookie)
          .set('X-Requested-With', 'XMLHttpRequest')
          .send({ binId, truckId: 'MH-12-PMC-4821', action: 'collected' });
      }

      // Fetch driver route: it should automatically advance to the second route!
      const routeRes = await request(app)
        .get('/api/driver/route')
        .set('Cookie', cookie);

      expect(routeRes.status).toBe(200);
      expect(routeRes.body.route).toBeDefined();
      expect(routeRes.body.route.id).toBe('ROUTE-MH-12-PMC-4821-SECOND');
      expect(routeRes.body.stops.length).toBe(2);
      expect(routeRes.body.stops[0].id).toBe('WW-PUN-08');
      expect(routeRes.body.nextStopBin).toBeDefined();
      expect(routeRes.body.nextStopBin.id).toBe('WW-PUN-08');
    });
  });

  describe('4. Simulated Sensor-Driven Dispatch & Operator Activity Stream', () => {
    it('automatically dispatches an unassigned bin to an available truck when sensor reading spikes to >= 85%', () => {
      // Unassign WW-PUN-13 so it is available
      db.prepare("UPDATE bins SET assigned_truck_id = NULL, collection_status = 'unassigned' WHERE id = 'WW-PUN-13'").run();

      const result = simulateSensorTrigger(db, 'WW-PUN-13', 95);

      expect(result.success).toBe(true);
      expect(result.autoDispatched).toBe(true);
      expect(result.assignedTruckId).toBeDefined();
      expect(result.riskCategory).toBe('critical');

      // Verify DB bin record was updated
      const updatedBin = db.prepare("SELECT * FROM bins WHERE id = 'WW-PUN-13'").get() as any;
      expect(updatedBin.current_fill_percent).toBe(95);
      expect(updatedBin.risk_category).toBe('critical');
      expect(updatedBin.collection_status).toBe('assigned');
      expect(updatedBin.assigned_truck_id).toBe(result.assignedTruckId);
    });

    it('records clear awaiting dispatch reason when vehicle fleet capacity is exceeded', () => {
      // Set all trucks to full capacity
      db.prepare('UPDATE trucks SET current_load_kg = capacity_kg').run();
      db.prepare("UPDATE bins SET assigned_truck_id = NULL, collection_status = 'unassigned' WHERE id = 'WW-PUN-14'").run();

      const result = simulateSensorTrigger(db, 'WW-PUN-14', 96);

      expect(result.success).toBe(true);
      expect(result.autoDispatched).toBe(false);
      expect(result.reason).toBe('vehicle_capacity_full');

      const bin = db.prepare("SELECT * FROM bins WHERE id = 'WW-PUN-14'").get() as any;
      expect(bin.supervisor_tradeoff_reason).toContain('vehicle capacity full');
    });

    it('logs audit events and returns structured activity stream for operator visibility', () => {
      const activities = getActivityStream(db, 10);
      expect(activities.length).toBeGreaterThan(0);

      const autoDispatchActivity = activities.find((a) => a.action.includes('AUTO_DISPATCH'));
      expect(autoDispatchActivity).toBeDefined();
    });
  });
});
