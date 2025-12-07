import { PGlite } from "@electric-sql/pglite";
import { drizzle, PgliteDatabase } from "drizzle-orm/pglite";
import { beforeAll, afterAll, beforeEach } from "vitest";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Test schema tables
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  age: integer("age"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  handle: text("handle").notNull(),
  price: integer("price"),
  deletedAt: timestamp("deleted_at"),
});

export const translations = pgTable("translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityId: uuid("entity_id").notNull(),
  field: text("field").notNull(),
  value: text("value"),
  searchValue: text("search_value"),
});

// Schema object for drizzle-kit
export const schema = {
  users,
  products,
  translations,
};

// Global database instance
let client: PGlite | null = null;
let db: PgliteDatabase<typeof schema> | null = null;

export function getDb(): PgliteDatabase<typeof schema> {
  if (!db) {
    throw new Error("Database not initialized. Did you call setupTestDb()?");
  }
  return db;
}

export function getClient(): PGlite {
  if (!client) {
    throw new Error("Client not initialized. Did you call setupTestDb()?");
  }
  return client;
}

export async function setupTestDb() {
  // Create in-memory PGlite instance
  client = new PGlite();
  db = drizzle(client, { schema });

  // Create tables using raw SQL (since pushSchema requires filesystem)
  await client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      age INTEGER,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      handle TEXT NOT NULL,
      price INTEGER,
      deleted_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS translations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_id UUID NOT NULL,
      field TEXT NOT NULL,
      value TEXT,
      search_value TEXT
    );
  `);

  return { db, client };
}

export async function teardownTestDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export async function clearTables() {
  if (!client) return;
  await client.exec(`
    TRUNCATE TABLE users CASCADE;
    TRUNCATE TABLE products CASCADE;
    TRUNCATE TABLE translations CASCADE;
  `);
}

// Global setup hooks - these run for all tests
let initialized = false;

beforeAll(async () => {
  if (!initialized) {
    await setupTestDb();
    initialized = true;
  }
});

afterAll(async () => {
  await teardownTestDb();
  initialized = false;
});
