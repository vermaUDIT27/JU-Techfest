import Database, { Database as DatabaseType } from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

let dbInstance: DatabaseType | null = null;

export function getDb(customPath?: string): DatabaseType {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || env.SQLITE_PATH;

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);

  // Enforce foreign key constraints and WAL mode for reliability and concurrency
  db.pragma('foreign_keys = ON');
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }

  if (!customPath) {
    dbInstance = db;
  }

  return db;
}

export function setDbInstance(db: DatabaseType): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore close error
    }
  }
  dbInstance = db;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
