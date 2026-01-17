import {
  uuid,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { mediaSchema } from "./schema";
import { files } from "./files";
import { buckets } from "./buckets";
import { assetGroups } from "./assetGroups";

export const s3Objects = mediaSchema.table(
  "s3_objects",
  {
    fileId: uuid("file_id")
      .primaryKey()
      .references(() => files.id, { onDelete: "cascade" }),
    assetGroupId: uuid("asset_group_id")
      .notNull()
      .references(() => assetGroups.id, { onDelete: "cascade" }),
    bucketId: uuid("bucket_id")
      .notNull()
      .references(() => buckets.id, { onDelete: "restrict" }),
    objectKey: varchar("object_key", { length: 1024 }).notNull(),
    etag: varchar("etag", { length: 64 }),
    storageClass: varchar("storage_class", { length: 32 })
      .notNull()
      .default("STANDARD"),
  },
  (table) => [
    uniqueIndex("idx_s3_objects_key").on(table.bucketId, table.objectKey),
    index("idx_s3_objects_bucket").on(table.bucketId),
    index("idx_s3_objects_asset_group").on(table.assetGroupId),
  ]
);

export type S3Object = typeof s3Objects.$inferSelect;
export type NewS3Object = typeof s3Objects.$inferInsert;
