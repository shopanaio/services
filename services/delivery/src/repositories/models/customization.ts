import { index, integer, jsonb, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { deliverySchema } from "./schema.js";

export const customizations = deliverySchema.table("customizations", {
  id: uuid("id").primaryKey(),
  storeId: uuid("store_id").notNull(),
  status: text("status").notNull(),
  policyRevision: text("policy_revision").notNull(),
  configurationRevision: text("configuration_revision").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [index("customizations_store_status_idx").on(table.storeId, table.status)]);

export const customizationBindings = deliverySchema.table("customization_bindings", {
  id: uuid("id").primaryKey(),
  storeId: uuid("store_id").notNull(),
  customizationId: uuid("customization_id").notNull(),
  installationId: uuid("installation_id").notNull(),
  functionKey: text("function_key").notNull(),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull(),
  configurationRevision: text("configuration_revision").notNull(),
  pinnedRouteRevision: text("pinned_route_revision").notNull(),
  precedence: integer("precedence").notNull(),
  activationSequence: integer("activation_sequence").notNull(),
  failureMode: text("failure_mode").notNull(),
  status: text("status").notNull(),
}, (table) => [
  unique("customization_bindings_owner_sequence_key").on(table.customizationId, table.activationSequence),
  index("customization_bindings_store_status_idx").on(table.storeId, table.status),
]);
