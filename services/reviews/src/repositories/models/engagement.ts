import { sql } from "drizzle-orm";
import {
  index,
  integer,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { contentItem } from "./content.js";
import {
  contentVoteTypeEnum,
  reportReasonEnum,
  reportStatusEnum,
  reviewsSchema,
} from "./schema.js";

export const contentVote = reviewsSchema.table(
  "content_vote",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    voterCustomerId: uuid("voter_customer_id"),
    voterKey: varchar("voter_key", { length: 160 }).notNull(),
    type: contentVoteTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("content_vote_voter_unique").on(table.contentId, table.voterKey),
    index("content_vote_content_type_idx").on(
      table.contentId,
      table.type,
      table.id
    ),
    index("content_vote_store_customer_idx")
      .on(table.storeId, table.voterCustomerId, table.createdAt, table.id)
      .where(sql`${table.voterCustomerId} IS NOT NULL`),
  ]
);

export const contentReport = reviewsSchema.table(
  "content_report",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    reporterCustomerId: uuid("reporter_customer_id"),
    reporterKey: varchar("reporter_key", { length: 160 }).notNull(),
    reason: reportReasonEnum("reason").notNull(),
    details: varchar("details", { length: 2000 }),
    status: reportStatusEnum("status").notNull().default("OPEN"),
    assignedToPrincipalId: varchar("assigned_to_principal_id"),
    resolutionNote: varchar("resolution_note", { length: 2000 }),
    resolvedByPrincipalId: varchar("resolved_by_principal_id"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("content_report_active_reporter_unique")
      .on(table.contentId, table.reporterKey)
      .where(sql`${table.status} IN ('OPEN', 'UNDER_REVIEW')`),
    index("content_report_store_queue_idx").on(
      table.storeId,
      table.status,
      table.createdAt,
      table.id
    ),
    index("content_report_content_created_idx").on(
      table.contentId,
      table.createdAt,
      table.id
    ),
    index("content_report_reporter_customer_idx")
      .on(table.storeId, table.reporterCustomerId, table.createdAt, table.id)
      .where(sql`${table.reporterCustomerId} IS NOT NULL`),
  ]
);

export const contentMetrics = reviewsSchema.table(
  "content_metrics",
  {
    contentId: uuid("content_id")
      .primaryKey()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
    likeCount: integer("like_count").notNull().default(0),
    dislikeCount: integer("dislike_count").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    openReportCount: integer("open_report_count").notNull().default(0),
    mediaCount: integer("media_count").notNull().default(0),
    childCount: integer("child_count").notNull().default(0),
    officialChildCount: integer("official_child_count").notNull().default(0),
    acceptedChildCount: integer("accepted_child_count").notNull().default(0),
    lastChildAt: timestamp("last_child_at", { withTimezone: true, mode: "string" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("content_metrics_store_like_idx").on(
      table.storeId,
      table.likeCount,
      table.contentId
    ),
    index("content_metrics_store_dislike_idx").on(
      table.storeId,
      table.dislikeCount,
      table.contentId
    ),
    index("content_metrics_store_report_idx").on(
      table.storeId,
      table.reportCount,
      table.contentId
    ),
    index("content_metrics_store_child_idx").on(
      table.storeId,
      table.childCount,
      table.contentId
    ),
    index("content_metrics_store_media_idx").on(
      table.storeId,
      table.mediaCount,
      table.contentId
    ),
  ]
);

export type ContentVote = typeof contentVote.$inferSelect;
export type NewContentVote = typeof contentVote.$inferInsert;
export type ContentReport = typeof contentReport.$inferSelect;
export type NewContentReport = typeof contentReport.$inferInsert;
export type ContentMetrics = typeof contentMetrics.$inferSelect;
export type NewContentMetrics = typeof contentMetrics.$inferInsert;
