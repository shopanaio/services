import { sql } from "drizzle-orm";
import { boolean, integer, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import {
  contentAuthorTypeEnum,
  contentKindEnum,
  contentStatusEnum,
  localeCodeEnum,
  reviewsSchema,
  reviewVerificationStatusEnum,
} from "./schema.js";

const contentListColumns = {
  storeId: uuid("store_id").notNull(),
  id: uuid("id").notNull(),
  kind: contentKindEnum("kind").notNull(),
  title: varchar("title", { length: 150 }),
  body: text("body").notNull(),
  locale: localeCodeEnum("locale").notNull(),
  authorType: contentAuthorTypeEnum("author_type").notNull(),
  authorCustomerId: uuid("author_customer_id"),
  authorDisplayName: varchar("author_display_name", { length: 150 }).notNull(),
  sourceChannel: varchar("source_channel", { length: 64 }).notNull(),
  status: contentStatusEnum("status").notNull(),
  revision: integer("revision").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  redactedAt: timestamp("redacted_at", { withTimezone: true, mode: "string" }),
  likeCount: integer("like_count").notNull(),
  dislikeCount: integer("dislike_count").notNull(),
  reportCount: integer("report_count").notNull(),
  openReportCount: integer("open_report_count").notNull(),
  mediaCount: integer("media_count").notNull(),
  childCount: integer("child_count").notNull(),
  officialChildCount: integer("official_child_count").notNull(),
  acceptedChildCount: integer("accepted_child_count").notNull(),
};

export const contentListView = reviewsSchema.view("content_list_view", contentListColumns).as(sql`
    SELECT
      content.store_id,
      content.id,
      content.kind,
      content.title,
      content.body,
      content.locale,
      content.author_type,
      content.author_customer_id,
      content.author_display_name,
      content.source_channel,
      content.status,
      content.revision,
      content.created_at,
      content.updated_at,
      content.published_at,
      content.deleted_at,
      content.redacted_at,
      COALESCE(metrics.like_count, 0)::int AS like_count,
      COALESCE(metrics.dislike_count, 0)::int AS dislike_count,
      COALESCE(metrics.report_count, 0)::int AS report_count,
      COALESCE(metrics.open_report_count, 0)::int AS open_report_count,
      COALESCE(metrics.media_count, 0)::int AS media_count,
      COALESCE(metrics.child_count, 0)::int AS child_count,
      COALESCE(metrics.official_child_count, 0)::int AS official_child_count,
      COALESCE(metrics.accepted_child_count, 0)::int AS accepted_child_count
    FROM reviews.content_item content
    LEFT JOIN reviews.content_metrics metrics
      ON metrics.store_id = content.store_id
     AND metrics.content_id = content.id
  `);

export const reviewListView = reviewsSchema.view("review_list_view", {
  ...contentListColumns,
  productId: uuid("product_id").notNull(),
  variantId: uuid("variant_id"),
  orderId: uuid("order_id"),
  orderLineId: uuid("order_line_id"),
  rating: integer("rating").notNull(),
  verificationStatus: reviewVerificationStatusEnum("verification_status").notNull(),
  isIncentivized: boolean("is_incentivized").notNull(),
}).as(sql`
    SELECT content_list.*, review.product_id, review.variant_id, review.order_id,
      review.order_line_id, review.rating::int, review.verification_status,
      review.is_incentivized
    FROM reviews.content_list_view content_list
    INNER JOIN reviews.review review
      ON review.store_id = content_list.store_id
     AND review.id = content_list.id
  `);

const contentAggregateListColumns = {
  storeId: uuid("store_id").notNull(),
  id: uuid("id").notNull(),
  body: text("body").notNull(),
  locale: localeCodeEnum("locale").notNull(),
  authorType: contentAuthorTypeEnum("author_type").notNull(),
  authorCustomerId: uuid("author_customer_id"),
  status: contentStatusEnum("status").notNull(),
  revision: integer("revision").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  redactedAt: timestamp("redacted_at", { withTimezone: true, mode: "string" }),
  likeCount: integer("like_count").notNull(),
};

export const reviewReplyListView = reviewsSchema.view("review_reply_list_view", {
  ...contentAggregateListColumns,
  reviewId: uuid("review_id").notNull(),
  isOfficial: boolean("is_official").notNull(),
  sortIndex: integer("sort_index").notNull(),
}).as(sql`
    SELECT content.store_id, content.id, content.body, content.locale,
      content.author_type, content.author_customer_id, content.status,
      content.revision, content.created_at, content.updated_at, content.deleted_at,
      content.redacted_at,
      COALESCE(metrics.like_count, 0)::int AS like_count,
      reply.review_id, reply.is_official, reply.sort_index
    FROM reviews.content_item content
    INNER JOIN reviews.review_reply reply
      ON reply.store_id = content.store_id
     AND reply.id = content.id
    LEFT JOIN reviews.content_metrics metrics
      ON metrics.store_id = content.store_id
     AND metrics.content_id = content.id
  `);

export const productQuestionListView = reviewsSchema.view("product_question_list_view", {
  storeId: uuid("store_id").notNull(),
  id: uuid("id").notNull(),
  productId: uuid("product_id").notNull(),
  variantId: uuid("variant_id"),
  body: text("body").notNull(),
  locale: localeCodeEnum("locale").notNull(),
  authorType: contentAuthorTypeEnum("author_type").notNull(),
  authorCustomerId: uuid("author_customer_id"),
  authorDisplayName: varchar("author_display_name", { length: 150 }).notNull(),
  sourceChannel: varchar("source_channel", { length: 64 }).notNull(),
  status: contentStatusEnum("status").notNull(),
  answerState: varchar("answer_state", { length: 16 }).notNull(),
  revision: integer("revision").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  redactedAt: timestamp("redacted_at", { withTimezone: true, mode: "string" }),
  answerCount: integer("answer_count").notNull(),
  officialAnswerCount: integer("official_answer_count").notNull(),
  acceptedAnswerCount: integer("accepted_answer_count").notNull(),
  reportCount: integer("report_count").notNull(),
  likeCount: integer("like_count").notNull(),
}).as(sql`
    SELECT content.store_id, content.id, question.product_id, question.variant_id,
      content.body, content.locale, content.author_type,
      content.author_customer_id, content.author_display_name,
      content.source_channel, content.status,
      CASE WHEN COALESCE(metrics.child_count, 0) > 0 THEN 'ANSWERED'
           ELSE 'UNANSWERED' END AS answer_state,
      content.revision, content.created_at, content.updated_at,
      content.published_at, content.deleted_at, content.redacted_at,
      COALESCE(metrics.child_count, 0)::int AS answer_count,
      COALESCE(metrics.official_child_count, 0)::int AS official_answer_count,
      COALESCE(metrics.accepted_child_count, 0)::int AS accepted_answer_count,
      COALESCE(metrics.report_count, 0)::int AS report_count,
      COALESCE(metrics.like_count, 0)::int AS like_count
    FROM reviews.content_item content
    INNER JOIN reviews.product_question question
      ON question.store_id = content.store_id
     AND question.id = content.id
    LEFT JOIN reviews.content_metrics metrics
      ON metrics.store_id = content.store_id
     AND metrics.content_id = content.id
  `);

export const productQuestionAnswerListView = reviewsSchema.view(
  "product_question_answer_list_view",
  {
    ...contentAggregateListColumns,
    questionId: uuid("question_id").notNull(),
    isOfficial: boolean("is_official").notNull(),
    isAccepted: boolean("is_accepted").notNull(),
    sortIndex: integer("sort_index").notNull(),
  },
).as(sql`
    SELECT content.store_id, content.id, content.body, content.locale,
      content.author_type, content.author_customer_id, content.status,
      content.revision, content.created_at, content.updated_at, content.deleted_at,
      content.redacted_at,
      COALESCE(metrics.like_count, 0)::int AS like_count,
      answer.question_id, answer.is_official, answer.is_accepted, answer.sort_index
    FROM reviews.content_item content
    INNER JOIN reviews.question_answer answer
      ON answer.store_id = content.store_id
     AND answer.id = content.id
    LEFT JOIN reviews.content_metrics metrics
      ON metrics.store_id = content.store_id
     AND metrics.content_id = content.id
  `);

export type ContentListView = typeof contentListView.$inferSelect;
export type ReviewListView = typeof reviewListView.$inferSelect;
export type ReviewReplyListView = typeof reviewReplyListView.$inferSelect;
export type ProductQuestionListView = typeof productQuestionListView.$inferSelect;
export type ProductQuestionAnswerListView = typeof productQuestionAnswerListView.$inferSelect;
