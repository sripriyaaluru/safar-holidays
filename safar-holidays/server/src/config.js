// Central place for configuration. Values come from server/.env when present,
// otherwise sensible development defaults are used.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  process.loadEnvFile(path.join(serverRoot, '.env'));
} catch {
  // .env is optional
}

const dbPath = process.env.DB_PATH || 'data/travel.db';

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: dbPath === ':memory:' ? dbPath : path.resolve(serverRoot, dbPath),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
  serverRoot,
};

if (config.isProduction && !process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Set it in server/.env before deploying.');
}
