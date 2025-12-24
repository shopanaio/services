import {
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeSchema } from "./schema.js";
import { store } from "./store.js";

/**
 * Integration types supported by the platform
 */
export const integrationTypeEnum = storeSchema.enum("integration_type", [
  "iam",        // Identity & Access Management (Casdoor, Auth0, etc.)
  "payment",    // Payment providers (Stripe, LiqPay, etc.)
  "shipping",   // Shipping providers (NovaPoshta, Meest, etc.)
  "storage",    // File storage (S3, GCS, etc.)
  "email",      // Email providers (SendGrid, Mailgun, etc.)
  "analytics",  // Analytics (GA, Mixpanel, etc.)
]);

/**
 * Integration status
 */
export const integrationStatusEnum = storeSchema.enum("integration_status", [
  "active",
  "inactive",
  "error",
]);

/**
 * Store integrations table
 *
 * Stores external service integrations for each store.
 * Each store can have one integration per type.
 */
export const storeIntegration = storeSchema.table(
  "store_integration",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => store.id, { onDelete: "cascade" }),

    /** Integration type (iam, payment, shipping, etc.) */
    type: integrationTypeEnum("type").notNull(),

    /** Provider identifier (casdoor, stripe, novaposhta, etc.) */
    provider: varchar("provider", { length: 64 }).notNull(),

    /** Integration status */
    status: integrationStatusEnum("status").notNull().default("active"),

    /**
     * Public configuration (non-sensitive)
     * Example for IAM: { organizationId: "uuid", endpoint: "https://auth.shopana.io" }
     */
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),

    /**
     * Credentials (sensitive data, optional)
     * Note: IAM credentials are managed by IAM service, not stored here.
     * Used for other integrations like payment providers if needed.
     */
    credentials: jsonb("credentials").$type<Record<string, unknown>>().default({}),

    /** Last successful sync/health check */
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),

    /** Error message if status is 'error' */
    errorMessage: varchar("error_message", { length: 1000 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    // Each store can have only one integration per type
    uniqueIndex("idx_store_integration_unique")
      .on(table.storeId, table.type),
    index("idx_store_integration_store_id").on(table.storeId),
    index("idx_store_integration_type").on(table.type),
    index("idx_store_integration_status").on(table.status),
  ]
);

export type StoreIntegration = typeof storeIntegration.$inferSelect;
export type NewStoreIntegration = typeof storeIntegration.$inferInsert;
export type IntegrationType = "iam" | "payment" | "shipping" | "storage" | "email" | "analytics";
export type IntegrationStatus = "active" | "inactive" | "error";

/**
 * Type-safe config interfaces for each integration type
 */
export interface IamIntegrationConfig {
  organizationId: string;
}
