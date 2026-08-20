import { createQuery, createRelayQuery, type InferRelayInput } from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import type { TransactionManager } from "@shopana/shared-kernel";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import type { ContentConnectionMetaInput } from "../content/ContentRepository.js";
import { ContentRepository } from "../content/ContentRepository.js";
import {
  decodeCustomerGlobalId,
  decodeOrderGlobalId,
  decodeOrderLineGlobalId,
  decodeProductGlobalId,
  decodeRatingCriterionGlobalId,
  decodeReviewGlobalId,
  decodeVariantGlobalId,
} from "../global-id-where-mappers.js";
import {
  contentItem,
  review,
  reviewListView,
  reviewMedia,
  reviewRating,
  type ContentItem,
  type NewContentItem,
  type NewReview,
  type NewReviewMedia,
  type NewReviewRating,
  type Review,
  type ReviewMedia,
  type ReviewRating,
} from "../models/index.js";
import type { OptimisticMutationResult, RepositoryConnectionResult } from "../types.js";

export const reviewRelayQuery = createRelayQuery(
  createQuery(reviewListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeReviewGlobalId,
      productId: decodeProductGlobalId,
      variantId: decodeVariantGlobalId,
      orderId: decodeOrderGlobalId,
      orderLineId: decodeOrderLineGlobalId,
      authorCustomerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "review", tieBreaker: "id" },
);

export type ReviewRelayInput = InferRelayInput<typeof reviewRelayQuery>;
export type ReviewConnectionInput = ReviewRelayInput & {
  meta?: ContentConnectionMetaInput;
};

export interface ReviewAggregate {
  content: ContentItem;
  review: Review;
  ratings: ReviewRating[];
  media: ReviewMedia[];
}

export type ReviewPatch = Partial<
  Pick<
    NewReview,
    | "productId"
    | "variantId"
    | "orderId"
    | "orderLineId"
    | "rating"
    | "verificationStatus"
    | "verificationMethod"
    | "verifiedAt"
    | "isIncentivized"
    | "incentiveDisclosure"
  >
>;

export type ReviewMediaPatch = Partial<
  Pick<
    NewReviewMedia,
    "sortIndex" | "caption" | "status" | "moderationNote" | "moderatedByPrincipalId" | "moderatedAt"
  >
>;

export class ReviewRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly content: ContentRepository,
  ) {
    super(db, txManager);
  }

  @ReadOnly()
  async findById(id: string): Promise<ReviewAggregate | null> {
    const rows = await this.connection
      .select({ content: contentItem, review })
      .from(review)
      .innerJoin(
        contentItem,
        and(
          eq(contentItem.storeId, review.storeId),
          eq(contentItem.id, review.id),
          isNull(contentItem.deletedAt),
        ),
      )
      .where(and(eq(review.storeId, this.storeId), eq(review.id, id)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const [ratings, media] = await Promise.all([this.getRatings(id), this.getMedia(id)]);
    return { ...row, ratings, media };
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<Review[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select({ review })
      .from(review)
      .innerJoin(
        contentItem,
        and(eq(contentItem.storeId, review.storeId), eq(contentItem.id, review.id)),
      )
      .where(and(eq(review.storeId, this.storeId), inArray(review.id, [...new Set(ids)])))
      .then((rows) => rows.map((row) => row.review));
  }

  @ReadOnly()
  async getConnection(args: ReviewConnectionInput): Promise<RepositoryConnectionResult> {
    const { where, orderBy, meta, ...pagination } = args;
    const mergedWhere: ReviewRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(meta?.includeDeleted ? [] : [{ deletedAt: { _is: null } }]),
        ...(meta?.includeRedacted === false ? [{ redactedAt: { _is: null } }] : []),
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ReviewRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      reviewRelayQuery.execute(this.connection, executeInput),
      reviewRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({
        cursor,
        nodeId: node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  @Transactional()
  async create(input: {
    content: Omit<
      NewContentItem,
      | "id"
      | "storeId"
      | "kind"
      | "revision"
      | "createdAt"
      | "updatedAt"
      | "deletedAt"
      | "redactedAt"
    >;
    review: Omit<NewReview, "id" | "contentKind" | "storeId">;
    ratings?: readonly Omit<NewReviewRating, "storeId" | "reviewId" | "createdAt" | "updatedAt">[];
    media?: readonly Omit<
      NewReviewMedia,
      "id" | "storeId" | "reviewId" | "createdAt" | "updatedAt"
    >[];
  }): Promise<ReviewAggregate> {
    const id = await this.generateUuidV7();
    const content = await this.content.create({ ...input.content, kind: "REVIEW" }, id);
    const rows = await this.connection
      .insert(review)
      .values({ ...input.review, id, contentKind: "REVIEW", storeId: this.storeId })
      .returning();
    const createdReview = rows[0];
    if (!createdReview) throw new Error("Failed to create review");
    const [ratings, media] = await Promise.all([
      this.replaceRatings(id, input.ratings ?? []),
      this.replaceMedia(id, input.media ?? []),
    ]);
    return { content, review: createdReview, ratings, media };
  }

  @Transactional()
  async updateDetails(id: string, patch: ReviewPatch): Promise<Review | null> {
    const rows = await this.connection
      .update(review)
      .set(patch)
      .where(and(eq(review.storeId, this.storeId), eq(review.id, id)))
      .returning();
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getRatings(reviewId: string): Promise<ReviewRating[]> {
    return this.connection
      .select()
      .from(reviewRating)
      .where(and(eq(reviewRating.storeId, this.storeId), eq(reviewRating.reviewId, reviewId)))
      .orderBy(asc(reviewRating.criterionId));
  }

  @ReadOnly()
  async getRatingsByReviewIds(reviewIds: readonly string[]): Promise<ReviewRating[]> {
    if (reviewIds.length === 0) return [];
    return this.connection
      .select()
      .from(reviewRating)
      .where(
        and(
          eq(reviewRating.storeId, this.storeId),
          inArray(reviewRating.reviewId, [...new Set(reviewIds)]),
        ),
      )
      .orderBy(asc(reviewRating.reviewId), asc(reviewRating.criterionId));
  }

  @Transactional()
  async replaceRatings(
    reviewId: string,
    items: readonly Omit<NewReviewRating, "storeId" | "reviewId" | "createdAt" | "updatedAt">[],
  ): Promise<ReviewRating[]> {
    await this.connection
      .delete(reviewRating)
      .where(and(eq(reviewRating.storeId, this.storeId), eq(reviewRating.reviewId, reviewId)));
    if (items.length === 0) return [];
    const now = new Date().toISOString();
    return this.connection
      .insert(reviewRating)
      .values(
        items.map((item) => ({
          ...item,
          storeId: this.storeId,
          reviewId,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .returning();
  }

  @ReadOnly()
  async getMedia(reviewId: string): Promise<ReviewMedia[]> {
    return this.connection
      .select()
      .from(reviewMedia)
      .where(and(eq(reviewMedia.storeId, this.storeId), eq(reviewMedia.reviewId, reviewId)))
      .orderBy(asc(reviewMedia.sortIndex), asc(reviewMedia.id));
  }

  @ReadOnly()
  async getMediaByReviewIds(reviewIds: readonly string[]): Promise<ReviewMedia[]> {
    if (reviewIds.length === 0) return [];
    return this.connection
      .select()
      .from(reviewMedia)
      .where(
        and(
          eq(reviewMedia.storeId, this.storeId),
          inArray(reviewMedia.reviewId, [...new Set(reviewIds)]),
        ),
      )
      .orderBy(asc(reviewMedia.reviewId), asc(reviewMedia.sortIndex), asc(reviewMedia.id));
  }

  @ReadOnly()
  async getMediaByIds(ids: readonly string[]): Promise<ReviewMedia[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(reviewMedia)
      .where(
        and(eq(reviewMedia.storeId, this.storeId), inArray(reviewMedia.id, [...new Set(ids)])),
      );
  }

  @Transactional()
  async replaceMedia(
    reviewId: string,
    items: readonly Omit<
      NewReviewMedia,
      "id" | "storeId" | "reviewId" | "createdAt" | "updatedAt"
    >[],
  ): Promise<ReviewMedia[]> {
    await this.connection
      .delete(reviewMedia)
      .where(and(eq(reviewMedia.storeId, this.storeId), eq(reviewMedia.reviewId, reviewId)));
    if (items.length === 0) return [];
    const ids = await this.generateUuidV7s(items.length);
    const now = new Date().toISOString();
    return this.connection
      .insert(reviewMedia)
      .values(
        items.map((item, index) => ({
          ...item,
          id: ids[index]!,
          storeId: this.storeId,
          reviewId,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .returning();
  }

  @Transactional()
  async updateMedia(
    id: string,
    expectedUpdatedAt: string,
    patch: ReviewMediaPatch,
  ): Promise<OptimisticMutationResult<ReviewMedia>> {
    const rows = await this.connection
      .update(reviewMedia)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(reviewMedia.storeId, this.storeId),
          eq(reviewMedia.id, id),
          eq(reviewMedia.updatedAt, expectedUpdatedAt),
        ),
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    const current = await this.findMediaById(id);
    return current ? { status: "conflict", current } : { status: "not_found" };
  }

  @ReadOnly()
  async findMediaById(id: string): Promise<ReviewMedia | null> {
    const rows = await this.connection
      .select()
      .from(reviewMedia)
      .where(and(eq(reviewMedia.storeId, this.storeId), eq(reviewMedia.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }
}
