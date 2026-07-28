import type { AppManifest } from "@shopana/app-sdk";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { appsSchema } from "./schema.js";

/**
 * Store-scoped catalog of bundled Apps.
 *
 * Runtime definitions are synchronized before the list query is executed so
 * PostgreSQL can provide deterministic filtering, sorting, and pagination for
 * both installed and not-yet-installed Apps.
 */
export const appCatalog = appsSchema.table(
  "app_catalog",
  {
    storeId: uuid("store_id").notNull(),
    appCode: varchar("app_code", { length: 128 }).notNull(),
    version: varchar("version", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    capabilities: text("capabilities").notNull(),
    manifest: jsonb("manifest").$type<AppManifest>().notNull(),
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
    primaryKey({
      name: "app_catalog_pkey",
      columns: [table.storeId, table.appCode],
    }),
    index("app_catalog_store_display_name_idx").on(
      table.storeId,
      table.displayName,
      table.appCode,
    ),
  ],
);

export const appListView = appsSchema
  .view("app_list_view", {
    storeId: uuid("store_id").notNull(),
    code: varchar("code", { length: 128 }).notNull(),
    version: varchar("version", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    capabilities: text("capabilities").notNull(),
    status: text("status").notNull(),
    installed: boolean("installed").notNull(),
    installationId: uuid("installation_id"),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  })
  .as(sql`
    SELECT
      catalog.store_id,
      catalog.app_code AS code,
      catalog.version,
      catalog.display_name,
      catalog.capabilities,
      COALESCE(installation.status::text, 'UNINSTALLED') AS status,
      (installation.id IS NOT NULL) AS installed,
      installation.id AS installation_id,
      GREATEST(
        catalog.updated_at,
        COALESCE(installation.updated_at, catalog.updated_at)
      ) AS updated_at
    FROM apps.app_catalog catalog
    LEFT JOIN LATERAL (
      SELECT
        candidate.id,
        candidate.status,
        candidate.updated_at
      FROM apps.app_installations candidate
      WHERE candidate.store_id = catalog.store_id
        AND candidate.app_code = catalog.app_code
        AND candidate.status <> 'UNINSTALLED'
      ORDER BY candidate.created_at DESC, candidate.id DESC
      LIMIT 1
    ) installation ON true
  `);

export type AppCatalogModel = typeof appCatalog.$inferSelect;
export type AppListViewModel = typeof appListView.$inferSelect;
