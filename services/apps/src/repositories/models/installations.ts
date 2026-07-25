import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { platformSchema } from "./schema";

export const appInstallationStatus = platformSchema.enum(
  "app_installation_status",
  [
    "PENDING_CONSENT",
    "INSTALLING",
    "ACTIVE",
    "INSTALL_FAILED",
    "SUSPENDING",
    "SUSPENDED",
    "RESUMING",
    "UPDATING",
    "UPDATE_FAILED",
    "UNINSTALLING",
    "UNINSTALLED",
    "UNINSTALL_FAILED",
  ],
);

export const appInstallationHealthStatus = platformSchema.enum(
  "app_installation_health_status",
  ["UNKNOWN", "HEALTHY", "DEGRADED", "UNHEALTHY"],
);

export const appLifecycleOperationType = platformSchema.enum(
  "app_lifecycle_operation_type",
  ["INSTALL", "UPDATE", "SUSPEND", "RESUME", "UNINSTALL"],
);

export const appLifecycleOperationStatus = platformSchema.enum(
  "app_lifecycle_operation_status",
  ["PENDING", "RUNNING", "SUCCEEDED", "FAILED"],
);

export const appInstallations = platformSchema.table(
  "app_installations",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    appCode: varchar("app_code", { length: 128 }).notNull(),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    status: appInstallationStatus("status")
      .notNull()
      .default("PENDING_CONSENT"),
    installedVersion: varchar("installed_version", { length: 64 }),
    targetVersion: varchar("target_version", { length: 64 }),
    manifestHash: varchar("manifest_hash", { length: 64 }),
    configuration: jsonb("configuration")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    configurationVersion: integer("configuration_version")
      .notNull()
      .default(1),
    installedByUserId: uuid("installed_by_user_id"),
    healthStatus: appInstallationHealthStatus("health_status")
      .notNull()
      .default("UNKNOWN"),
    lastErrorCode: varchar("last_error_code", { length: 128 }),
    lastErrorMessage: text("last_error_message"),
    installedAt: timestamp("installed_at", {
      withTimezone: true,
      mode: "string",
    }),
    suspendedAt: timestamp("suspended_at", {
      withTimezone: true,
      mode: "string",
    }),
    uninstalledAt: timestamp("uninstalled_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_installations_active_store_app_key")
      .on(table.storeId, table.appCode)
      .where(sql`${table.status} <> 'UNINSTALLED'`),
    index("app_installations_store_status_idx").on(
      table.storeId,
      table.status,
    ),
    index("app_installations_organization_idx").on(table.organizationId),
  ],
);

export const appInstallationManifestSnapshots = platformSchema.table(
  "app_installation_manifest_snapshots",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => appInstallations.id, { onDelete: "cascade" }),
    appCode: varchar("app_code", { length: 128 }).notNull(),
    version: varchar("version", { length: 64 }).notNull(),
    manifestHash: varchar("manifest_hash", { length: 64 }).notNull(),
    manifest: jsonb("manifest").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("app_installation_manifest_snapshot_key").on(
      table.installationId,
      table.version,
      table.manifestHash,
    ),
    index("app_installation_manifest_installation_idx").on(
      table.installationId,
    ),
  ],
);

export const appInstallationScopes = platformSchema.table(
  "app_installation_scopes",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => appInstallations.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 255 }).notNull(),
    grantedAt: timestamp("granted_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    unique("app_installation_scope_key").on(
      table.installationId,
      table.scope,
    ),
    index("app_installation_scopes_installation_idx").on(
      table.installationId,
    ),
  ],
);

export const appInstallationSecrets = platformSchema.table(
  "app_installation_secrets",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => appInstallations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    ciphertext: text("ciphertext").notNull(),
    version: integer("version").notNull().default(1),
    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("app_installation_secret_key").on(
      table.installationId,
      table.name,
    ),
    index("app_installation_secrets_installation_idx").on(
      table.installationId,
    ),
  ],
);

export const appLifecycleOperations = platformSchema.table(
  "app_lifecycle_operations",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => appInstallations.id, { onDelete: "cascade" }),
    type: appLifecycleOperationType("type").notNull(),
    status: appLifecycleOperationStatus("status")
      .notNull()
      .default("PENDING"),
    targetVersion: varchar("target_version", { length: 64 }).notNull(),
    previousInstallationStatus: appInstallationStatus(
      "previous_installation_status",
    ),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    workflowId: varchar("workflow_id", { length: 255 }).notNull(),
    actorType: varchar("actor_type", { length: 16 }).notNull(),
    actorId: varchar("actor_id", { length: 255 }),
    correlationId: varchar("correlation_id", { length: 255 }),
    errorCode: varchar("error_code", { length: 128 }),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "string",
    }),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("app_lifecycle_operation_idempotency_key").on(
      table.installationId,
      table.idempotencyKey,
    ),
    index("app_lifecycle_operations_installation_idx").on(
      table.installationId,
      table.createdAt,
    ),
    index("app_lifecycle_operations_status_idx").on(table.status),
  ],
);

export type AppInstallationModel = typeof appInstallations.$inferSelect;
export type AppLifecycleOperationModel =
  typeof appLifecycleOperations.$inferSelect;
