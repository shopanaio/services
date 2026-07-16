import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { contentItem } from "./content.js";
import { ratingCriterion } from "./configuration.js";
import {
  bytea,
  contentKindEnum,
  contentStatusEnum,
  notificationChannelEnum,
  reviewsSchema,
  reviewRequestEventTypeEnum,
  reviewRequestStatusEnum,
  reviewVerificationStatusEnum,
} from "./schema.js";

export const review = reviewsSchema.table(
  "review",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    contentKind: contentKindEnum("content_kind").notNull().default("REVIEW"),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id"),
    orderId: uuid("order_id"),
    orderLineId: uuid("order_line_id"),
    rating: smallint("rating").notNull(),
    verificationStatus: reviewVerificationStatusEnum("verification_status")
      .notNull()
      .default("UNVERIFIED"),
    verificationMethod: varchar("verification_method", { length: 64 }),
    verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "string" }),
    isIncentivized: boolean("is_incentivized").notNull().default(false),
    incentiveDisclosure: varchar("incentive_disclosure", { length: 500 }),
  },
  (table) => [
    index("review_store_product_idx").on(table.storeId, table.productId, table.id),
    index("review_store_product_rating_idx").on(
      table.storeId,
      table.productId,
      table.rating,
      table.id
    ),
    index("review_store_rating_idx").on(table.storeId, table.rating, table.id),
    index("review_store_verification_idx").on(
      table.storeId,
      table.verificationStatus,
      table.id
    ),
    index("review_store_order_line_idx")
      .on(table.storeId, table.orderLineId, table.id)
      .where(sql`${table.orderLineId} IS NOT NULL`),
    index("review_store_variant_idx")
      .on(table.storeId, table.variantId, table.id)
      .where(sql`${table.variantId} IS NOT NULL`),
  ]
);

export const reviewRating = reviewsSchema.table(
  "review_rating",
  {
    storeId: uuid("store_id").notNull(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    criterionId: uuid("criterion_id")
      .notNull()
      .references(() => ratingCriterion.id, { onDelete: "restrict" }),
    value: smallint("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.reviewId, table.criterionId] }),
    index("review_rating_store_criterion_value_idx").on(
      table.storeId,
      table.criterionId,
      table.value,
      table.reviewId
    ),
  ]
);

export const reviewMedia = reviewsSchema.table(
  "review_media",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    fileId: uuid("file_id").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
    caption: varchar("caption", { length: 500 }),
    status: contentStatusEnum("status").notNull().default("PENDING"),
    moderationNote: varchar("moderation_note", { length: 1000 }),
    moderatedByPrincipalId: text("moderated_by_principal_id"),
    moderatedAt: timestamp("moderated_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("review_media_review_file_unique").on(table.reviewId, table.fileId),
    index("review_media_store_review_sort_idx").on(
      table.storeId,
      table.reviewId,
      table.sortIndex,
      table.id
    ),
    index("review_media_store_file_idx").on(
      table.storeId,
      table.fileId,
      table.reviewId
    ),
    index("review_media_pending_idx")
      .on(table.storeId, table.createdAt, table.id)
      .where(sql`${table.status} = 'PENDING'`),
  ]
);

export const reviewReply = reviewsSchema.table(
  "review_reply",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    contentKind: contentKindEnum("content_kind")
      .notNull()
      .default("REVIEW_REPLY"),
    storeId: uuid("store_id").notNull(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    isOfficial: boolean("is_official").notNull().default(true),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("review_reply_store_review_sort_idx").on(
      table.storeId,
      table.reviewId,
      table.sortIndex,
      table.id
    ),
  ]
);

export const reviewRequest = reviewsSchema.table(
  "review_request",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    orderId: uuid("order_id").notNull(),
    orderLineId: uuid("order_line_id").notNull(),
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id"),
    reviewId: uuid("review_id").references(() => review.id, {
      onDelete: "restrict",
    }),
    channel: notificationChannelEnum("channel").notNull(),
    status: reviewRequestStatusEnum("status").notNull().default("SCHEDULED"),
    locale: varchar("locale", { length: 35 }).notNull(),
    sourceChannel: varchar("source_channel", { length: 64 })
      .notNull()
      .default("STOREFRONT"),
    idempotencyKey: text("idempotency_key").notNull(),
    accessTokenHash: bytea("access_token_hash"),
    providerMessageId: text("provider_message_id"),
    attemptCount: integer("attempt_count").notNull().default(0),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "string" }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "string" }),
    openedAt: timestamp("opened_at", { withTimezone: true, mode: "string" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "string" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("review_request_store_idempotency_unique").on(
      table.storeId,
      table.idempotencyKey
    ),
    uniqueIndex("review_request_access_token_unique")
      .on(table.storeId, table.accessTokenHash)
      .where(sql`${table.accessTokenHash} IS NOT NULL`),
    index("review_request_due_idx")
      .on(table.scheduledAt, table.id)
      .where(sql`${table.status} = 'SCHEDULED'`),
    index("review_request_store_status_idx").on(
      table.storeId,
      table.status,
      table.scheduledAt,
      table.id
    ),
    index("review_request_store_customer_idx").on(
      table.storeId,
      table.customerId,
      table.createdAt,
      table.id
    ),
    index("review_request_store_order_line_idx").on(
      table.storeId,
      table.orderLineId,
      table.createdAt,
      table.id
    ),
    index("review_request_store_product_idx").on(
      table.storeId,
      table.productId,
      table.createdAt,
      table.id
    ),
  ]
);

export const reviewRequestEvent = reviewsSchema.table(
  "review_request_event",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    reviewRequestId: uuid("review_request_id")
      .notNull()
      .references(() => reviewRequest.id, { onDelete: "cascade" }),
    type: reviewRequestEventTypeEnum("type").notNull(),
    providerEventId: text("provider_event_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("review_request_event_provider_unique")
      .on(table.storeId, table.providerEventId)
      .where(sql`${table.providerEventId} IS NOT NULL`),
    index("review_request_event_request_time_idx").on(
      table.reviewRequestId,
      table.occurredAt,
      table.id
    ),
  ]
);

export type Review = typeof review.$inferSelect;
export type NewReview = typeof review.$inferInsert;
export type ReviewRating = typeof reviewRating.$inferSelect;
export type NewReviewRating = typeof reviewRating.$inferInsert;
export type ReviewMedia = typeof reviewMedia.$inferSelect;
export type NewReviewMedia = typeof reviewMedia.$inferInsert;
export type ReviewReply = typeof reviewReply.$inferSelect;
export type NewReviewReply = typeof reviewReply.$inferInsert;
export type ReviewRequest = typeof reviewRequest.$inferSelect;
export type NewReviewRequest = typeof reviewRequest.$inferInsert;
export type ReviewRequestEvent = typeof reviewRequestEvent.$inferSelect;
export type NewReviewRequestEvent = typeof reviewRequestEvent.$inferInsert;
