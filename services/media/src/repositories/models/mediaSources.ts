import {
  integer,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { mediaSchema } from "./schema";
import { files } from "./files";

/**
 * Prepared delivery sources for media that cannot be produced by an image
 * cropper/resizer, such as transcoded video and alternate 3D model formats.
 * Source metadata (URL, MIME type, dimensions and size) lives on sourceFileId.
 */
export const mediaSources = mediaSchema.table(
  "media_sources",
  {
    mediaFileId: uuid("media_file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    sourceFileId: uuid("source_file_id")
      .notNull()
      .references(() => files.id, { onDelete: "restrict" }),
    kind: varchar("kind", { length: 32 }).notNull(),
    format: varchar("format", { length: 64 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.mediaFileId, table.sourceFileId] }),
    uniqueIndex("idx_media_sources_order").on(
      table.mediaFileId,
      table.kind,
      table.sortOrder
    ),
  ]
);

export type MediaSource = typeof mediaSources.$inferSelect;
export type NewMediaSource = typeof mediaSources.$inferInsert;
