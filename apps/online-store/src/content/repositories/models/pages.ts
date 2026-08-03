import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { localeCodeEnum, onlineStoreSchema } from "./schema.js";

const appsSchema = pgSchema("apps");
const appInstallationsReference = appsSchema.table("app_installations", {
  id: uuid("id").primaryKey(),
});

export const pages = onlineStoreSchema.table(
  "pages",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => appInstallationsReference.id),
    storeId: uuid("store_id").notNull(),
    handle: varchar("handle", { length: 255 }).notNull(),
    templateSuffix: varchar("template_suffix", { length: 64 }),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    }),
    revision: integer("revision").notNull().default(0),
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
    check("pages_handle_not_empty_check", sql`btrim(${table.handle}) <> ''`),
    check("pages_revision_check", sql`${table.revision} >= 0`),
    uniqueIndex("pages_store_handle_key")
      .on(table.storeId, table.handle)
      .where(sql`${table.deletedAt} IS NULL`),
    index("pages_installation_idx").on(table.installationId),
    index("pages_store_publication_idx")
      .on(table.storeId, table.publishedAt)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const pageTranslations = onlineStoreSchema.table(
  "page_translations",
  {
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
    locale: localeCodeEnum("locale").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    bodyText: text("body_text"),
    bodyHtml: text("body_html"),
    bodyJson: jsonb("body_json").$type<Record<string, unknown>>(),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
  },
  (table) => [
    primaryKey({ columns: [table.pageId, table.locale] }),
    check(
      "page_translations_title_not_empty_check",
      sql`btrim(${table.title}) <> ''`,
    ),
    index("page_translations_store_locale_idx").on(
      table.storeId,
      table.locale,
    ),
  ],
);

export type PageModel = typeof pages.$inferSelect;
export type NewPageModel = typeof pages.$inferInsert;
export type PageTranslationModel = typeof pageTranslations.$inferSelect;
export type NewPageTranslationModel = typeof pageTranslations.$inferInsert;
