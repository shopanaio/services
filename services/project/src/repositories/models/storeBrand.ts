import { sql } from "drizzle-orm";
import {
  check,
  index,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { storeSchema } from "./schema.js";

/** Store-owned brand presentation settings. Media IDs belong to Media service. */
export const storeBrand = storeSchema.table(
  "store_brand",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    defaultLogoMediaId: uuid("default_logo_media_id"),
    squareLogoMediaId: uuid("square_logo_media_id"),
    coverImageMediaId: uuid("cover_image_media_id"),
    primaryColor: varchar("primary_color", { length: 7 }).notNull().default("#1677FF"),
    secondaryColor: varchar("secondary_color", { length: 7 }).notNull().default("#101112"),
    slogan: varchar("slogan", { length: 255 }),
    shortDescription: varchar("short_description", { length: 500 }),
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
    uniqueIndex("store_brand_store_unique").on(table.storeId),
    check("store_brand_primary_color_check", sql`${table.primaryColor} ~ '^#[0-9A-Fa-f]{6}$'`),
    check("store_brand_secondary_color_check", sql`${table.secondaryColor} ~ '^#[0-9A-Fa-f]{6}$'`),
    check(
      "store_brand_slogan_not_blank_check",
      sql`${table.slogan} IS NULL OR btrim(${table.slogan}) <> ''`,
    ),
    check(
      "store_brand_short_description_not_blank_check",
      sql`${table.shortDescription} IS NULL OR btrim(${table.shortDescription}) <> ''`,
    ),
  ],
);

/** Ordered social profiles associated with a store brand. */
export const storeBrandSocialLink = storeSchema.table(
  "store_brand_social_link",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => storeBrand.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 32 }).notNull(),
    url: text("url").notNull(),
    position: smallint("position").notNull().default(0),
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
    uniqueIndex("store_brand_social_link_platform_unique").on(table.brandId, table.platform),
    index("store_brand_social_link_store_position_idx").on(table.storeId, table.position, table.id),
    check(
      "store_brand_social_link_platform_format_check",
      sql`${table.platform} ~ '^[a-z][a-z0-9_-]{0,31}$'`,
    ),
    check("store_brand_social_link_url_check", sql`${table.url} ~* '^https?://[^[:space:]]+$'`),
    check("store_brand_social_link_position_check", sql`${table.position} >= 0`),
  ],
);

export type StoreBrand = typeof storeBrand.$inferSelect;
export type NewStoreBrand = typeof storeBrand.$inferInsert;
export type StoreBrandSocialLink = typeof storeBrandSocialLink.$inferSelect;
export type NewStoreBrandSocialLink = typeof storeBrandSocialLink.$inferInsert;
