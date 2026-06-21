import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Function to create a new connection pool
export const createPool = () => {
  const connectionString = process.env.DATABASE_URL || process.env.SQL_URL;
  if (connectionString) {
    return new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
  }

  const host = process.env.SQL_HOST?.trim();
  const isLocal = !host || host.includes('localhost') || host.includes('127.0.0.1');

  return new Pool({
    host,
    user: process.env.SQL_USER?.trim(),
    password: process.env.SQL_PASSWORD?.trim(),
    database: process.env.SQL_DB_NAME?.trim(),
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT.trim(), 10) : 5432,
    ssl: isLocal ? false : { rejectUnauthorized: false },
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
