import {
  boolean,
  index,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { mediaSchema } from "./schema";
import { assetGroups } from "./assetGroups";

export type CdnProviderConfig = Record<string, unknown>;
export type CdnTransformConfig = Record<string, unknown>;

/**
 * CDN delivery profiles. Provider values intentionally remain extensible
 * strings so a custom or future CDN does not require a database migration.
 * secretRef points to an external secret store; credentials are never stored
 * in providerConfig.
 */
export const cdnConfigurations = mediaSchema.table(
  "cdn_configurations",
  {
    id: uuid("id").primaryKey(),
    assetGroupId: uuid("asset_group_id")
      .notNull()
      .references(() => assetGroups.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    baseUrl: text("base_url").notNull(),
    pathPrefix: text("path_prefix").notNull().default(""),
    enabled: boolean("enabled").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    signingMode: varchar("signing_mode", { length: 32 }).notNull().default("NONE"),
    secretRef: text("secret_ref"),
    transformStrategy: varchar("transform_strategy", { length: 64 }).notNull().default("NONE"),
    urlTemplate: text("url_template"),
    providerConfig: jsonb("provider_config")
      .$type<CdnProviderConfig>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    transformConfig: jsonb("transform_config")
      .$type<CdnTransformConfig>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_cdn_configurations_name").on(table.assetGroupId, table.name),
    uniqueIndex("idx_cdn_configurations_default")
      .on(table.assetGroupId)
      .where(sql`enabled = true AND is_default = true`),
    index("idx_cdn_configurations_provider").on(table.assetGroupId, table.provider),
  ],
);

export type CdnConfiguration = typeof cdnConfigurations.$inferSelect;
export type NewCdnConfiguration = typeof cdnConfigurations.$inferInsert;
