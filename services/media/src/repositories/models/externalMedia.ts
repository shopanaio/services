import {
  uuid,
  varchar,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { mediaSchema } from "./schema";
import { files } from "./files";

export const externalMedia = mediaSchema.table(
  "external_media",
  {
    fileId: uuid("file_id")
      .primaryKey()
      .references(() => files.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    providerMeta: jsonb("provider_meta"),
  },
  (table) => [
    index("idx_external_media_external_id").on(table.projectId, table.externalId),
  ]
);

export type ExternalMedia = typeof externalMedia.$inferSelect;
export type NewExternalMedia = typeof externalMedia.$inferInsert;
