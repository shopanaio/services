import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  decodeCustomerGlobalId,
  decodeProductQuestionGlobalId,
  decodeProductQuestionSubscriptionGlobalId,
} from "../global-id-where-mappers.js";
import {
  questionSubscription,
  type NewQuestionSubscription,
  type QuestionSubscription,
} from "../models/index.js";
import type {
  OptimisticMutationResult,
  RepositoryConnectionResult,
} from "../types.js";

export const questionSubscriptionRelayQuery = createRelayQuery(
  createQuery(questionSubscription)
    .include(["id"])
    .mapWhereFields({
      id: decodeProductQuestionSubscriptionGlobalId,
      questionId: decodeProductQuestionGlobalId,
      subscriberCustomerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "productQuestionSubscription", tieBreaker: "id" }
);

export type QuestionSubscriptionRelayInput = InferRelayInput<
  typeof questionSubscriptionRelayQuery
>;
export type QuestionSubscriptionPatch = Partial<
  Pick<NewQuestionSubscription, "status" | "channel" | "locale">
>;

export class QuestionSubscriptionRepository extends BaseRepository {
  @ReadOnly()
  async findById(id: string): Promise<QuestionSubscription | null> {
    const rows = await this.connection
      .select()
      .from(questionSubscription)
      .where(
        and(
          eq(questionSubscription.storeId, this.storeId),
          eq(questionSubscription.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<QuestionSubscription[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(questionSubscription)
      .where(
        and(
          eq(questionSubscription.storeId, this.storeId),
          inArray(questionSubscription.id, [...new Set(ids)])
        )
      );
  }

  @ReadOnly()
  async getConnection(
    questionId: string,
    args: QuestionSubscriptionRelayInput
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: QuestionSubscriptionRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { questionId: { _eq: questionId } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: QuestionSubscriptionRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      questionSubscriptionRelayQuery.execute(this.connection, executeInput),
      questionSubscriptionRelayQuery.count(this.connection, {
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
    input: Omit<NewQuestionSubscription, "id" | "storeId" | "createdAt" | "updatedAt">
  ): Promise<QuestionSubscription> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(questionSubscription)
      .values({
        ...input,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create question subscription");
    return created;
  }

  @Transactional()
  async update(
    id: string,
    expectedUpdatedAt: string,
    patch: QuestionSubscriptionPatch
  ): Promise<OptimisticMutationResult<QuestionSubscription>> {
    const rows = await this.connection
      .update(questionSubscription)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(questionSubscription.storeId, this.storeId),
          eq(questionSubscription.id, id),
          eq(questionSubscription.updatedAt, expectedUpdatedAt)
        )
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    const current = await this.findById(id);
    return current
      ? { status: "conflict", current }
      : { status: "not_found" };
  }
}
