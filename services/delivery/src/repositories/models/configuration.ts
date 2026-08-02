import { bigint, index, integer, jsonb, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import type { Delivery } from "@shopana/broker-types";
import { deliverySchema } from "./schema.js";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
};

export const providerAccounts = deliverySchema.table("provider_accounts", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  storeId: uuid("store_id").notNull(),
  installationId: uuid("installation_id").notNull(),
  mode: text("mode").notNull(),
  providerCode: text("provider_code").notNull(),
  displayName: text("display_name").notNull(),
  accountRevision: integer("account_revision").notNull(),
  supportedCountryCodes: jsonb("supported_country_codes").$type<readonly string[]>().notNull(),
  supportedCurrencyCodes: jsonb("supported_currency_codes").$type<readonly string[]>().notNull(),
  supportedOperations: jsonb("supported_operations").$type<readonly Delivery.DeliveryProviderOperation[]>().notNull(),
  snapshot: jsonb("snapshot").$type<Delivery.DeliveryProviderAccountSnapshot>().notNull(),
  ...timestamps,
}, (table) => [
  unique("provider_accounts_store_installation_key").on(table.storeId, table.installationId),
  index("provider_accounts_store_idx").on(table.storeId),
]);

export const profiles = deliverySchema.table("profiles", {
  id: uuid("id").primaryKey(),
  storeId: uuid("store_id").notNull(),
  revision: integer("revision").notNull(),
  status: text("status").notNull(),
  snapshot: jsonb("snapshot").$type<Delivery.DeliveryProfileSnapshot>().notNull(),
  ...timestamps,
}, (table) => [index("profiles_store_status_idx").on(table.storeId, table.status)]);

export const profileSets = deliverySchema.table("profile_sets", {
  id: uuid("id").primaryKey(),
  storeId: uuid("store_id").notNull(),
  revision: text("revision").notNull(),
  currencyCode: text("currency_code").notNull(),
  snapshot: jsonb("snapshot").$type<Delivery.DeliveryProfileSetSnapshot>().notNull(),
  activatedAt: timestamp("activated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  ...timestamps,
}, (table) => [
  unique("profile_sets_store_key").on(table.storeId),
  unique("profile_sets_store_revision_key").on(table.storeId, table.revision),
]);

export const profileAssignmentMemberships = deliverySchema.table("profile_assignment_memberships", {
  id: uuid("id").primaryKey(),
  storeId: uuid("store_id").notNull(),
  profileSetRevision: text("profile_set_revision").notNull(),
  profileId: uuid("profile_id").notNull(),
  assignmentSetId: uuid("assignment_set_id").notNull(),
  membershipType: text("membership_type").notNull(),
  resourceId: uuid("resource_id").notNull(),
  assignmentRevision: text("assignment_revision").notNull(),
  sequence: bigint("sequence", { mode: "number" }).notNull(),
}, (table) => [
  unique("profile_assignment_membership_key").on(table.assignmentSetId, table.membershipType, table.resourceId),
  index("profile_assignment_lookup_idx").on(table.storeId, table.membershipType, table.resourceId),
]);
