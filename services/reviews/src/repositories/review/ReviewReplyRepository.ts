import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly, Transactional, type TransactionManager } from "@shopana/shared-kernel";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import type { ContentConnectionMetaInput } from "../content/ContentRepository.js";
import { ContentRepository } from "../content/ContentRepository.js";
import {
  decodeCustomerGlobalId,
  decodeReviewGlobalId,
  decodeReviewReplyGlobalId,
} from "../global-id-where-mappers.js";
import {
  contentItem,
  reviewReply,
  reviewReplyListView,
  type ContentItem,
  type NewContentItem,
  type NewReviewReply,
  type ReviewReply,
} from "../models/index.js";
import type { RepositoryConnectionResult } from "../types.js";

export const reviewReplyRelayQuery = createRelayQuery(
  createQuery(reviewReplyListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeReviewReplyGlobalId,
      reviewId: decodeReviewGlobalId,
      authorCustomerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "reviewReply", tieBreaker: "id" }
);

export type ReviewReplyRelayInput = InferRelayInput<
  typeof reviewReplyRelayQuery
>;
export type ReviewReplyConnectionInput = ReviewReplyRelayInput & {
  meta?: ContentConnectionMetaInput;
};

export interface ReviewReplyAggregate {
  content: ContentItem;
  reply: ReviewReply;
}

export type ReviewReplyPatch = Partial<
  Pick<NewReviewReply, "isOfficial" | "sortIndex">
>;

export class ReviewReplyRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly content: ContentRepository
  ) {
    super(db, txManager);
  }

  @ReadOnly()
  async findById(id: string): Promise<ReviewReplyAggregate | null> {
    const rows = await this.connection
      .select({ content: contentItem, reply: reviewReply })
      .from(reviewReply)
      .innerJoin(
        contentItem,
        and(
          eq(contentItem.storeId, reviewReply.storeId),
          eq(contentItem.id, reviewReply.id),
          isNull(contentItem.deletedAt)
        )
      )
      .where(
        and(
          eq(reviewReply.storeId, this.storeId),
          eq(reviewReply.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<ReviewReply[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select({ reply: reviewReply })
      .from(reviewReply)
      .innerJoin(
        contentItem,
        and(
          eq(contentItem.storeId, reviewReply.storeId),
          eq(contentItem.id, reviewReply.id)
        )
      )
      .where(
        and(
          eq(reviewReply.storeId, this.storeId),
          inArray(reviewReply.id, [...new Set(ids)])
        )
      )
      .then((rows) => rows.map((row) => row.reply));
  }

  @ReadOnly()
  async getConnection(
    args: ReviewReplyConnectionInput
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, meta, ...pagination } = args;
    const mergedWhere: ReviewReplyRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(meta?.includeDeleted ? [] : [{ deletedAt: { _is: null } }]),
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ReviewReplyRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      reviewReplyRelayQuery.execute(this.connection, executeInput),
      reviewReplyRelayQuery.count(this.connection, { where: mergedWhere }),
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
      "id" | "storeId" | "kind" | "revision" | "createdAt" | "updatedAt" | "deletedAt" | "redactedAt"
    >;
    reply: Omit<NewReviewReply, "id" | "contentKind" | "storeId">;
  }): Promise<ReviewReplyAggregate> {
    const id = await this.generateUuidV7();
    const content = await this.content.create(
      { ...input.content, kind: "REVIEW_REPLY" },
      id
    );
    const rows = await this.connection
      .insert(reviewReply)
      .values({
        ...input.reply,
        id,
        contentKind: "REVIEW_REPLY",
        storeId: this.storeId,
      })
      .returning();
    const reply = rows[0];
    if (!reply) throw new Error("Failed to create review reply");
    return { content, reply };
  }

  @Transactional()
  async updateProperties(
    id: string,
    patch: ReviewReplyPatch
  ): Promise<ReviewReply | null> {
    const rows = await this.connection
      .update(reviewReply)
      .set(patch)
      .where(
        and(
          eq(reviewReply.storeId, this.storeId),
          eq(reviewReply.id, id)
        )
      )
      .returning();
    return rows[0] ?? null;
  }
}
