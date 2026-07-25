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
import { appInstallations } from "./installations.js";
import { platformSchema } from "./schema.js";

export const salesChannelConnectionStatus = platformSchema.enum(
  "app_sales_channel_connection_status",
  [
    "DRAFT",
    "CONNECTING",
    "ACTIVE",
    "CONNECT_FAILED",
    "UPDATING",
    "UPDATE_FAILED",
    "SUSPENDING",
    "SUSPENDED",
    "RESUMING",
    "DISCONNECTING",
    "DISCONNECTED",
    "DISCONNECT_FAILED",
  ],
);

export const salesChannelHealthStatus = platformSchema.enum(
  "app_sales_channel_health_status",
  ["UNKNOWN", "HEALTHY", "DEGRADED", "UNHEALTHY"],
);

export const salesChannelOperationType = platformSchema.enum(
  "app_sales_channel_operation_type",
  ["CONNECT", "UPDATE", "SUSPEND", "RESUME", "DISCONNECT"],
);

export const salesChannelOperationStatus = platformSchema.enum(
  "app_sales_channel_operation_status",
  ["PENDING", "RUNNING", "SUCCEEDED", "FAILED"],
);

export const appSalesChannelSpecificationSnapshots = platformSchema.table(
  "app_sales_channel_specification_snapshots",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => appInstallations.id),
    appCode: varchar("app_code", { length: 128 }).notNull(),
    appVersion: varchar("app_version", { length: 64 }).notNull(),
    manifestHash: varchar("manifest_hash", { length: 64 }).notNull(),
    handle: varchar("handle", { length: 128 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    definition: jsonb("definition")
      .$type<Record<string, unknown>>()
      .notNull(),
    definitionHash: varchar("definition_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("app_sales_channel_specification_version_key").on(
      table.installationId,
      table.appVersion,
      table.manifestHash,
      table.handle,
    ),
    index("app_sales_channel_specification_installation_idx").on(
      table.installationId,
      table.handle,
    ),
  ],
);

export const appSalesChannelConnections = platformSchema.table(
  "app_sales_channel_connections",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => appInstallations.id),
    specificationSnapshotId: uuid("specification_snapshot_id")
      .notNull()
      .references(() => appSalesChannelSpecificationSnapshots.id),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    externalAccountId: varchar("external_account_id", { length: 255 }),
    externalAccountLabel: varchar("external_account_label", {
      length: 255,
    }),
    status: salesChannelConnectionStatus("status")
      .notNull()
      .default("DRAFT"),
    configuration: jsonb("configuration")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    configurationVersion: integer("configuration_version")
      .notNull()
      .default(1),
    healthStatus: salesChannelHealthStatus("health_status")
      .notNull()
      .default("UNKNOWN"),
    lastErrorCode: varchar("last_error_code", { length: 128 }),
    lastErrorMessage: text("last_error_message"),
    connectedAt: timestamp("connected_at", {
      withTimezone: true,
      mode: "string",
    }),
    suspendedAt: timestamp("suspended_at", {
      withTimezone: true,
      mode: "string",
    }),
    disconnectedAt: timestamp("disconnected_at", {
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
    index("app_sales_channel_connections_store_status_idx").on(
      table.storeId,
      table.status,
      table.id,
    ),
    index("app_sales_channel_connections_installation_status_idx").on(
      table.installationId,
      table.status,
      table.id,
    ),
    index("app_sales_channel_connections_specification_idx").on(
      table.specificationSnapshotId,
    ),
    uniqueIndex("app_sales_channel_connections_external_account_key")
      .on(
        table.storeId,
        table.installationId,
        table.specificationSnapshotId,
        table.externalAccountId,
      )
      .where(
        sql`${table.status} <> 'DISCONNECTED' AND ${table.externalAccountId} IS NOT NULL`,
      ),
  ],
);

export const appSalesChannelOperations = platformSchema.table(
  "app_sales_channel_operations",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => appSalesChannelConnections.id),
    type: salesChannelOperationType("type").notNull(),
    status: salesChannelOperationStatus("status")
      .notNull()
      .default("PENDING"),
    targetSpecificationId: uuid("target_specification_id").references(
      () => appSalesChannelSpecificationSnapshots.id,
    ),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    workflowId: varchar("workflow_id", { length: 255 }).notNull(),
    actorType: varchar("actor_type", { length: 16 }).notNull(),
    actorId: varchar("actor_id", { length: 255 }),
    correlationId: varchar("correlation_id", { length: 255 }),
    previousConnectionStatus: salesChannelConnectionStatus(
      "previous_connection_status",
    ),
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
    unique("app_sales_channel_operation_idempotency_key").on(
      table.connectionId,
      table.idempotencyKey,
    ),
    index("app_sales_channel_operations_connection_idx").on(
      table.connectionId,
      table.createdAt,
    ),
    index("app_sales_channel_operations_status_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);

export type SalesChannelSpecificationSnapshotModel =
  typeof appSalesChannelSpecificationSnapshots.$inferSelect;
export type SalesChannelConnectionModel =
  typeof appSalesChannelConnections.$inferSelect;
export type SalesChannelOperationModel =
  typeof appSalesChannelOperations.$inferSelect;
