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
import { sql } from "drizzle-orm";
import { platformSchema } from "./schema";
import { appInstallations } from "./installations";

export const slotStatus = platformSchema.enum("slot_status", [
  "active",
  "inactive",
  "maintenance",
  "deprecated",
]);

export const slotEnvironment = platformSchema.enum("slot_environment", [
  "development",
  "staging",
  "production",
]);

export const slotAssignmentStatus = platformSchema.enum("slot_assignment_status", [
  "active",
  "disabled",
]);

export const providerConfigs = platformSchema.table(
  "provider_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    data: jsonb("data").notNull().default({}),
    version: integer("version").notNull().default(1),
    status: slotStatus("status").notNull().default("active"),
    environment: slotEnvironment("environment")
      .notNull()
      .default("production"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("provider_configs_store_id_provider_key").on(
      table.storeId,
      table.provider
    ),
    index("idx_provider_configs_store").on(table.storeId),
  ]
);

export const slots = platformSchema.table(
  "slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerConfigId: uuid("provider_config_id")
      .references(() => providerConfigs.id, { onDelete: "cascade" }),
    status: slotStatus("status").notNull().default("active"),
    installationId: uuid("installation_id").references(
      () => appInstallations.id,
      { onDelete: "cascade" },
    ),
    capability: varchar("capability", { length: 128 }),
    operationContract: varchar("operation_contract", { length: 128 }),
    targetAppCode: varchar("target_app_code", { length: 128 }),
    targetAction: varchar("target_action", { length: 128 }),
    capabilities: text("capabilities")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("slots_store_id_domain_provider_key").on(
      table.storeId,
      table.domain,
      table.provider
    ),
    uniqueIndex("slots_installation_capability_operation_key")
      .on(
        table.installationId,
        table.capability,
        table.operationContract,
      )
      .where(sql`${table.installationId} is not null`),
    index("idx_slots_store_domain").on(table.storeId, table.domain),
    index("idx_slots_provider_config").on(table.providerConfigId),
    index("slots_installation_idx").on(table.installationId),
    index("slots_capability_route_idx").on(
      table.storeId,
      table.capability,
      table.operationContract,
      table.status,
    ),
  ]
);

export const slotAssignments = platformSchema.table(
  "slot_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull(),
    aggregate: varchar("aggregate", { length: 255 }).notNull(),
    aggregateId: varchar("aggregate_id", { length: 255 }).notNull(),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => slots.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull(),
    precedence: integer("precedence").notNull().default(0),
    status: slotAssignmentStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_slot_assignments_resolve").on(
      table.storeId,
      table.aggregate,
      table.aggregateId,
      table.domain,
      table.status,
      table.precedence
    ),
    index("idx_slot_assignments_slot").on(table.slotId),
  ]
);

export const providerSecrets = platformSchema.table(
  "provider_secrets",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    providerConfigId: uuid("provider_config_id")
      .notNull()
      .references(() => providerConfigs.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    ciphertext: text("ciphertext").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("provider_secrets_config_name_key").on(
      table.providerConfigId,
      table.name
    ),
    index("provider_secrets_store_idx").on(table.storeId),
  ]
);

export const providerSecretAuditEvents = platformSchema.table(
  "provider_secret_audit_events",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    providerConfigId: uuid("provider_config_id")
      .notNull()
      .references(() => providerConfigs.id, { onDelete: "cascade" }),
    secretName: varchar("secret_name", { length: 128 }).notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("provider_secret_audit_store_created_idx").on(
      table.storeId,
      table.createdAt
    ),
  ]
);

export type ProviderConfig = typeof providerConfigs.$inferSelect;
export type NewProviderConfig = typeof providerConfigs.$inferInsert;
export type Slot = typeof slots.$inferSelect;
export type NewSlot = typeof slots.$inferInsert;
export type SlotAssignment = typeof slotAssignments.$inferSelect;
export type NewSlotAssignment = typeof slotAssignments.$inferInsert;
export type ProviderSecret = typeof providerSecrets.$inferSelect;
export type NewProviderSecret = typeof providerSecrets.$inferInsert;
