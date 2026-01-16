import {
  uuid,
  varchar,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { mediaSchema } from "./schema";
import { files } from "./files";
import { assetGroups } from "./assetGroups";

export const externalMedia = mediaSchema.table(
  "external_media",
  {
    fileId: uuid("file_id")
      .primaryKey()
      .references(() => files.id, { onDelete: "cascade" }),
    assetGroupId: uuid("asset_group_id")
      .notNull()
      .references(() => assetGroups.id, { onDelete: "cascade" }),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    providerMeta: jsonb("provider_meta"),
  },
  (table) => [
    index("idx_external_media_external_id").on(table.assetGroupId, table.externalId),
    index("idx_external_media_asset_group").on(table.assetGroupId),
  ]
);

export type ExternalMedia = typeof externalMedia.$inferSelect;
export type NewExternalMedia = typeof externalMedia.$inferInsert;
