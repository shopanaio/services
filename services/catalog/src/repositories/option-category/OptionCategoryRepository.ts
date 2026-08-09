import { and, count, eq, inArray } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  productOption,
  productOptionCategory,
  type NewProductOptionCategory,
  type ProductOptionCategory,
} from "../models/index.js";
import { decodeOptionCategoryGlobalId } from "../global-id-where-mappers.js";

export const optionCategoryRelayQuery = createRelayQuery(
  createQuery(productOptionCategory)
    .include(["id"])
    .mapWhereFields({ id: decodeOptionCategoryGlobalId })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "optionCategory", tieBreaker: "id" }
);

export type OptionCategoryRelayInput = InferRelayInput<
  typeof optionCategoryRelayQuery
>;

export interface OptionCategoryConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class OptionCategoryRepository extends BaseRepository {
  async findById(id: string): Promise<ProductOptionCategory | null> {
    const rows = await this.connection
      .select()
      .from(productOptionCategory)
      .where(
        and(
          eq(productOptionCategory.storeId, this.storeId),
          eq(productOptionCategory.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findBySlug(slug: string): Promise<ProductOptionCategory | null> {
    const rows = await this.connection
      .select()
      .from(productOptionCategory)
      .where(
        and(
          eq(productOptionCategory.storeId, this.storeId),
          eq(productOptionCategory.slug, slug)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async create(data: { name: string; slug: string }): Promise<ProductOptionCategory> {
    const now = new Date().toISOString();
    const entity: NewProductOptionCategory = {
      storeId: this.storeId,
      id: await this.generateUuidV7(),
      name: data.name,
      slug: data.slug,
      createdAt: now,
      updatedAt: now,
    };
    const rows = await this.connection
      .insert(productOptionCategory)
      .values(entity)
      .returning();
    return rows[0];
  }

  async update(
    id: string,
    data: { name?: string; slug?: string }
  ): Promise<ProductOptionCategory | null> {
    const update: Partial<NewProductOptionCategory> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.name !== undefined) update.name = data.name;
    if (data.slug !== undefined) update.slug = data.slug;
    const rows = await this.connection
      .update(productOptionCategory)
      .set(update)
      .where(
        and(
          eq(productOptionCategory.storeId, this.storeId),
          eq(productOptionCategory.id, id)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(productOptionCategory)
      .where(
        and(
          eq(productOptionCategory.storeId, this.storeId),
          eq(productOptionCategory.id, id)
        )
      )
      .returning({ id: productOptionCategory.id });
    return rows.length > 0;
  }

  async isInUse(id: string): Promise<boolean> {
    const rows = await this.connection
      .select({ id: productOption.id })
      .from(productOption)
      .where(
        and(
          eq(productOption.storeId, this.storeId),
          eq(productOption.categoryId, id)
        )
      )
      .limit(1);
    return rows.length > 0;
  }

  async getByIds(ids: readonly string[]): Promise<ProductOptionCategory[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(productOptionCategory)
      .where(
        and(
          eq(productOptionCategory.storeId, this.storeId),
          inArray(productOptionCategory.id, [...ids])
        )
      );
  }

  async getConnection(
    args: OptionCategoryRelayInput
  ): Promise<OptionCategoryConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: OptionCategoryRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(where ? [where] : []),
      ],
    };
    const input: OptionCategoryRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "name", direction: "asc" },
        { field: "id", direction: "asc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      optionCategoryRelayQuery.execute(this.connection, input),
      optionCategoryRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return {
      edges: result.edges.map((edge) => ({
        cursor: edge.cursor,
        nodeId: edge.node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  async count(): Promise<number> {
    const rows = await this.connection
      .select({ value: count() })
      .from(productOptionCategory)
      .where(eq(productOptionCategory.storeId, this.storeId));
    return rows[0]?.value ?? 0;
  }
}
