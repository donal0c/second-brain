import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

// Database file path - configurable via environment variable
const DB_PATH = process.env.DATABASE_PATH || "./data/second-brain.db";

// Create the SQLite connection
const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");

// Create the Drizzle ORM instance
export const db = drizzle(sqlite, { schema });

// Export schema for use in queries
export { schema };

// Export types for the database
export type DbInstance = typeof db;
