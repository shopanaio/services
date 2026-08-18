import { index, jsonb, text, timestamp, unique, uuid, integer } from "drizzle-orm/pg-core";
import type { Delivery } from "@shopana/broker-types";
import { deliverySchema } from "./schema.js";

export const checkoutOptionBindings = deliverySchema.table("checkout_option_bindings", {
  id: uuid("id").primaryKey(),
  storeId: uuid("store_id").notNull(),
  checkoutId: uuid("checkout_id").notNull(),
  basedOnCheckoutVersion: integer("based_on_checkout_version").notNull(),
  targetCheckoutVersion: integer("target_checkout_version").notNull(),
  groupId: text("group_id").notNull(),
  optionHandle: text("option_handle").notNull(),
  preliminaryRevision: text("preliminary_revision").notNull(),
  deliveryRevision: text("delivery_revision").notNull(),
  option: jsonb("option").$type<Delivery.DeliveryCheckoutOption>().notNull(),
  snapshot: jsonb("snapshot").$type<Delivery.DeliveryOptionBindingSnapshot>().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  unique("checkout_option_bindings_identity_key").on(table.storeId, table.checkoutId, table.targetCheckoutVersion, table.groupId, table.optionHandle),
  index("checkout_option_bindings_lookup_idx").on(table.storeId, table.checkoutId, table.targetCheckoutVersion, table.groupId, table.optionHandle, table.expiresAt),
]);

export const checkoutSelectionCommitments = deliverySchema.table("checkout_selection_commitments", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  storeId: uuid("store_id").notNull(),
  checkoutId: uuid("checkout_id").notNull(),
  checkoutVersion: integer("checkout_version").notNull(),
  groupId: text("group_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  snapshot: jsonb("snapshot").$type<Delivery.DeliveryCommittedGroupSnapshot>().notNull(),
  committedAt: timestamp("committed_at", { withTimezone: true, mode: "string" }).notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true, mode: "string" }),
}, (table) => [
  unique("checkout_selection_commitments_group_key").on(table.storeId, table.checkoutId, table.checkoutVersion, table.groupId),
  unique("checkout_selection_commitments_idempotency_key").on(table.storeId, table.idempotencyKey, table.groupId),
  index("checkout_selection_commitments_checkout_idx").on(table.storeId, table.checkoutId, table.checkoutVersion),
]);

export const providerRateCache = deliverySchema.table("provider_rate_cache", {
  id: uuid("id").primaryKey(),
  storeId: uuid("store_id").notNull(),
  checkoutId: uuid("checkout_id").notNull(),
  basedOnCheckoutVersion: integer("based_on_checkout_version").notNull(),
  cacheKey: text("cache_key").notNull(),
  result: jsonb("result").$type<Delivery.DeliveryCarrierServiceRateResult>().notNull(),
  cachedAt: timestamp("cached_at", { withTimezone: true, mode: "string" }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
}, (table) => [
  unique("provider_rate_cache_key").on(table.storeId, table.cacheKey),
  index("provider_rate_cache_expiry_idx").on(table.storeId, table.expiresAt),
]);
