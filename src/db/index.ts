import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Helper to determine fine-grained SSL configuration
const getSSLConfig = (host?: string, connectionString?: string) => {
  if (process.env.SQL_SSL === 'false' || process.env.SQL_SSL === '0') return false;
  if (process.env.SQL_SSL === 'true' || process.env.SQL_SSL === '1') return { rejectUnauthorized: false };
  if (process.env.PGSSLMODE === 'disable') return false;

  let target = host || '';
  if (!target && connectionString) {
    try {
      const url = new URL(connectionString);
      target = url.hostname;
    } catch {
      const match = connectionString.match(/@([^/:]+)/);
      if (match) {
        target = match[1];
      }
    }
  }

  if (!target) return false;
  const h = target.toLowerCase();
  
  if (
    h.includes('localhost') ||
    h.includes('127.0.0.1') ||
    h.includes('railway') ||
    h.includes('internal') ||
    h === 'postgres' ||
    h === 'db' ||
    !h.includes('.') // single-word local network hostnames like 'Postgres'
  ) {
    return false;
  }
  
  return { rejectUnauthorized: false };
};

// Function to create a new connection pool
export const createPool = () => {
  const connectionString = process.env.DATABASE_URL || process.env.SQL_URL;
  if (connectionString) {
    return new Pool({
      connectionString,
      ssl: getSSLConfig(undefined, connectionString),
      connectionTimeoutMillis: 15000,
    });
  }

  const host = process.env.SQL_HOST?.trim();

  return new Pool({
    host,
    user: process.env.SQL_USER?.trim(),
    password: process.env.SQL_PASSWORD?.trim(),
    database: process.env.SQL_DB_NAME?.trim(),
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT.trim(), 10) : 5432,
    ssl: getSSLConfig(host),
    connectionTimeoutMillis: 15000,
  });
};

// Create a pool instance
const pool = createPool();

// Prevent unhandled pool-level errors from crashing the application
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

// Initialize Drizzle with the pool and schema
export const db = drizzle(pool, { schema });
export * from './schema.ts';
