import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

// Database connection string - configurable via environment variable
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost:5432/second_brain";

// Create the postgres connection
const client = postgres(DATABASE_URL);

// Create the Drizzle ORM instance
export const db = drizzle(client, { schema });

// Export raw postgres client for custom queries
export const rawDb = client;

// Export schema for use in queries
export { schema };

// Export types for the database
export type DbInstance = typeof db;
