import { createQuery, createRelayQuery, type InferRelayInput } from "@shopana/drizzle-query";
import { ReadOnly, Transactional, type TransactionManager } from "@shopana/shared-kernel";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import type { ContentConnectionMetaInput } from "../content/ContentRepository.js";
import { ContentRepository } from "../content/ContentRepository.js";
import {
  decodeCustomerGlobalId,
  decodeProductQuestionAnswerGlobalId,
  decodeProductQuestionGlobalId,
} from "../global-id-where-mappers.js";
import {
  contentItem,
  productQuestionAnswerListView,
  questionAnswer,
  type ContentItem,
  type NewContentItem,
  type NewQuestionAnswer,
  type QuestionAnswer,
} from "../models/index.js";
import type { RepositoryConnectionResult } from "../types.js";

export const productQuestionAnswerRelayQuery = createRelayQuery(
  createQuery(productQuestionAnswerListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeProductQuestionAnswerGlobalId,
      questionId: decodeProductQuestionGlobalId,
      authorCustomerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "productQuestionAnswer", tieBreaker: "id" },
);

export type ProductQuestionAnswerRelayInput = InferRelayInput<
  typeof productQuestionAnswerRelayQuery
>;
export type ProductQuestionAnswerConnectionInput = ProductQuestionAnswerRelayInput & {
  meta?: ContentConnectionMetaInput;
};

export interface ProductQuestionAnswerAggregate {
  content: ContentItem;
  answer: QuestionAnswer;
}

export type ProductQuestionAnswerPatch = Partial<
  Pick<NewQuestionAnswer, "isOfficial" | "isAccepted" | "sortIndex">
>;

export class ProductQuestionAnswerRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly content: ContentRepository,
  ) {
    super(db, txManager);
  }

  @ReadOnly()
  async findById(id: string): Promise<ProductQuestionAnswerAggregate | null> {
    const rows = await this.connection
      .select({ content: contentItem, answer: questionAnswer })
      .from(questionAnswer)
      .innerJoin(
        contentItem,
        and(
          eq(contentItem.storeId, questionAnswer.storeId),
          eq(contentItem.id, questionAnswer.id),
          isNull(contentItem.deletedAt),
        ),
      )
      .where(and(eq(questionAnswer.storeId, this.storeId), eq(questionAnswer.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<QuestionAnswer[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select({ answer: questionAnswer })
      .from(questionAnswer)
      .innerJoin(
        contentItem,
        and(eq(contentItem.storeId, questionAnswer.storeId), eq(contentItem.id, questionAnswer.id)),
      )
      .where(
        and(
          eq(questionAnswer.storeId, this.storeId),
          inArray(questionAnswer.id, [...new Set(ids)]),
        ),
      )
      .then((rows) => rows.map((row) => row.answer));
  }

  @ReadOnly()
  async getConnection(
    args: ProductQuestionAnswerConnectionInput,
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, meta, ...pagination } = args;
    const mergedWhere: ProductQuestionAnswerRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(meta?.includeDeleted ? [] : [{ deletedAt: { _is: null } }]),
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ProductQuestionAnswerRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      productQuestionAnswerRelayQuery.execute(this.connection, executeInput),
      productQuestionAnswerRelayQuery.count(this.connection, {
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
    answer: Omit<NewQuestionAnswer, "id" | "contentKind" | "storeId">;
  }): Promise<ProductQuestionAnswerAggregate> {
    const id = await this.generateUuidV7();
    const content = await this.content.create({ ...input.content, kind: "QUESTION_ANSWER" }, id);
    const rows = await this.connection
      .insert(questionAnswer)
      .values({
        ...input.answer,
        id,
        contentKind: "QUESTION_ANSWER",
        storeId: this.storeId,
      })
      .returning();
    const answer = rows[0];
    if (!answer) throw new Error("Failed to create product question answer");
    return { content, answer };
  }

  @Transactional()
  async updateProperties(
    id: string,
    patch: ProductQuestionAnswerPatch,
  ): Promise<QuestionAnswer | null> {
    const rows = await this.connection
      .update(questionAnswer)
      .set(patch)
      .where(and(eq(questionAnswer.storeId, this.storeId), eq(questionAnswer.id, id)))
      .returning();
    return rows[0] ?? null;
  }
}
