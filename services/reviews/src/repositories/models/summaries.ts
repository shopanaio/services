import { sql } from "drizzle-orm";
import { bigint, index, integer, numeric, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { ratingCriterion } from "./configuration.js";
import { reviewsSchema } from "./schema.js";

export const productReviewSummary = reviewsSchema.table(
  "product_review_summary",
  {
    productId: uuid("product_id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    reviewCount: integer("review_count").notNull().default(0),
    verifiedReviewCount: integer("verified_review_count").notNull().default(0),
    mediaReviewCount: integer("media_review_count").notNull().default(0),
    ratingSum: bigint("rating_sum", { mode: "bigint" }).notNull().default(0n),
    rating1Count: integer("rating_1_count").notNull().default(0),
    rating2Count: integer("rating_2_count").notNull().default(0),
    rating3Count: integer("rating_3_count").notNull().default(0),
    rating4Count: integer("rating_4_count").notNull().default(0),
    rating5Count: integer("rating_5_count").notNull().default(0),
    averageRating: numeric("average_rating", {
      precision: 4,
      scale: 3,
      mode: "number",
    }).generatedAlwaysAs(
      sql`CASE WHEN review_count = 0 THEN 0::numeric ELSE round(rating_sum::numeric / review_count::numeric, 3) END`,
    ),
    lastReviewedAt: timestamp("last_reviewed_at", {
      withTimezone: true,
      mode: "string",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("product_review_summary_store_rating_idx").on(
      table.storeId,
      table.averageRating,
      table.reviewCount,
      table.productId,
    ),
    index("product_review_summary_store_recent_idx").on(
      table.storeId,
      table.lastReviewedAt,
      table.productId,
    ),
  ],
);

export const productRatingCriterionSummary = reviewsSchema.table(
  "product_rating_criterion_summary",
  {
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    criterionId: uuid("criterion_id")
      .notNull()
      .references(() => ratingCriterion.id, { onDelete: "cascade" }),
    reviewCount: integer("review_count").notNull().default(0),
    ratingSum: bigint("rating_sum", { mode: "bigint" }).notNull().default(0n),
    rating1Count: integer("rating_1_count").notNull().default(0),
    rating2Count: integer("rating_2_count").notNull().default(0),
    rating3Count: integer("rating_3_count").notNull().default(0),
    rating4Count: integer("rating_4_count").notNull().default(0),
    rating5Count: integer("rating_5_count").notNull().default(0),
    averageRating: numeric("average_rating", {
      precision: 4,
      scale: 3,
      mode: "number",
    }).generatedAlwaysAs(
      sql`CASE WHEN review_count = 0 THEN 0::numeric ELSE round(rating_sum::numeric / review_count::numeric, 3) END`,
    ),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.criterionId] }),
    index("product_rating_criterion_summary_store_idx").on(
      table.storeId,
      table.criterionId,
      table.averageRating,
      table.productId,
    ),
  ],
);

export const productQuestionSummary = reviewsSchema.table(
  "product_question_summary",
  {
    productId: uuid("product_id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    questionCount: integer("question_count").notNull().default(0),
    answeredQuestionCount: integer("answered_question_count").notNull().default(0),
    unansweredQuestionCount: integer("unanswered_question_count").generatedAlwaysAs(
      sql`question_count - answered_question_count`,
    ),
    answerCount: integer("answer_count").notNull().default(0),
    officialAnswerCount: integer("official_answer_count").notNull().default(0),
    lastQuestionAt: timestamp("last_question_at", {
      withTimezone: true,
      mode: "string",
    }),
    lastAnsweredAt: timestamp("last_answered_at", {
      withTimezone: true,
      mode: "string",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("product_question_summary_store_unanswered_idx").on(
      table.storeId,
      table.unansweredQuestionCount,
      table.lastQuestionAt,
      table.productId,
    ),
    index("product_question_summary_store_recent_idx").on(
      table.storeId,
      table.lastQuestionAt,
      table.productId,
    ),
  ],
);

export type ProductReviewSummary = typeof productReviewSummary.$inferSelect;
export type ProductRatingCriterionSummary = typeof productRatingCriterionSummary.$inferSelect;
export type ProductQuestionSummary = typeof productQuestionSummary.$inferSelect;
