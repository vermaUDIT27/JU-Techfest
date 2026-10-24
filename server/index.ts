import { createApp } from './app.js';
import { env } from './config/env.js';
import { getDb } from './db/connection.js';
import { runMigrations } from './db/migrations.js';
import { seedDatabase } from './db/seed.js';

async function startServer(): Promise<void> {
  try {
    console.log(`[WasteWise Server] Initializing SQLite database at: ${env.SQLITE_PATH}`);
    const db = getDb();

    console.log('[WasteWise Server] Running database schema migrations...');
    runMigrations(db);

    console.log('[WasteWise Server] Seeding initial municipal pilot geography & fleet...');
    seedDatabase(db);

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      console.log(`\n======================================================`);
      console.log(`WasteWise Pune Secure Municipal Backend`);
      console.log(`Listening on  : http://localhost:${env.PORT}`);
      console.log(`Environment   : ${env.NODE_ENV}`);
      console.log(`Allowed CORS  : ${env.CORS_ORIGIN}`);
      console.log(`Dev OTP Mode  : ${env.OTP_DEV_MODE ? 'ENABLED (Server Console Log)' : 'DISABLED'}`);
      console.log(`======================================================\n`);
    });

    const shutdown = () => {
      console.log('[WasteWise Server] Shutting down gracefully...');
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('[WasteWise Server] Fatal startup failure:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
