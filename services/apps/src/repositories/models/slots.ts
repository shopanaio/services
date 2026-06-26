import {
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { platformSchema } from "./schema";

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
    projectId: uuid("project_id").notNull(),
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
    unique("provider_configs_project_id_provider_key").on(
      table.projectId,
      table.provider
    ),
    index("idx_provider_configs_project").on(table.projectId),
  ]
);

export const slots = platformSchema.table(
  "slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerConfigId: uuid("provider_config_id")
      .notNull()
      .references(() => providerConfigs.id, { onDelete: "cascade" }),
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
    unique("slots_project_id_domain_provider_key").on(
      table.projectId,
      table.domain,
      table.provider
    ),
    index("idx_slots_project_domain").on(table.projectId, table.domain),
    index("idx_slots_provider_config").on(table.providerConfigId),
  ]
);

export const slotAssignments = platformSchema.table(
  "slot_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
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
      table.projectId,
      table.aggregate,
      table.aggregateId,
      table.domain,
      table.status,
      table.precedence
    ),
    index("idx_slot_assignments_slot").on(table.slotId),
  ]
);

export type ProviderConfig = typeof providerConfigs.$inferSelect;
export type NewProviderConfig = typeof providerConfigs.$inferInsert;
export type Slot = typeof slots.$inferSelect;
export type NewSlot = typeof slots.$inferInsert;
export type SlotAssignment = typeof slotAssignments.$inferSelect;
export type NewSlotAssignment = typeof slotAssignments.$inferInsert;
