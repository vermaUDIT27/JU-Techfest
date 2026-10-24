import { getDb } from '../db/connection.js';
import { runMigrations } from '../db/migrations.js';
import { seedDatabase } from '../db/seed.js';
import { hashPassword } from '../services/authService.js';
import crypto from 'node:crypto';

async function bootstrap(): Promise<void> {
  const identifier = process.env.BOOTSTRAP_OFFICER_IDENTIFIER || 'admin.commissioner';
  const plainPassword = process.env.BOOTSTRAP_OFFICER_PASSWORD || 'JaipurClean#2026';
  const name = process.env.BOOTSTRAP_OFFICER_NAME || 'Municipal Head Jaipur';
  const role = process.env.BOOTSTRAP_OFFICER_ROLE || 'municipal_head';
  const wardId = process.env.BOOTSTRAP_OFFICER_WARD || null;

  console.log(`[Bootstrap Officer] Bootstrapping officer account...`);
  console.log(`Identifier : ${identifier}`);
  console.log(`Name       : ${name}`);
  console.log(`Role       : ${role}`);
  console.log(`Ward Scope : ${wardId || 'Citywide (Municipal Head)'}`);

  const db = getDb();
  runMigrations(db);
  seedDatabase(db);

  const passwordHash = await hashPassword(plainPassword);

  const existing = db.prepare(`SELECT id FROM officers WHERE identifier = ?`).get(identifier) as any;

  if (existing) {
    db.prepare(`
      UPDATE officers
      SET name = ?, password_hash = ?, role = ?, assigned_ward_id = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, passwordHash, role, wardId, existing.id);
    console.log(`[Bootstrap Officer] Successfully updated existing officer record: ${existing.id}`);
  } else {
    const id = `OFF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    db.prepare(`
      INSERT INTO officers (id, name, identifier, password_hash, role, assigned_ward_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(id, name, identifier, passwordHash, role, wardId);
    console.log(`[Bootstrap Officer] Successfully created initial officer record: ${id}`);
  }

  // Also provision a default Ward 84 Supervisor account for testing ward boundaries
  const supIdentifier = process.env.BOOTSTRAP_SUPERVISOR_IDENTIFIER || 'supervisor.ward84';
  const supPassword = process.env.BOOTSTRAP_SUPERVISOR_PASSWORD || 'Supervisor#Ward84';
  const supHash = await hashPassword(supPassword);

  const supExisting = db.prepare(`SELECT id FROM officers WHERE identifier = ?`).get(supIdentifier) as any;
  if (!supExisting) {
    const supId = `OFF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    db.prepare(`
      INSERT INTO officers (id, name, identifier, password_hash, role, assigned_ward_id, is_active)
      VALUES (?, ?, ?, ?, 'ward_supervisor', 'WARD-84', 1)
    `).run(supId, 'Suresh Verma (Ward 84 Supervisor)', supIdentifier, supHash);
    console.log(`[Bootstrap Officer] Provisioned Ward 84 Supervisor: ${supIdentifier}`);
  }

  console.log(`[Bootstrap Officer] Bootstrap process completed successfully.`);
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Officer] Failed:', err);
  process.exit(1);
});
