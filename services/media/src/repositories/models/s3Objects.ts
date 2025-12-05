import {
  uuid,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { mediaSchema } from "./schema";
import { files } from "./files";
import { buckets } from "./buckets";

export const s3Objects = mediaSchema.table(
  "s3_objects",
  {
    fileId: uuid("file_id")
      .primaryKey()
      .references(() => files.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    bucketId: uuid("bucket_id")
      .notNull()
      .references(() => buckets.id, { onDelete: "restrict" }),
    objectKey: varchar("object_key", { length: 1024 }).notNull(),
    contentHash: varchar("content_hash", { length: 64 }),
    etag: varchar("etag", { length: 64 }),
    storageClass: varchar("storage_class", { length: 32 })
      .notNull()
      .default("STANDARD"),
  },
  (table) => [
    uniqueIndex("idx_s3_objects_key").on(table.bucketId, table.objectKey),
    uniqueIndex("idx_s3_objects_hash")
      .on(table.projectId, table.contentHash)
      .where(sql`content_hash IS NOT NULL`),
    index("idx_s3_objects_bucket").on(table.bucketId),
  ]
);

export type S3Object = typeof s3Objects.$inferSelect;
export type NewS3Object = typeof s3Objects.$inferInsert;
