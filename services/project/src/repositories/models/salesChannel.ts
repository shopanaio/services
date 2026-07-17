import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { storeSchema } from "./schema.js";

export const salesChannelStatusEnum = storeSchema.enum(
  "sales_channel_status",
  ["active", "inactive"]
);

export const salesChannelTypeEnum = storeSchema.enum("sales_channel_type", [
  "online_store",
  "mobile_app",
  "point_of_sale",
  "marketplace",
  "b2b",
  "custom",
]);

/**
 * A first-party or app-provided source through which a sale is made.
 *
 * The stable uppercase code is shared with bounded contexts that cannot keep a
 * cross-service foreign key, such as Pricing's discount_channel projection.
 */
export const salesChannel = storeSchema.table(
  "sales_channel",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: salesChannelTypeEnum("type").notNull(),
    status: salesChannelStatusEnum("status").notNull().default("active"),
    isDefault: boolean("is_default").notNull().default(false),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
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
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    check(
      "sales_channel_code_format_check",
      sql`${table.code} ~ '^[A-Z][A-Z0-9_:-]{1,63}$'`
    ),
    check(
      "sales_channel_name_not_blank_check",
      sql`btrim(${table.name}) <> ''`
    ),
    uniqueIndex("sales_channel_store_code_unique")
      .on(table.storeId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("sales_channel_store_default_unique")
      .on(table.storeId)
      .where(sql`${table.isDefault} = true AND ${table.deletedAt} IS NULL`),
    index("sales_channel_store_status_idx").on(
      table.storeId,
      table.status,
      table.id
    ),
    index("sales_channel_store_type_idx").on(
      table.storeId,
      table.type,
      table.id
    ),
    index("sales_channel_deleted_at_idx")
      .on(table.deletedAt)
      .where(sql`${table.deletedAt} IS NOT NULL`),
  ]
);

export type SalesChannel = typeof salesChannel.$inferSelect;
export type NewSalesChannel = typeof salesChannel.$inferInsert;
export type SalesChannelStatus =
  (typeof salesChannelStatusEnum.enumValues)[number];
export type SalesChannelType =
  (typeof salesChannelTypeEnum.enumValues)[number];
