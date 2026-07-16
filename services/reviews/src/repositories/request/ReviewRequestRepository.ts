import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  decodeCustomerGlobalId,
  decodeOrderGlobalId,
  decodeOrderLineGlobalId,
  decodeProductGlobalId,
  decodeReviewGlobalId,
  decodeReviewRequestEventGlobalId,
  decodeReviewRequestGlobalId,
  decodeVariantGlobalId,
} from "../global-id-where-mappers.js";
import {
  reviewRequest,
  reviewRequestEvent,
  type NewReviewRequest,
  type NewReviewRequestEvent,
  type ReviewRequest,
  type ReviewRequestEvent,
} from "../models/index.js";
import type {
  OptimisticMutationResult,
  RepositoryConnectionResult,
} from "../types.js";

export const reviewRequestRelayQuery = createRelayQuery(
  createQuery(reviewRequest)
    .include(["id"])
    .mapWhereFields({
      id: decodeReviewRequestGlobalId,
      customerId: decodeCustomerGlobalId,
      orderId: decodeOrderGlobalId,
      orderLineId: decodeOrderLineGlobalId,
      productId: decodeProductGlobalId,
      variantId: decodeVariantGlobalId,
      reviewId: decodeReviewGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "reviewRequest", tieBreaker: "id" }
);

export const reviewRequestEventRelayQuery = createRelayQuery(
  createQuery(reviewRequestEvent)
    .include(["id"])
    .mapWhereFields({
      id: decodeReviewRequestEventGlobalId,
      reviewRequestId: decodeReviewRequestGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "reviewRequestEvent", tieBreaker: "id" }
);

export type ReviewRequestRelayInput = InferRelayInput<
  typeof reviewRequestRelayQuery
>;
export type ReviewRequestEventRelayInput = InferRelayInput<
  typeof reviewRequestEventRelayQuery
>;
export type ReviewRequestPatch = Partial<
  Pick<
    NewReviewRequest,
    | "channel"
    | "status"
    | "locale"
    | "reviewId"
    | "providerMessageId"
    | "attemptCount"
    | "scheduledAt"
    | "sentAt"
    | "deliveredAt"
    | "openedAt"
    | "submittedAt"
    | "expiresAt"
    | "lastError"
  >
>;

export class ReviewRequestRepository extends BaseRepository {
  @ReadOnly()
  async findById(id: string): Promise<ReviewRequest | null> {
    const rows = await this.connection
      .select()
      .from(reviewRequest)
      .where(
        and(
          eq(reviewRequest.storeId, this.storeId),
          eq(reviewRequest.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findEventById(id: string): Promise<ReviewRequestEvent | null> {
    const rows = await this.connection
      .select()
      .from(reviewRequestEvent)
      .where(
        and(
          eq(reviewRequestEvent.storeId, this.storeId),
          eq(reviewRequestEvent.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getConnection(
    args: ReviewRequestRelayInput
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: ReviewRequestRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ReviewRequestRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "scheduledAt", direction: "asc" },
        { field: "id", direction: "asc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      reviewRequestRelayQuery.execute(this.connection, executeInput),
      reviewRequestRelayQuery.count(this.connection, { where: mergedWhere }),
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

  @ReadOnly()
  async getEventConnection(
    reviewRequestId: string,
    args: ReviewRequestEventRelayInput
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: ReviewRequestEventRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { reviewRequestId: { _eq: reviewRequestId } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ReviewRequestEventRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "occurredAt", direction: "asc" },
        { field: "id", direction: "asc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      reviewRequestEventRelayQuery.execute(this.connection, executeInput),
      reviewRequestEventRelayQuery.count(this.connection, {
        where: mergedWhere,
      }),
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
  async create(
    input: Omit<NewReviewRequest, "id" | "storeId" | "createdAt" | "updatedAt">
  ): Promise<ReviewRequest> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(reviewRequest)
      .values({
        ...input,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create review request");
    return created;
  }

  @Transactional()
  async update(
    id: string,
    expectedUpdatedAt: string,
    patch: ReviewRequestPatch
  ): Promise<OptimisticMutationResult<ReviewRequest>> {
    const rows = await this.connection
      .update(reviewRequest)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(reviewRequest.storeId, this.storeId),
          eq(reviewRequest.id, id),
          eq(reviewRequest.updatedAt, expectedUpdatedAt)
        )
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    const current = await this.findById(id);
    return current
      ? { status: "conflict", current }
      : { status: "not_found" };
  }

  @Transactional()
  async appendEvent(
    input: Omit<NewReviewRequestEvent, "id" | "storeId" | "createdAt">
  ): Promise<ReviewRequestEvent> {
    const rows = await this.connection
      .insert(reviewRequestEvent)
      .values({
        ...input,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        createdAt: new Date().toISOString(),
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to append review request event");
    return created;
  }
}
