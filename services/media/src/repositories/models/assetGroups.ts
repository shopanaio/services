import { uuid, varchar, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { mediaSchema } from "./schema";
import { files } from "./files";

/**
 * Asset owner types - defines which entity owns the asset group
 */
export const ASSET_OWNER_TYPES = ["organization", "store", "user_profile"] as const;
export type AssetOwnerType = (typeof ASSET_OWNER_TYPES)[number];

/**
 * Asset groups table - a "media library" for any owner entity.
 * Each organization, store, or user profile can have one asset group
 * that contains all their media files.
 */
export const assetGroups = mediaSchema.table(
  "asset_groups",
  {
    id: uuid("id").primaryKey(),
    ownerType: varchar("owner_type", { length: 50 }).notNull(),
    ownerId: varchar("owner_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One asset group per owner
    uniqueIndex("idx_asset_groups_owner").on(table.ownerType, table.ownerId),
    // Index for lookups by owner type
    index("idx_asset_groups_owner_type").on(table.ownerType),
  ]
);

export type AssetGroup = typeof assetGroups.$inferSelect;
export type NewAssetGroup = typeof assetGroups.$inferInsert;
