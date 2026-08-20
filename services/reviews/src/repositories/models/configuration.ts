import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  localeCodeEnum,
  moderationModeEnum,
  ratingCriterionTargetTypeEnum,
  reviewsSchema,
  reviewDuplicatePolicyEnum,
} from "./schema.js";

export const storeConfiguration = reviewsSchema.table(
  "store_configuration",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    reviewsEnabled: boolean("reviews_enabled").notNull().default(true),
    questionsEnabled: boolean("questions_enabled").notNull().default(true),
    guestReviewsEnabled: boolean("guest_reviews_enabled").notNull().default(false),
    guestQuestionsEnabled: boolean("guest_questions_enabled").notNull().default(true),
    customerAnswersEnabled: boolean("customer_answers_enabled").notNull().default(true),
    verifiedPurchaseRequired: boolean("verified_purchase_required").notNull().default(false),
    reviewModerationMode: moderationModeEnum("review_moderation_mode")
      .notNull()
      .default("PREMODERATION"),
    questionModerationMode: moderationModeEnum("question_moderation_mode")
      .notNull()
      .default("PREMODERATION"),
    answerModerationMode: moderationModeEnum("answer_moderation_mode")
      .notNull()
      .default("PREMODERATION"),
    reviewDuplicatePolicy: reviewDuplicatePolicyEnum("review_duplicate_policy")
      .notNull()
      .default("ONE_PER_ORDER_LINE"),
    reviewRequestsEnabled: boolean("review_requests_enabled").notNull().default(true),
    reviewRequestDelayDays: smallint("review_request_delay_days").notNull().default(14),
    reviewRequestExpiryDays: smallint("review_request_expiry_days").notNull().default(90),
    reviewEditWindowHours: integer("review_edit_window_hours").notNull().default(720),
    questionEditWindowHours: integer("question_edit_window_hours").notNull().default(720),
    answerEditWindowHours: integer("answer_edit_window_hours").notNull().default(720),
    maxReviewMediaCount: smallint("max_review_media_count").notNull().default(8),
    maxAnswersPerQuestion: smallint("max_answers_per_question").notNull().default(50),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("store_configuration_store_unique").on(table.storeId),
    index("store_configuration_updated_idx").on(table.updatedAt, table.id),
  ],
);

export const ratingCriterion = reviewsSchema.table(
  "rating_criterion",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    code: varchar("code", { length: 64 }).notNull(),
    defaultTitle: varchar("default_title", { length: 150 }).notNull(),
    defaultDescription: text("default_description"),
    weight: numeric("weight", { precision: 7, scale: 4, mode: "number" }).notNull().default(1),
    isRequired: boolean("is_required").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    appliesToAllProducts: boolean("applies_to_all_products").notNull().default(true),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("rating_criterion_store_code_unique")
      .on(table.storeId, sql`lower(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
    index("rating_criterion_store_active_sort_idx")
      .on(table.storeId, table.isActive, table.sortIndex, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const ratingCriterionTranslation = reviewsSchema.table(
  "rating_criterion_translation",
  {
    storeId: uuid("store_id").notNull(),
    criterionId: uuid("criterion_id")
      .notNull()
      .references(() => ratingCriterion.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),
    title: varchar("title", { length: 150 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.criterionId, table.locale] }),
    index("rating_criterion_translation_store_locale_idx").on(
      table.storeId,
      table.locale,
      table.criterionId,
    ),
  ],
);

export const ratingCriterionAssignment = reviewsSchema.table(
  "rating_criterion_assignment",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    criterionId: uuid("criterion_id")
      .notNull()
      .references(() => ratingCriterion.id, { onDelete: "cascade" }),
    targetType: ratingCriterionTargetTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    isRequiredOverride: boolean("is_required_override"),
    sortIndexOverride: integer("sort_index_override"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("rating_criterion_assignment_unique").on(
      table.criterionId,
      table.targetType,
      table.targetId,
    ),
    index("rating_criterion_assignment_target_idx").on(
      table.storeId,
      table.targetType,
      table.targetId,
      table.criterionId,
    ),
  ],
);

export type StoreConfiguration = typeof storeConfiguration.$inferSelect;
export type NewStoreConfiguration = typeof storeConfiguration.$inferInsert;
export type RatingCriterion = typeof ratingCriterion.$inferSelect;
export type NewRatingCriterion = typeof ratingCriterion.$inferInsert;
export type RatingCriterionTranslation = typeof ratingCriterionTranslation.$inferSelect;
export type NewRatingCriterionTranslation = typeof ratingCriterionTranslation.$inferInsert;
export type RatingCriterionAssignment = typeof ratingCriterionAssignment.$inferSelect;
export type NewRatingCriterionAssignment = typeof ratingCriterionAssignment.$inferInsert;
