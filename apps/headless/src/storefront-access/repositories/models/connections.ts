import { sql } from "drizzle-orm";
import { index, pgSchema, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { headlessSchema } from "./schema.js";

const appsSchema = pgSchema("apps");
const appInstallationsReference = appsSchema.table("app_installations", {
  id: uuid("id").primaryKey(),
});

export const headlessStorefrontConnectionStatus = headlessSchema.enum(
  "app_headless_storefront_connection_status",
  ["ACTIVE", "SUSPENDED", "DISCONNECTED"],
);

export const headlessStorefrontConnections = headlessSchema.table(
  "storefront_connections",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    installationId: uuid("installation_id")
      .references(() => appInstallationsReference.id)
      .notNull(),
    organizationId: uuid("organization_id").notNull(),
    storeId: uuid("store_id").notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    status: headlessStorefrontConnectionStatus("status").notNull().default("ACTIVE"),
    createdById: varchar("created_by_id", { length: 255 }),
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
    suspendedAt: timestamp("suspended_at", {
      withTimezone: true,
      mode: "string",
    }),
    disconnectedAt: timestamp("disconnected_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("storefront_connections_installation_status_idx").on(table.installationId, table.status),
    index("storefront_connections_store_status_idx").on(table.storeId, table.status),
    index("storefront_connections_organization_status_idx").on(table.organizationId, table.status),
  ],
);

export type HeadlessStorefrontConnectionStatus =
  (typeof headlessStorefrontConnectionStatus.enumValues)[number];
export type HeadlessStorefrontConnectionModel = typeof headlessStorefrontConnections.$inferSelect;
export type NewHeadlessStorefrontConnectionModel =
  typeof headlessStorefrontConnections.$inferInsert;
