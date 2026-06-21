import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.SQL_URL;

let dbCredentials: any;

if (connectionString) {
  dbCredentials = {
    url: connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  };
} else {
  const sqlHost = process.env.SQL_HOST?.trim();
  const sqlDbName = process.env.SQL_DB_NAME?.trim();
  const user = (process.env.SQL_ADMIN_USER || process.env.SQL_USER)?.trim();
  const password = (process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD)?.trim();

  if (!sqlHost) {
    throw new Error("SQL_HOST (or DATABASE_URL) must be set in environment variables.");
  }
  if (!sqlDbName) {
    throw new Error("SQL_DB_NAME (or DATABASE_URL) must be set in environment variables.");
  }
  if (!user) {
    throw new Error("SQL_USER or SQL_ADMIN_USER must be set in environment variables.");
  }
  if (!password) {
    throw new Error("SQL_PASSWORD or SQL_ADMIN_PASSWORD must be set in environment variables.");
  }

  const isLocal = sqlHost.includes('localhost') || sqlHost.includes('127.0.0.1');

  dbCredentials = {
    host: sqlHost,
    user: user,
    password: password,
    database: sqlDbName,
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT.trim(), 10) : 5432,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  };
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials,
  verbose: true,
});
