import {
  bigint,
  boolean,
  integer,
  jsonb,
  numeric,
  primaryKey,
  smallint,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { listingSchema } from "./schema.js";

export type RecommendationPlacement =
  | "PRODUCT_RELATED"
  | "FREQUENTLY_BOUGHT_TOGETHER";
export type RecommendationStrategy =
  | "CURATED_ONLY"
  | "CURATED_FIRST"
  | "BLENDED"
  | "AUTOMATED_ONLY";
export type ManualRecommendationAction = "PIN" | "BOOST" | "EXCLUDE";
export type RecommendationReferenceStatus = "VALID" | "STALE";
export type RecommendationRunStatus =
  | "BUILDING"
  | "READY"
  | "ACTIVE"
  | "SUPERSEDED"
  | "FAILED";
export type RecommendationMaterializationPhase =
  | "ACCUMULATE"
  | "PRODUCTS"
  | "PAIRS"
  | "COMPLETE";
export type ProductRecommendationSource =
  | "MANUAL"
  | "FREQUENTLY_BOUGHT_TOGETHER"
  | "CONTENT_SIMILARITY"
  | "POPULARITY"
  | "FALLBACK";

const time = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "string" });

export const recommendationPlacementPolicy = listingSchema.table(
  "recommendation_placement_policy",
  {
    policyId: uuid("policy_id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    placement: varchar("placement", { length: 48 })
      .$type<RecommendationPlacement>()
      .notNull(),
    enabled: boolean("enabled").notNull().default(true),
    strategy: varchar("strategy", { length: 32 })
      .$type<RecommendationStrategy>()
      .notNull(),
    minimumResults: smallint("minimum_results").notNull(),
    maximumResults: smallint("maximum_results").notNull(),
    fallbackChain: jsonb("fallback_chain").$type<string[]>().notNull(),
    version: integer("version").notNull(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (table) => [
    unique("recommendation_placement_policy_store_placement_unique").on(
      table.storeId,
      table.placement,
    ),
  ],
);

export const manualProductRecommendation = listingSchema.table(
  "manual_product_recommendation",
  {
    recommendationId: uuid("recommendation_id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    anchorProductId: uuid("anchor_product_id").notNull(),
    targetProductId: uuid("target_product_id").notNull(),
    placement: varchar("placement", { length: 48 })
      .$type<RecommendationPlacement>()
      .notNull(),
    action: varchar("action", { length: 16 })
      .$type<ManualRecommendationAction>()
      .notNull(),
    position: smallint("position"),
    boost: numeric("boost", { precision: 12, scale: 6, mode: "string" }),
    enabled: boolean("enabled").notNull(),
    startsAt: time("starts_at"),
    endsAt: time("ends_at"),
    anchorReferenceStatus: varchar("anchor_reference_status", { length: 16 })
      .$type<RecommendationReferenceStatus>()
      .notNull(),
    targetReferenceStatus: varchar("target_reference_status", { length: 16 })
      .$type<RecommendationReferenceStatus>()
      .notNull(),
    version: integer("version").notNull(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
);

export const recommendationIngestionCursor = listingSchema.table(
  "recommendation_ingestion_cursor",
  {
    cursorId: uuid("cursor_id").primaryKey(),
    storeId: uuid("store_id").notNull().unique(),
    lastPosition: bigint("last_position", { mode: "bigint" }).notNull(),
    updatedAt: time("updated_at").notNull(),
  },
);

export const recommendationOrderFact = listingSchema.table(
  "recommendation_order_fact",
  {
    orderFactId: uuid("order_fact_id").primaryKey(),
    eventId: uuid("event_id").notNull().unique(),
    ingestionPosition: bigint("ingestion_position", { mode: "bigint" }).notNull(),
    storeId: uuid("store_id").notNull(),
    orderId: uuid("order_id").notNull(),
    state: varchar("state", { length: 16 })
      .$type<"COMMITTED" | "REVERSED">()
      .notNull(),
    orderRevision: integer("order_revision").notNull(),
    committedAt: time("committed_at").notNull(),
    occurredAt: time("occurred_at").notNull(),
    payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
    ingestedAt: time("ingested_at").notNull(),
  },
  (table) => [
    unique("recommendation_order_fact_ingestion_position_unique").on(
      table.storeId,
      table.ingestionPosition,
    ),
    unique("recommendation_order_fact_order_revision_unique").on(
      table.orderId,
      table.orderRevision,
    ),
  ],
);

export const recommendationOrderProductFact = listingSchema.table(
  "recommendation_order_product_fact",
  {
    orderProductFactId: uuid("order_product_fact_id").primaryKey(),
    orderFactId: uuid("order_fact_id").notNull(),
    productId: uuid("product_id").notNull(),
    quantity: integer("quantity").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (table) => [
    unique("recommendation_order_product_fact_order_product_unique").on(
      table.orderFactId,
      table.productId,
    ),
  ],
);

export const recommendationCalculationRun = listingSchema.table(
  "recommendation_calculation_run",
  {
    runId: uuid("run_id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    calculationType: varchar("calculation_type", { length: 32 })
      .$type<"FREQUENTLY_BOUGHT_TOGETHER">()
      .notNull(),
    status: varchar("status", { length: 16 })
      .$type<RecommendationRunStatus>()
      .notNull(),
    algorithmVersion: varchar("algorithm_version", { length: 64 }).notNull(),
    windowStartedAt: time("window_started_at").notNull(),
    windowEndedAt: time("window_ended_at").notNull(),
    sourceIngestionWatermark: bigint("source_ingestion_watermark", {
      mode: "bigint",
    }).notNull(),
    sourceEventTimeWatermark: time("source_event_time_watermark"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    productCount: integer("product_count").notNull(),
    pairCount: bigint("pair_count", { mode: "bigint" }).notNull(),
    materializationPhase: varchar("materialization_phase", { length: 16 })
      .$type<RecommendationMaterializationPhase>()
      .notNull(),
    orderProgressAfter: uuid("order_progress_after"),
    orderCount: bigint("order_count", { mode: "bigint" }).notNull(),
    productProgressAfter: uuid("product_progress_after"),
    pairProgressAnchorAfter: uuid("pair_progress_anchor_after"),
    pairProgressTargetAfter: uuid("pair_progress_target_after"),
    startedAt: time("started_at").notNull(),
    completedAt: time("completed_at"),
    activatedAt: time("activated_at"),
    statisticsPurgedAt: time("statistics_purged_at"),
    failureCode: varchar("failure_code", { length: 64 }),
    createdAt: time("created_at").notNull(),
  },
  (table) => [
    unique("recommendation_calculation_run_idempotency_unique").on(
      table.storeId,
      table.calculationType,
      table.idempotencyKey,
    ),
  ],
);

export const recommendationProductStat = listingSchema.table(
  "recommendation_product_stat",
  {
    productStatId: uuid("product_stat_id").primaryKey(),
    runId: uuid("run_id").notNull(),
    productId: uuid("product_id").notNull(),
    ordersCount: bigint("orders_count", { mode: "bigint" }).notNull(),
    quantity: bigint("quantity", { mode: "bigint" }).notNull(),
    lastPurchasedAt: time("last_purchased_at").notNull(),
  },
  (table) => [
    unique("recommendation_product_stat_run_product_unique").on(
      table.runId,
      table.productId,
    ),
  ],
);

export const recommendationProductPairStat = listingSchema.table(
  "recommendation_product_pair_stat",
  {
    pairStatId: uuid("pair_stat_id").primaryKey(),
    runId: uuid("run_id").notNull(),
    anchorProductId: uuid("anchor_product_id").notNull(),
    targetProductId: uuid("target_product_id").notNull(),
    ordersTogether: bigint("orders_together", { mode: "bigint" }).notNull(),
    anchorOrders: bigint("anchor_orders", { mode: "bigint" }).notNull(),
    targetOrders: bigint("target_orders", { mode: "bigint" }).notNull(),
    storeOrders: bigint("store_orders", { mode: "bigint" }).notNull(),
    support: numeric("support", { precision: 20, scale: 10, mode: "string" }).notNull(),
    confidence: numeric("confidence", { precision: 20, scale: 10, mode: "string" }).notNull(),
    lift: numeric("lift", { precision: 20, scale: 10, mode: "string" }).notNull(),
    recencyScore: numeric("recency_score", { precision: 20, scale: 10, mode: "string" }).notNull(),
    sourceScore: numeric("source_score", { precision: 20, scale: 10, mode: "string" }).notNull(),
  },
  (table) => [
    unique("recommendation_product_pair_stat_run_pair_unique").on(
      table.runId,
      table.anchorProductId,
      table.targetProductId,
    ),
  ],
);

export const recommendationSnapshot = listingSchema.table(
  "recommendation_snapshot",
  {
    snapshotId: uuid("snapshot_id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    anchorProductId: uuid("anchor_product_id").notNull(),
    placement: varchar("placement", { length: 48 })
      .$type<RecommendationPlacement>()
      .notNull(),
    status: varchar("status", { length: 16 })
      .$type<RecommendationRunStatus>()
      .notNull(),
    strategy: varchar("strategy", { length: 32 })
      .$type<RecommendationStrategy>()
      .notNull(),
    policyId: uuid("policy_id").notNull(),
    policyVersion: integer("policy_version").notNull(),
    calculationRunId: uuid("calculation_run_id"),
    rankerType: varchar("ranker_type", { length: 16 })
      .$type<"RULES" | "ML">()
      .notNull(),
    modelVersion: varchar("model_version", { length: 64 }).notNull(),
    buildKey: varchar("build_key", { length: 255 }).notNull(),
    sourceWatermarks: jsonb("source_watermarks")
      .$type<Record<string, unknown>>()
      .notNull(),
    itemCount: smallint("item_count").notNull(),
    contentHash: varchar("content_hash", { length: 64 }),
    generatedAt: time("generated_at").notNull(),
    activatedAt: time("activated_at"),
    expiresAt: time("expires_at"),
    failureCode: varchar("failure_code", { length: 64 }),
  },
  (table) => [
    unique("recommendation_snapshot_build_key_unique").on(
      table.storeId,
      table.anchorProductId,
      table.placement,
      table.buildKey,
    ),
  ],
);

export interface RecommendationItemFeaturesV1 {
  version: 1;
  manualBoost: string | null;
  fbtNormalized: string;
  popularity: string;
}

export interface RecommendationSourceBreakdownV1 {
  version: 1;
  manual?: { action: "PIN" | "BOOST"; position: number | null; boost: string | null };
  fbt?: { runId: string; sourceScore: string };
  categoryPopularity?: { score: string };
  storePopularity?: { score: string };
}

export const recommendationSnapshotItem = listingSchema.table(
  "recommendation_snapshot_item",
  {
    snapshotItemId: uuid("snapshot_item_id").primaryKey(),
    snapshotId: uuid("snapshot_id").notNull(),
    targetProductId: uuid("target_product_id").notNull(),
    rank: smallint("rank").notNull(),
    score: numeric("score", { precision: 20, scale: 10, mode: "string" }).notNull(),
    primarySource: varchar("primary_source", { length: 32 })
      .$type<ProductRecommendationSource>()
      .notNull(),
    pinned: boolean("pinned").notNull(),
    features: jsonb("features").$type<RecommendationItemFeaturesV1>().notNull(),
    sourceBreakdown: jsonb("source_breakdown")
      .$type<RecommendationSourceBreakdownV1>()
      .notNull(),
    createdAt: time("created_at").notNull(),
  },
  (table) => [
    unique("recommendation_snapshot_item_rank_unique").on(
      table.snapshotId,
      table.rank,
    ),
    unique("recommendation_snapshot_item_product_unique").on(
      table.snapshotId,
      table.targetProductId,
    ),
  ],
);

export const recommendationProductAccumulator = listingSchema.table(
  "recommendation_product_accumulator",
  {
    runId: uuid("run_id").notNull(),
    productId: uuid("product_id").notNull(),
    ordersCount: bigint("orders_count", { mode: "bigint" }).notNull(),
    quantity: bigint("quantity", { mode: "bigint" }).notNull(),
    lastPurchasedAt: time("last_purchased_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.runId, table.productId] })],
);

export const recommendationPairAccumulator = listingSchema.table(
  "recommendation_pair_accumulator",
  {
    runId: uuid("run_id").notNull(),
    anchorProductId: uuid("anchor_product_id").notNull(),
    targetProductId: uuid("target_product_id").notNull(),
    ordersTogether: bigint("orders_together", { mode: "bigint" }).notNull(),
    lastPurchasedTogetherAt: time("last_purchased_together_at").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.runId, table.anchorProductId, table.targetProductId],
    }),
  ],
);

export const recommendationMaintenanceCursor = listingSchema.table(
  "recommendation_maintenance_cursor",
  {
    cursorId: uuid("cursor_id").primaryKey(),
    storeId: uuid("store_id").notNull().unique(),
    status: varchar("status", { length: 16 })
      .$type<"BOOTSTRAPPING" | "ACTIVE">()
      .notNull(),
    bootstrapCutoffAt: time("bootstrap_cutoff_at").notNull(),
    lastManualBoundaryAt: time("last_manual_boundary_at"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
);

export const recommendationBuildRequest = listingSchema.table(
  "recommendation_build_request",
  {
    requestId: uuid("request_id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    anchorProductId: uuid("anchor_product_id").notNull(),
    placement: varchar("placement", { length: 48 })
      .$type<RecommendationPlacement>()
      .notNull(),
    generation: bigint("generation", { mode: "bigint" }).notNull(),
    triggerKey: varchar("trigger_key", { length: 255 }).notNull(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (table) => [
    unique("recommendation_build_request_store_anchor_placement_unique").on(
      table.storeId,
      table.anchorProductId,
      table.placement,
    ),
  ],
);

export type RecommendationPlacementPolicy = typeof recommendationPlacementPolicy.$inferSelect;
export type NewRecommendationPlacementPolicy = typeof recommendationPlacementPolicy.$inferInsert;
export type ManualProductRecommendation = typeof manualProductRecommendation.$inferSelect;
export type NewManualProductRecommendation = typeof manualProductRecommendation.$inferInsert;
export type RecommendationIngestionCursor = typeof recommendationIngestionCursor.$inferSelect;
export type NewRecommendationIngestionCursor = typeof recommendationIngestionCursor.$inferInsert;
export type RecommendationOrderFact = typeof recommendationOrderFact.$inferSelect;
export type NewRecommendationOrderFact = typeof recommendationOrderFact.$inferInsert;
export type RecommendationOrderProductFact = typeof recommendationOrderProductFact.$inferSelect;
export type NewRecommendationOrderProductFact = typeof recommendationOrderProductFact.$inferInsert;
export type RecommendationCalculationRun = typeof recommendationCalculationRun.$inferSelect;
export type NewRecommendationCalculationRun = typeof recommendationCalculationRun.$inferInsert;
export type RecommendationProductStat = typeof recommendationProductStat.$inferSelect;
export type NewRecommendationProductStat = typeof recommendationProductStat.$inferInsert;
export type RecommendationProductPairStat = typeof recommendationProductPairStat.$inferSelect;
export type NewRecommendationProductPairStat = typeof recommendationProductPairStat.$inferInsert;
export type RecommendationSnapshot = typeof recommendationSnapshot.$inferSelect;
export type NewRecommendationSnapshot = typeof recommendationSnapshot.$inferInsert;
export type RecommendationSnapshotItem = typeof recommendationSnapshotItem.$inferSelect;
export type NewRecommendationSnapshotItem = typeof recommendationSnapshotItem.$inferInsert;
export type RecommendationProductAccumulator = typeof recommendationProductAccumulator.$inferSelect;
export type NewRecommendationProductAccumulator = typeof recommendationProductAccumulator.$inferInsert;
export type RecommendationPairAccumulator = typeof recommendationPairAccumulator.$inferSelect;
export type NewRecommendationPairAccumulator = typeof recommendationPairAccumulator.$inferInsert;
export type RecommendationMaintenanceCursor = typeof recommendationMaintenanceCursor.$inferSelect;
export type NewRecommendationMaintenanceCursor = typeof recommendationMaintenanceCursor.$inferInsert;
export type RecommendationBuildRequest = typeof recommendationBuildRequest.$inferSelect;
export type NewRecommendationBuildRequest = typeof recommendationBuildRequest.$inferInsert;
