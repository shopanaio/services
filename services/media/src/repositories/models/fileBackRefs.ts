import {
  uuid,
  varchar,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { mediaSchema } from "./schema";
import { files } from "./files";

export const fileBackRefs = mediaSchema.table(
  "file_back_refs",
  {
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    service: varchar("service", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 255 }).notNull(),
    role: varchar("role", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.fileId,
        table.service,
        table.entityType,
        table.entityId,
        table.role,
      ],
    }),
    index("idx_fbr_entity").on(
      table.service,
      table.entityType,
      table.entityId
    ),
    index("idx_fbr_file_usage").on(
      table.fileId,
      table.entityType,
      table.entityId
    ),
  ]
);

export type FileBackRef = typeof fileBackRefs.$inferSelect;
export type NewFileBackRef = typeof fileBackRefs.$inferInsert;

export function formatEntityRef(
  service: string,
  entityType: string,
  entityId: string
): string {
  return `${service}:${entityType}:${entityId}`;
}
