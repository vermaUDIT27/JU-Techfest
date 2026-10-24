import { z } from 'zod';
import path from 'node:path';

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SQLITE_PATH: z.string().default(path.join(process.cwd(), 'server', 'data', 'wastewise.sqlite')),
  SESSION_SECRET: z.string().min(16).default('wastewise-jaipur-super-secure-session-secret-2026!'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  OTP_DEV_MODE: z.preprocess((val) => {
    if (typeof val === 'string') {
      const lower = val.toLowerCase().trim();
      if (lower === 'false' || lower === '0' || lower === 'off' || lower === 'no') return false;
      if (lower === 'true' || lower === '1' || lower === 'on' || lower === 'yes') return true;
    }
    return val;
  }, z.boolean().default(true)),
  UPLOAD_DIR: z.string().default(path.join(process.cwd(), 'server', 'uploads', 'complaints')),
  SESSION_MAX_AGE_HOURS: z.coerce.number().default(8),
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedEnv: EnvConfig;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  console.error('Invalid server environment configuration:', error);
  process.exit(1);
}

// In production, ensure dev-mode OTP delivery is strictly disabled
if (parsedEnv.NODE_ENV === 'production' && parsedEnv.OTP_DEV_MODE) {
  console.error('FATAL: OTP_DEV_MODE cannot be enabled in production environments.');
  process.exit(1);
}

export const env = parsedEnv;
