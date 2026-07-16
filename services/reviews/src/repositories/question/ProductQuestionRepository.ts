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
  decodeProductGlobalId,
  decodeProductQuestionGlobalId,
  decodeVariantGlobalId,
} from "../global-id-where-mappers.js";
import {
  contentItem,
  productQuestion,
  productQuestionListView,
  type ContentItem,
  type NewContentItem,
  type NewProductQuestion,
  type ProductQuestion,
} from "../models/index.js";
import type { RepositoryConnectionResult } from "../types.js";

export const productQuestionRelayQuery = createRelayQuery(
  createQuery(productQuestionListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeProductQuestionGlobalId,
      productId: decodeProductGlobalId,
      variantId: decodeVariantGlobalId,
      authorCustomerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "productQuestion", tieBreaker: "id" }
);

export type ProductQuestionRelayInput = InferRelayInput<
  typeof productQuestionRelayQuery
>;
export type ProductQuestionConnectionInput = ProductQuestionRelayInput & {
  meta?: ContentConnectionMetaInput;
};

export interface ProductQuestionAggregate {
  content: ContentItem;
  question: ProductQuestion;
}

export type ProductQuestionPatch = Partial<
  Pick<NewProductQuestion, "productId" | "variantId">
>;

export class ProductQuestionRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly content: ContentRepository
  ) {
    super(db, txManager);
  }

  @ReadOnly()
  async findById(id: string): Promise<ProductQuestionAggregate | null> {
    const rows = await this.connection
      .select({ content: contentItem, question: productQuestion })
      .from(productQuestion)
      .innerJoin(
        contentItem,
        and(
          eq(contentItem.storeId, productQuestion.storeId),
          eq(contentItem.id, productQuestion.id),
          isNull(contentItem.deletedAt)
        )
      )
      .where(
        and(
          eq(productQuestion.storeId, this.storeId),
          eq(productQuestion.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<ProductQuestion[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select({ question: productQuestion })
      .from(productQuestion)
      .innerJoin(
        contentItem,
        and(
          eq(contentItem.storeId, productQuestion.storeId),
          eq(contentItem.id, productQuestion.id)
        )
      )
      .where(
        and(
          eq(productQuestion.storeId, this.storeId),
          inArray(productQuestion.id, [...new Set(ids)])
        )
      )
      .then((rows) => rows.map((row) => row.question));
  }

  @ReadOnly()
  async getConnection(
    args: ProductQuestionConnectionInput
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, meta, ...pagination } = args;
    const mergedWhere: ProductQuestionRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(meta?.includeDeleted ? [] : [{ deletedAt: { _is: null } }]),
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ProductQuestionRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      productQuestionRelayQuery.execute(this.connection, executeInput),
      productQuestionRelayQuery.count(this.connection, { where: mergedWhere }),
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
    question: Omit<NewProductQuestion, "id" | "contentKind" | "storeId">;
  }): Promise<ProductQuestionAggregate> {
    const id = await this.generateUuidV7();
    const content = await this.content.create(
      { ...input.content, kind: "PRODUCT_QUESTION" },
      id
    );
    const rows = await this.connection
      .insert(productQuestion)
      .values({
        ...input.question,
        id,
        contentKind: "PRODUCT_QUESTION",
        storeId: this.storeId,
      })
      .returning();
    const question = rows[0];
    if (!question) throw new Error("Failed to create product question");
    return { content, question };
  }

  @Transactional()
  async updateSubject(
    id: string,
    patch: ProductQuestionPatch
  ): Promise<ProductQuestion | null> {
    const rows = await this.connection
      .update(productQuestion)
      .set(patch)
      .where(
        and(
          eq(productQuestion.storeId, this.storeId),
          eq(productQuestion.id, id)
        )
      )
      .returning();
    return rows[0] ?? null;
  }
}
