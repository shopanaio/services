import {
  index,
  integer,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { platformSchema } from "./schema";
import { appInstallations } from "./installations";

export const appBindingStatus = platformSchema.enum("slot_status", [
  "active",
  "inactive",
  "maintenance",
  "deprecated",
]);

export const appBindingAssignmentStatus = platformSchema.enum(
  "slot_assignment_status",
  ["active", "disabled"],
);

export const appBindings = platformSchema.table(
  "slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull(),
    status: appBindingStatus("status").notNull().default("active"),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => appInstallations.id, { onDelete: "cascade" }),
    capability: varchar("capability", { length: 128 }).notNull(),
    operationContract: varchar("operation_contract", {
      length: 128,
    }).notNull(),
    targetAppCode: varchar("target_app_code", { length: 128 }).notNull(),
    targetAction: varchar("target_action", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("slots_installation_capability_operation_key").on(
      table.installationId,
      table.capability,
      table.operationContract,
    ),
    index("slots_installation_idx").on(table.installationId),
    index("slots_capability_route_idx").on(
      table.storeId,
      table.capability,
      table.operationContract,
      table.status,
    ),
  ],
);

export const appBindingAssignments = platformSchema.table(
  "slot_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull(),
    aggregate: varchar("aggregate", { length: 255 }).notNull(),
    aggregateId: varchar("aggregate_id", { length: 255 }).notNull(),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => appBindings.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull(),
    precedence: integer("precedence").notNull().default(0),
    status: appBindingAssignmentStatus("status")
      .notNull()
      .default("active"),
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
      table.precedence,
    ),
    index("idx_slot_assignments_slot").on(table.slotId),
  ],
);

export type AppBinding = typeof appBindings.$inferSelect;
export type NewAppBinding = typeof appBindings.$inferInsert;
export type AppBindingAssignment = typeof appBindingAssignments.$inferSelect;
export type NewAppBindingAssignment =
  typeof appBindingAssignments.$inferInsert;
