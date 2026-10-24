import { Database as DatabaseType } from 'better-sqlite3';

export interface Migration {
  name: string;
  up: (db: DatabaseType) => void;
}

export const migrations: Migration[] = [
  {
    name: '001_initial_schema',
    up: (db: DatabaseType) => {
      // 1. Wards
      db.exec(`
        CREATE TABLE IF NOT EXISTS wards (
          id TEXT PRIMARY KEY,
          ward_code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          zone TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. Officers
      db.exec(`
        CREATE TABLE IF NOT EXISTS officers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          identifier TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('municipal_head', 'ward_supervisor')),
          assigned_ward_id TEXT REFERENCES wards(id) ON DELETE SET NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_officers_identifier ON officers(identifier);
      `);

      // 3. Trucks
      db.exec(`
        CREATE TABLE IF NOT EXISTS trucks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          capacity_kg INTEGER NOT NULL CHECK(capacity_kg > 0),
          current_load_kg INTEGER NOT NULL DEFAULT 0 CHECK(current_load_kg >= 0),
          status TEXT NOT NULL CHECK(status IN ('Available', 'Assigned', 'Collecting', 'Maintenance', 'Offline')),
          assigned_ward_id TEXT NOT NULL REFERENCES wards(id),
          color TEXT NOT NULL DEFAULT '#B04F34',
          depot_name TEXT NOT NULL,
          depot_lat REAL NOT NULL,
          depot_lng REAL NOT NULL,
          current_lat REAL NOT NULL,
          current_lng REAL NOT NULL,
          heading_degrees REAL NOT NULL DEFAULT 0,
          is_simulated INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_trucks_ward ON trucks(assigned_ward_id);
      `);

      // 4. Drivers
      db.exec(`
        CREATE TABLE IF NOT EXISTS drivers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone_number TEXT NOT NULL UNIQUE,
          assigned_ward_id TEXT NOT NULL REFERENCES wards(id),
          assigned_truck_id TEXT REFERENCES trucks(id) ON DELETE SET NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers(phone_number);
        CREATE INDEX IF NOT EXISTS idx_drivers_truck ON drivers(assigned_truck_id);
      `);

      // 5. Dustbins
      db.exec(`
        CREATE TABLE IF NOT EXISTS bins (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          hindi_name TEXT,
          ward_id TEXT NOT NULL REFERENCES wards(id),
          sector TEXT NOT NULL,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          address TEXT NOT NULL,
          hindi_address TEXT,
          landmark TEXT,
          capacity_liters INTEGER NOT NULL CHECK(capacity_liters > 0),
          current_fill_percent INTEGER NOT NULL DEFAULT 0 CHECK(current_fill_percent >= 0 AND current_fill_percent <= 100),
          estimated_kg INTEGER NOT NULL DEFAULT 0 CHECK(estimated_kg >= 0),
          risk_category TEXT NOT NULL CHECK(risk_category IN ('critical', 'high', 'medium', 'low')),
          collection_status TEXT NOT NULL CHECK(collection_status IN ('unassigned', 'assigned', 'collected', 'unable_to_collect')),
          assigned_truck_id TEXT REFERENCES trucks(id) ON DELETE SET NULL,
          assigned_stop_order INTEGER,
          sensitive_zone INTEGER NOT NULL DEFAULT 0,
          supervisor_tradeoff_reason TEXT,
          data_freshness TEXT,
          is_simulated INTEGER NOT NULL DEFAULT 1,
          last_collected_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_bins_ward ON bins(ward_id);
        CREATE INDEX IF NOT EXISTS idx_bins_truck ON bins(assigned_truck_id);
        CREATE INDEX IF NOT EXISTS idx_bins_status ON bins(collection_status);
      `);

      // 6. Routes & Route Stops
      db.exec(`
        CREATE TABLE IF NOT EXISTS routes (
          id TEXT PRIMARY KEY,
          truck_id TEXT NOT NULL REFERENCES trucks(id),
          driver_id TEXT REFERENCES drivers(id),
          shift_date TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
          total_distance_km REAL NOT NULL DEFAULT 0,
          total_duration_minutes INTEGER NOT NULL DEFAULT 0,
          road_geometry_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_routes_truck ON routes(truck_id);

        CREATE TABLE IF NOT EXISTS route_stops (
          id TEXT PRIMARY KEY,
          route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
          bin_id TEXT NOT NULL REFERENCES bins(id),
          stop_order INTEGER NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('pending', 'collected', 'failed', 'skipped')),
          failure_reason TEXT,
          failure_note TEXT,
          completed_at DATETIME,
          UNIQUE(route_id, bin_id),
          UNIQUE(route_id, stop_order)
        );
        CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
      `);

      // 7. Collection Events (with idempotency_key constraint)
      db.exec(`
        CREATE TABLE IF NOT EXISTS collection_events (
          id TEXT PRIMARY KEY,
          idempotency_key TEXT UNIQUE,
          bin_id TEXT NOT NULL REFERENCES bins(id),
          truck_id TEXT NOT NULL REFERENCES trucks(id),
          driver_id TEXT REFERENCES drivers(id),
          result TEXT NOT NULL CHECK(result IN ('collected', 'unable_to_collect')),
          weight_kg INTEGER NOT NULL DEFAULT 0 CHECK(weight_kg >= 0),
          fill_percent_before INTEGER NOT NULL DEFAULT 0,
          failure_reason TEXT,
          notes TEXT,
          is_simulated INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_events_bin ON collection_events(bin_id);
        CREATE INDEX IF NOT EXISTS idx_events_truck ON collection_events(truck_id);
        CREATE INDEX IF NOT EXISTS idx_events_created ON collection_events(created_at);
      `);

      // 8. Public Complaints
      db.exec(`
        CREATE TABLE IF NOT EXISTS complaints (
          id TEXT PRIMARY KEY,
          reference_code TEXT NOT NULL UNIQUE,
          ward_id TEXT NOT NULL REFERENCES wards(id),
          description TEXT NOT NULL,
          photo_path TEXT,
          status TEXT NOT NULL CHECK(status IN ('submitted', 'under_review', 'assigned', 'resolved', 'rejected')),
          resolution_notes TEXT,
          resolved_by_officer_id TEXT REFERENCES officers(id),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          resolved_at DATETIME
        );
        CREATE INDEX IF NOT EXISTS idx_complaints_ward ON complaints(ward_id);
        CREATE INDEX IF NOT EXISTS idx_complaints_ref ON complaints(reference_code);
        CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
      `);

      // 9. Sessions (Store SHA-256 hash of random session token)
      db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          token_hash TEXT NOT NULL UNIQUE,
          user_type TEXT NOT NULL CHECK(user_type IN ('officer', 'driver')),
          user_id TEXT NOT NULL,
          role TEXT NOT NULL,
          assigned_ward_id TEXT,
          assigned_truck_id TEXT,
          expires_at DATETIME NOT NULL,
          revoked_at DATETIME,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(token_hash);
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_type, user_id);
      `);

      // 10. OTP Requests (Hashed OTP, attempt limits, single-use)
      db.exec(`
        CREATE TABLE IF NOT EXISTS otp_requests (
          id TEXT PRIMARY KEY,
          phone_number TEXT NOT NULL,
          driver_id TEXT NOT NULL REFERENCES drivers(id),
          otp_hash TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          attempt_count INTEGER NOT NULL DEFAULT 0,
          max_attempts INTEGER NOT NULL DEFAULT 3,
          consumed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_requests(phone_number);
      `);

      // 11. Audit Logs
      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          actor_type TEXT NOT NULL CHECK(actor_type IN ('officer', 'driver', 'system', 'anonymous')),
          actor_id TEXT,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT,
          details_json TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
      `);
    },
  },
  {
    name: '002_normalize_driver_phones',
    up: (db: DatabaseType) => {
      // Reassign any references from legacy duplicate driver records to pilot records
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
    },
  },
];

export function runMigrations(db: DatabaseType): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedRows = db.prepare('SELECT name FROM schema_migrations').all() as { name: string }[];
  const appliedNames = new Set(appliedRows.map((r) => r.name));

  for (const migration of migrations) {
    if (!appliedNames.has(migration.name)) {
      db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(migration.name);
      })();
    }
  }
}
