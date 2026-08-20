import { timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { customersSchema } from "./schema.js";

export const storefrontAuthConfiguration = customersSchema.table(
  "storefront_auth_configuration",
  {
    storeId: uuid("store_id").primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    applicationId: uuid("application_id").notNull(),
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
    uniqueIndex("storefront_auth_configuration_application_unique").on(table.applicationId),
  ],
);

export type StorefrontAuthConfiguration = typeof storefrontAuthConfiguration.$inferSelect;
