import 'dotenv/config';
import { z } from 'zod';

/**
 * Treats blank-string env vars as if they were unset.
 * Lets a developer leave `JWT_ACCESS_SECRET=` in `.env` during Phase 2
 * without tripping the `.min(32)` rule. The Phase 3 auth controller will
 * enforce presence at the point of use.
 */
const optionalSecret = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().min(32).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().url(),

  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // Auth secrets — required from Phase 3 onward. Optional here so the server
  // can boot during scaffolding work. Empty strings are treated as unset.
  JWT_ACCESS_SECRET: optionalSecret,
  JWT_REFRESH_SECRET: optionalSecret,
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Use console here — the logger depends on env, so it isn't safe to import yet.
  console.error(
    '[env] Invalid environment variables:',
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
