import { index, integer, primaryKey, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { headlessStorefrontConnections } from "./connections.js";
import { headlessSchema } from "./schema.js";

export const storefrontAccessPolicies = headlessSchema.table(
  "storefront_access_policies",
  {
    connectionId: uuid("connection_id")
      .primaryKey()
      .references(() => headlessStorefrontConnections.id)
      .notNull(),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    revision: integer("revision").notNull().default(1),
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
    index("storefront_access_policies_store_connection_idx").on(table.storeId, table.connectionId),
    index("storefront_access_policies_organization_connection_idx").on(
      table.organizationId,
      table.connectionId,
    ),
  ],
);

export const storefrontAccessPolicyGrants = headlessSchema.table(
  "storefront_access_policy_grants",
  {
    connectionId: uuid("connection_id")
      .references(() => storefrontAccessPolicies.connectionId)
      .notNull(),
    permission: varchar("permission", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "storefront_access_policy_grants_pkey",
      columns: [table.connectionId, table.permission],
    }),
  ],
);

export type StorefrontAccessPolicyModel = typeof storefrontAccessPolicies.$inferSelect;
export type NewStorefrontAccessPolicyModel = typeof storefrontAccessPolicies.$inferInsert;
export type StorefrontAccessPolicyGrantModel = typeof storefrontAccessPolicyGrants.$inferSelect;
export type NewStorefrontAccessPolicyGrantModel = typeof storefrontAccessPolicyGrants.$inferInsert;
