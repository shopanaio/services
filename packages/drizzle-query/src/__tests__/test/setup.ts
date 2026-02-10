import { PGlite } from "@electric-sql/pglite";
import { drizzle, PgliteDatabase } from "drizzle-orm/pglite";
import { beforeAll, afterAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import {
  pgTable,
  pgSchema,
  pgView,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Qualified schema for testing
export const analyticsSchema = pgSchema("analytics");

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

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  sortOrder: integer("sort_order").default(0),
  isVisible: boolean("is_visible").default(true),
});

// ============ VIEWS ============

/**
 * View: Products with computed display info
 */
export const productsView = pgView("products_view").as((qb) =>
  qb
    .select({
      id: products.id,
      handle: products.handle,
      price: products.price,
      deletedAt: products.deletedAt,
      displayHandle: sql<string>`UPPER(${products.handle})`.as("display_handle"),
      priceRange: sql<string>`
        CASE
          WHEN ${products.price} < 100 THEN 'budget'
          WHEN ${products.price} < 500 THEN 'mid-range'
          ELSE 'premium'
        END
      `.as("price_range"),
    })
    .from(products)
    .where(sql`${products.deletedAt} IS NULL`)
);

// Qualified table in "analytics" schema
export const events = analyticsSchema.table("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  eventType: text("event_type").notNull(),
  payload: text("payload"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema object for drizzle-kit
export const schema = {
  users,
  products,
  translations,
  categories,
  events,
  productsView,
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

    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_visible BOOLEAN DEFAULT true
    );

    CREATE SCHEMA IF NOT EXISTS analytics;

    CREATE TABLE IF NOT EXISTS analytics.events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT,
      created_at TIMESTAMP DEFAULT now()
    );

    -- Create products_view
    CREATE OR REPLACE VIEW products_view AS
    SELECT
      id,
      handle,
      price,
      deleted_at,
      UPPER(handle) AS display_handle,
      CASE
        WHEN price < 100 THEN 'budget'
        WHEN price < 500 THEN 'mid-range'
        ELSE 'premium'
      END AS price_range
    FROM products
    WHERE deleted_at IS NULL;
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
    TRUNCATE TABLE categories CASCADE;
    TRUNCATE TABLE analytics.events CASCADE;
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
