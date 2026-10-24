import crypto from 'node:crypto';
import { Database as DatabaseType } from 'better-sqlite3';

export interface AuditLogEntry {
  actorType: 'officer' | 'driver' | 'system' | 'anonymous';
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export function logAuditEvent(db: DatabaseType, entry: AuditLogEntry): void {
  try {
    const id = `AUD-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO audit_logs (
        id, actor_type, actor_id, action, entity_type, entity_id, details_json, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entry.actorType,
      entry.actorId || null,
      entry.action,
      entry.entityType,
      entry.entityId || null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress || null
    );
  } catch (err) {
    console.error('Failed to write audit log entry:', err);
  }
}
