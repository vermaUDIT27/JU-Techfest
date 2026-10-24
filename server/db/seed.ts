import { Database as DatabaseType } from 'better-sqlite3';
import { INITIAL_PUNE_BINS } from '../../src/data/puneBins.js';
import { INITIAL_PUNE_TRUCKS } from '../../src/data/puneFleet.js';
import { seedAutoDispatchRoutes } from '../services/autoDispatchService.js';

export function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function seedDatabase(db: DatabaseType): void {
  db.transaction(() => {
    // 1. Seed Wards
    const insertWard = db.prepare(`
      INSERT OR IGNORE INTO wards (id, ward_code, name, zone)
      VALUES (?, ?, ?, ?)
    `);

    // Pune Core Administrative Wards
    insertWard.run('pune-ward-3', '3', 'Viman Nagar', 'Nagar Road-Wadgaon Sheri');
    insertWard.run('pune-ward-8', '8', 'Aundh-Bopodi', 'Aundh Baner');
    insertWard.run('pune-ward-10', '10', 'Bavdhan-Kothrud Depot', 'Kothrud Bavdhan');
    insertWard.run('pune-ward-15', '15', 'Shaniwar Peth-Sadashiv Peth', 'Kasba Vishrambaugh Wada');
    insertWard.run('pune-ward-22', '22', 'Mundhwa-Magarpatta City', 'Hadapsar Mundhwa');
    insertWard.run('pune-ward-35', '35', 'Sahakarnagar-Padmavati', 'Dhanawadi Sahakarnagar');
    insertWard.run('pune-ward-39', '39', 'Dhankawadi / Navi Peth', 'Dhanawadi Sahakarnagar');
    // Integration test backward compatibility wards
    insertWard.run('WARD-84', '84', 'Swargate Core Ward 84', 'Swargate Zone (PMC)');
    insertWard.run('WARD-85', '85', 'Shivajinagar Ward 85', 'Shivajinagar Zone (PMC)');

    // 2. Seed Trucks
    const insertTruck = db.prepare(`
      INSERT OR IGNORE INTO trucks (
        id, name, capacity_kg, current_load_kg, status, assigned_ward_id,
        color, depot_name, depot_lat, depot_lng, current_lat, current_lng,
        heading_degrees, is_simulated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    for (const truck of INITIAL_PUNE_TRUCKS) {
      insertTruck.run(
        truck.id,
        truck.name,
        truck.capacityKg,
        truck.currentLoadKg,
        truck.status,
        'pune-ward-15',
        truck.color,
        truck.depotName,
        truck.depotCoords.lat,
        truck.depotCoords.lng,
        truck.currentCoords.lat,
        truck.currentCoords.lng,
        truck.headingDegrees
      );
    }

    // Seed test trucks for integration test fixtures
    insertTruck.run(
      'RJ-14-GA-4821',
      'Tata 1618 Hydraulic Compactor',
      5000,
      0,
      'Available',
      'WARD-84',
      '#D3832B',
      'Swargate Depot',
      18.5018,
      73.8580,
      18.5018,
      73.8580,
      0
    );

    insertTruck.run(
      'RJ-14-EA-1934',
      'Ashok Leyland 4016 Tipper',
      5000,
      0,
      'Available',
      'WARD-84',
      '#366E46',
      'Shivajinagar Yard',
      18.5314,
      73.8446,
      18.5314,
      73.8446,
      0
    );

    // 3. Seed Drivers
    const insertDriver = db.prepare(`
      INSERT OR IGNORE INTO drivers (
        id, name, phone_number, assigned_ward_id, assigned_truck_id, is_active
      ) VALUES (?, ?, ?, ?, ?, 1)
    `);

    for (let i = 0; i < INITIAL_PUNE_TRUCKS.length; i++) {
      const truck = INITIAL_PUNE_TRUCKS[i];
      const driverId = `DRV-PMC-0${i + 1}`;
      const normalizedPhone = normalizePhone(truck.driverPhone);
      insertDriver.run(
        driverId,
        truck.driverName,
        normalizedPhone,
        'pune-ward-15',
        truck.id
      );
    }

    // Explicitly seed pilot drivers for development and test workflows
    insertDriver.run(
      'DRV-84-01-PILOT',
      'Rajesh Sharma',
      '9829014821',
      'WARD-84',
      'RJ-14-GA-4821'
    );
    insertDriver.run(
      'DRV-84-02-PILOT',
      'Kamlesh Gurjar',
      '9414011934',
      'WARD-84',
      'RJ-14-EA-1934'
    );

    // Ensure all driver records have canonical 10-digit phone numbers
    db.prepare(`
      UPDATE otp_requests
      SET driver_id = 'DRV-84-01-PILOT'
      WHERE driver_id = 'DRV-84-01'
    `).run();

    db.prepare(`
      UPDATE otp_requests
      SET driver_id = 'DRV-84-02-PILOT'
      WHERE driver_id = 'DRV-84-02'
    `).run();

    db.prepare(`
      DELETE FROM drivers
      WHERE phone_number LIKE '+91%'
        AND SUBSTR(phone_number, -10) IN (SELECT phone_number FROM drivers WHERE phone_number NOT LIKE '+91%')
    `).run();

    db.prepare(`
      UPDATE drivers
      SET phone_number = SUBSTR(REPLACE(REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '+91', ''), '+', ''), -10)
      WHERE LENGTH(phone_number) > 10
    `).run();

    // 4. Seed Bins
    const insertBin = db.prepare(`
      INSERT OR IGNORE INTO bins (
        id, code, name, hindi_name, ward_id, sector, lat, lng,
        address, hindi_address, landmark, capacity_liters,
        current_fill_percent, estimated_kg, risk_category,
        collection_status, assigned_truck_id, sensitive_zone,
        supervisor_tradeoff_reason, data_freshness, is_simulated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    for (const bin of INITIAL_PUNE_BINS) {
      insertBin.run(
        bin.id,
        bin.code,
        bin.name,
        bin.marathiName || bin.name,
        'pune-ward-15',
        bin.location.sector || 'Pune Central',
        bin.location.lat,
        bin.location.lng,
        bin.location.address,
        bin.location.marathiAddress || bin.location.address,
        bin.location.landmark || '',
        bin.capacityLiters,
        bin.currentFillPercent,
        bin.estimatedKg,
        bin.riskCategory,
        bin.collectionStatus,
        bin.assignedTruckId || null,
        bin.sensitiveZone ? 1 : 0,
        bin.supervisorTradeoffReason || '',
        bin.dataFreshness || 'Simulated Sensor'
      );
    }

    // Seed test bins for integration test fixtures
    insertBin.run(
      'WW-JGT-84-01',
      'WW-PUN-TEST-01',
      'Swargate Test Concourse 1',
      'स्वारगेट चाचणी केंद्र १',
      'WARD-84',
      'Swargate',
      18.5018,
      73.8580,
      'Shivaji Road, Swargate',
      'शिवाजी रस्ता, स्वारगेट',
      'Swargate Metro',
      1100,
      95,
      410,
      'critical',
      'assigned',
      'RJ-14-GA-4821',
      1,
      'Test tradeoff reason',
      '5 mins ago'
    );

    insertBin.run(
      'WW-JGT-84-02',
      'WW-PUN-TEST-02',
      'Swargate Test Concourse 2',
      'स्वारगेट चाचणी केंद्र २',
      'WARD-84',
      'Swargate',
      18.5020,
      73.8582,
      'Shivaji Road, Swargate',
      'शिवाजी रस्ता, स्वारगेट',
      'Swargate Metro Stand',
      1100,
      85,
      410,
      'high',
      'unassigned',
      null,
      0,
      'Test tradeoff reason 2',
      '10 mins ago'
    );
  })();

  // 5. Seed Preloaded Auto-Dispatched Routes for Pune Demo Fleet
  seedAutoDispatchRoutes(db);
}
