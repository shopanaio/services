import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  contentAuthorTypeEnum,
  contentKindEnum,
  contentStatusEnum,
  localeCodeEnum,
  publicationStatusEnum,
  reviewsSchema,
  translationSourceEnum,
} from "./schema.js";

export const contentItem = reviewsSchema.table(
  "content_item",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    kind: contentKindEnum("kind").notNull(),
    title: varchar("title", { length: 150 }),
    body: text("body").notNull(),
    locale: localeCodeEnum("locale").notNull(),
    authorType: contentAuthorTypeEnum("author_type").notNull(),
    authorCustomerId: uuid("author_customer_id"),
    authorPrincipalId: text("author_principal_id"),
    authorDisplayName: varchar("author_display_name", { length: 150 }).notNull(),
    authorEmail: varchar("author_email", { length: 320 }),
    sourceChannel: varchar("source_channel", { length: 64 }).notNull().default("STOREFRONT"),
    sourceMetadata: jsonb("source_metadata").$type<Record<string, unknown>>().notNull().default({}),
    idempotencyKey: text("idempotency_key"),
    status: contentStatusEnum("status").notNull().default("PENDING"),
    moderationNote: varchar("moderation_note", { length: 1000 }),
    moderatedByPrincipalId: text("moderated_by_principal_id"),
    moderatedAt: timestamp("moderated_at", { withTimezone: true, mode: "string" }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    unpublishedAt: timestamp("unpublished_at", { withTimezone: true, mode: "string" }),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    redactedAt: timestamp("redacted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    unique("content_item_id_kind_unique").on(table.id, table.kind),
    uniqueIndex("content_item_store_idempotency_unique")
      .on(table.storeId, table.sourceChannel, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("content_item_store_kind_status_created_idx")
      .on(table.storeId, table.kind, table.status, table.createdAt, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    index("content_item_store_kind_updated_idx")
      .on(table.storeId, table.kind, table.updatedAt, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    index("content_item_store_author_customer_idx")
      .on(table.storeId, table.authorCustomerId, table.kind, table.createdAt, table.id)
      .where(sql`${table.authorCustomerId} IS NOT NULL AND ${table.deletedAt} IS NULL`),
  ],
);

export const contentTranslation = reviewsSchema.table(
  "content_translation",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),
    title: varchar("title", { length: 150 }),
    body: text("body").notNull(),
    source: translationSourceEnum("source").notNull(),
    status: contentStatusEnum("status").notNull().default("PENDING"),
    revision: integer("revision").notNull().default(1),
    reviewedByPrincipalId: text("reviewed_by_principal_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("content_translation_content_locale_unique").on(table.contentId, table.locale),
    index("content_translation_store_locale_status_idx").on(
      table.storeId,
      table.locale,
      table.status,
      table.contentId,
    ),
  ],
);

export const contentPublication = reviewsSchema.table(
  "content_publication",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    channel: varchar("channel", { length: 64 }).notNull(),
    locale: localeCodeEnum("locale"),
    status: publicationStatusEnum("status").notNull().default("DRAFT"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "string" }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    unpublishedAt: timestamp("unpublished_at", { withTimezone: true, mode: "string" }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("content_publication_destination_unique").on(
      table.contentId,
      table.channel,
      sql`coalesce(${table.locale}::text, '')`,
    ),
    index("content_publication_schedule_idx")
      .on(table.scheduledAt, table.id)
      .where(sql`${table.status} = 'SCHEDULED'`),
    index("content_publication_store_channel_status_idx").on(
      table.storeId,
      table.channel,
      table.status,
      table.contentId,
    ),
  ],
);

export type ContentItem = typeof contentItem.$inferSelect;
export type NewContentItem = typeof contentItem.$inferInsert;
export type ContentTranslation = typeof contentTranslation.$inferSelect;
export type NewContentTranslation = typeof contentTranslation.$inferInsert;
export type ContentPublication = typeof contentPublication.$inferSelect;
export type NewContentPublication = typeof contentPublication.$inferInsert;
