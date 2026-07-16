import { sql } from "drizzle-orm";
import {
  boolean,
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
  contentKindEnum,
  notificationChannelEnum,
  reviewsSchema,
  subscriptionStatusEnum,
} from "./schema.js";

export const productQuestion = reviewsSchema.table(
  "product_question",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    contentKind: contentKindEnum("content_kind")
      .notNull()
      .default("PRODUCT_QUESTION"),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id"),
  },
  (table) => [
    index("product_question_store_product_idx").on(
      table.storeId,
      table.productId,
      table.id
    ),
    index("product_question_store_variant_idx")
      .on(table.storeId, table.variantId, table.id)
      .where(sql`${table.variantId} IS NOT NULL`),
  ]
);

export const questionAnswer = reviewsSchema.table(
  "question_answer",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    contentKind: contentKindEnum("content_kind")
      .notNull()
      .default("QUESTION_ANSWER"),
    storeId: uuid("store_id").notNull(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => productQuestion.id, { onDelete: "cascade" }),
    isOfficial: boolean("is_official").notNull().default(false),
    isAccepted: boolean("is_accepted").notNull().default(false),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    uniqueIndex("question_answer_one_accepted_unique")
      .on(table.questionId)
      .where(sql`${table.isAccepted}`),
    index("question_answer_store_question_sort_idx").on(
      table.storeId,
      table.questionId,
      table.sortIndex,
      table.id
    ),
    index("question_answer_store_official_idx").on(
      table.storeId,
      table.isOfficial,
      table.id
    ),
  ]
);

export const questionSubscription = reviewsSchema.table(
  "question_subscription",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => productQuestion.id, { onDelete: "cascade" }),
    subscriberCustomerId: uuid("subscriber_customer_id"),
    subscriberKey: varchar("subscriber_key", { length: 160 }).notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    status: subscriptionStatusEnum("status").notNull().default("ACTIVE"),
    locale: varchar("locale", { length: 35 }).notNull(),
    lastNotifiedAt: timestamp("last_notified_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("question_subscription_unique").on(
      table.questionId,
      table.subscriberKey,
      table.channel
    ),
    index("question_subscription_store_customer_idx")
      .on(
        table.storeId,
        table.subscriberCustomerId,
        table.status,
        table.id
      )
      .where(sql`${table.subscriberCustomerId} IS NOT NULL`),
    index("question_subscription_active_question_idx")
      .on(table.questionId, table.channel, table.id)
      .where(sql`${table.status} = 'ACTIVE'`),
  ]
);

export type ProductQuestion = typeof productQuestion.$inferSelect;
export type NewProductQuestion = typeof productQuestion.$inferInsert;
export type QuestionAnswer = typeof questionAnswer.$inferSelect;
export type NewQuestionAnswer = typeof questionAnswer.$inferInsert;
export type QuestionSubscription = typeof questionSubscription.$inferSelect;
export type NewQuestionSubscription = typeof questionSubscription.$inferInsert;
