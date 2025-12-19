import {
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projectSchema } from "./schema.js";
import { project } from "./project.js";

/**
 * Integration types supported by the platform
 */
export const integrationTypeEnum = projectSchema.enum("integration_type", [
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
export const integrationStatusEnum = projectSchema.enum("integration_status", [
  "active",
  "inactive",
  "error",
]);

/**
 * Project integrations table
 *
 * Stores external service integrations for each project.
 * Each project can have one integration per type.
 */
export const projectIntegration = projectSchema.table(
  "project_integration",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),

    /** Integration type (iam, payment, shipping, etc.) */
    type: integrationTypeEnum("type").notNull(),

    /** Provider identifier (casdoor, stripe, novaposhta, etc.) */
    provider: varchar("provider", { length: 64 }).notNull(),

    /** Integration status */
    status: integrationStatusEnum("status").notNull().default("active"),

    /**
     * Public configuration (non-sensitive)
     * Example for IAM: { tenantId: "my-store", endpoint: "https://auth.shopana.io" }
     */
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),

    /**
     * Credentials (sensitive data)
     * Example for IAM: { clientId: "xxx", clientSecret: "yyy" }
     * TODO: Consider encrypting this field
     */
    credentials: jsonb("credentials").$type<Record<string, unknown>>().notNull().default({}),

    /** Last successful sync/health check */
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),

    /** Error message if status is 'error' */
    errorMessage: varchar("error_message", { length: 1000 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    // Each project can have only one integration per type
    uniqueIndex("idx_project_integration_unique")
      .on(table.projectId, table.type),
    index("idx_project_integration_project_id").on(table.projectId),
    index("idx_project_integration_type").on(table.type),
    index("idx_project_integration_status").on(table.status),
  ]
);

export type ProjectIntegration = typeof projectIntegration.$inferSelect;
export type NewProjectIntegration = typeof projectIntegration.$inferInsert;
export type IntegrationType = "iam" | "payment" | "shipping" | "storage" | "email" | "analytics";
export type IntegrationStatus = "active" | "inactive" | "error";

/**
 * Type-safe config interfaces for each integration type
 */
export interface IamIntegrationConfig {
  tenantId: string;
  endpoint?: string;
}

export interface IamIntegrationCredentials {
  clientId: string;
  clientSecret: string;
}
