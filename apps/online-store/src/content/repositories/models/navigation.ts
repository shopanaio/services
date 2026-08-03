import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  appInstallationsReference,
  localeCodeEnum,
  onlineStoreSchema,
} from "./schema.js";

export const navigationMenus = onlineStoreSchema.table(
  "navigation_menus",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => appInstallationsReference.id),
    storeId: uuid("store_id").notNull(),
    handle: varchar("handle", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
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
    check(
      "navigation_menus_handle_not_empty_check",
      sql`btrim(${table.handle}) <> ''`,
    ),
    check(
      "navigation_menus_name_not_empty_check",
      sql`btrim(${table.name}) <> ''`,
    ),
    check("navigation_menus_revision_check", sql`${table.revision} >= 0`),
    uniqueIndex("navigation_menus_installation_handle_key")
      .on(table.installationId, table.handle)
      .where(sql`${table.deletedAt} IS NULL`),
    index("navigation_menus_installation_idx").on(table.installationId),
    index("navigation_menus_store_idx")
      .on(table.storeId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const navigationMenuItems = onlineStoreSchema.table(
  "navigation_menu_items",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    menuId: uuid("menu_id")
      .notNull()
      .references(() => navigationMenus.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
    parentId: uuid("parent_id"),
    lexoRank: varchar("lexo_rank", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 64 }).notNull(),
    targetId: uuid("target_id"),
    url: text("url"),
    openInNewTab: boolean("open_in_new_tab").notNull().default(false),
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
  },
  (table) => [
    unique("navigation_menu_items_menu_id_id_key").on(table.menuId, table.id),
    foreignKey({
      name: "navigation_menu_items_parent_fk",
      columns: [table.menuId, table.parentId],
      foreignColumns: [table.menuId, table.id],
    }).onDelete("cascade"),
    check(
      "navigation_menu_items_parent_not_self_check",
      sql`${table.parentId} IS NULL OR ${table.parentId} <> ${table.id}`,
    ),
    check(
      "navigation_menu_items_lexo_rank_not_empty_check",
      sql`btrim(${table.lexoRank}) <> ''`,
    ),
    check(
      "navigation_menu_items_target_type_check",
      sql`${table.targetType} ~ '^[A-Z][A-Z0-9_]*$'`,
    ),
    check(
      "navigation_menu_items_target_check",
      sql`(
        ${table.targetType} = 'URL'
        AND ${table.targetId} IS NULL
        AND ${table.url} IS NOT NULL
        AND btrim(${table.url}) <> ''
      ) OR (
        ${table.targetType} <> 'URL'
        AND ${table.targetId} IS NOT NULL
        AND ${table.url} IS NULL
      )`,
    ),
    check("navigation_menu_items_revision_check", sql`${table.revision} >= 0`),
    index("navigation_menu_items_tree_idx").on(
      table.menuId,
      table.parentId,
      table.lexoRank,
      table.id,
    ),
    index("navigation_menu_items_target_idx").on(
      table.storeId,
      table.targetType,
      table.targetId,
    ),
  ],
);

export const navigationMenuItemTranslations = onlineStoreSchema.table(
  "navigation_menu_item_translations",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => navigationMenuItems.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
    locale: localeCodeEnum("locale").notNull(),
    label: varchar("label", { length: 255 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.locale] }),
    check(
      "navigation_menu_item_translations_label_not_empty_check",
      sql`btrim(${table.label}) <> ''`,
    ),
    index("navigation_menu_item_translations_store_locale_idx").on(
      table.storeId,
      table.locale,
    ),
  ],
);

export type NavigationMenuModel = typeof navigationMenus.$inferSelect;
export type NewNavigationMenuModel = typeof navigationMenus.$inferInsert;
export type NavigationMenuItemModel = typeof navigationMenuItems.$inferSelect;
export type NewNavigationMenuItemModel =
  typeof navigationMenuItems.$inferInsert;
export type NavigationMenuItemTranslationModel =
  typeof navigationMenuItemTranslations.$inferSelect;
export type NewNavigationMenuItemTranslationModel =
  typeof navigationMenuItemTranslations.$inferInsert;
