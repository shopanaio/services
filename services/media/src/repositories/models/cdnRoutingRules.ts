import {
  boolean,
  index,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { mediaSchema } from "./schema";
import { assetGroups } from "./assetGroups";
import { cdnConfigurations } from "./cdnConfigurations";

export interface CdnRoutingConditions {
  mediaTypes?: string[];
  mimeTypes?: string[];
  providers?: string[];
  extensions?: string[];
  minSizeBytes?: number;
  maxSizeBytes?: number;
  countries?: string[];
  [key: string]: unknown;
}

export type CdnTransformOverrides = Record<string, unknown>;

/**
 * Ordered rules that route a media request to a CDN configuration. Empty
 * conditions match every request. The first enabled matching rule wins;
 * otherwise the asset group's default CDN configuration is used.
 */
export const cdnRoutingRules = mediaSchema.table(
  "cdn_routing_rules",
  {
    id: uuid("id").primaryKey(),
    assetGroupId: uuid("asset_group_id")
      .notNull()
      .references(() => assetGroups.id, { onDelete: "cascade" }),
    cdnConfigurationId: uuid("cdn_configuration_id")
      .notNull()
      .references(() => cdnConfigurations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    priority: integer("priority").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    conditions: jsonb("conditions")
      .$type<CdnRoutingConditions>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    transformOverrides: jsonb("transform_overrides")
      .$type<CdnTransformOverrides>()
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
    uniqueIndex("idx_cdn_routing_rules_name").on(
      table.assetGroupId,
      table.name
    ),
    index("idx_cdn_routing_rules_priority")
      .on(table.assetGroupId, table.priority)
      .where(sql`enabled = true`),
    index("idx_cdn_routing_rules_configuration").on(
      table.cdnConfigurationId
    ),
  ]
);

export type CdnRoutingRule = typeof cdnRoutingRules.$inferSelect;
export type NewCdnRoutingRule = typeof cdnRoutingRules.$inferInsert;
