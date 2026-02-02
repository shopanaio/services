import { and, eq, inArray, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type InferExecuteOptions,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  tag,
  tagTranslation,
  productTag,
  type Tag,
  type NewTag,
  type TagTranslation,
  type ProductTag,
  type NewProductTag,
} from "../models/index.js";

const tagQuery = createQuery(tag).maxLimit(100).defaultLimit(20);

export const tagRelayQuery = createRelayQuery(
  createQuery(tag).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "tag", tieBreaker: "id" }
);

export type TagQueryInput = InferExecuteOptions<typeof tagQuery>;
export type TagRelayInput = InferRelayInput<typeof tagRelayQuery>;

export interface TagConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class TagRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? "uk";
  }

  // ============ CRUD ============

  async exists(id: string): Promise<boolean> {
    const result = await this.connection
      .select({ id: tag.id })
      .from(tag)
      .where(
        and(eq(tag.projectId, this.storeId), eq(tag.id, id))
      )
      .limit(1);

    return result.length > 0;
  }

  async findById(id: string): Promise<Tag | null> {
    const result = await this.connection
      .select()
      .from(tag)
      .where(
        and(eq(tag.projectId, this.storeId), eq(tag.id, id))
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findByHandle(handle: string): Promise<Tag | null> {
    const result = await this.connection
      .select()
      .from(tag)
      .where(
        and(eq(tag.projectId, this.storeId), eq(tag.handle, handle))
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: { handle: string }): Promise<Tag> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const newTag: NewTag = {
      projectId: this.storeId,
      id,
      handle: data.handle,
      createdAt: now,
    };

    const result = await this.connection
      .insert(tag)
      .values(newTag)
      .returning();

    return result[0];
  }

  async update(id: string, data: { handle?: string }): Promise<Tag | null> {
    if (!data.handle) return this.findById(id);

    const result = await this.connection
      .update(tag)
      .set({ handle: data.handle })
      .where(
        and(eq(tag.projectId, this.storeId), eq(tag.id, id))
      )
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(tag)
      .where(
        and(eq(tag.projectId, this.storeId), eq(tag.id, id))
      )
      .returning({ id: tag.id });

    return result.length > 0;
  }

  async findOrCreate(handle: string): Promise<Tag> {
    const existing = await this.findByHandle(handle);
    if (existing) return existing;
    return this.create({ handle });
  }

  // ============ Query ============

  async count(): Promise<number> {
    const result = await this.connection
      .select({ count: count() })
      .from(tag)
      .where(eq(tag.projectId, this.storeId));
    return result[0]?.count ?? 0;
  }

  async getConnection(args: TagRelayInput): Promise<TagConnectionResult> {
    const { where, order, ...paginationArgs } = args;

    const mergedWhere: TagRelayInput["where"] = {
      _and: [
        { projectId: { _eq: this.storeId } },
        ...(where ? [where] : []),
      ],
    };

    const executeInput: TagRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      order: order ?? [
        { field: "createdAt", order: "desc" },
        { field: "id", order: "desc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      tagRelayQuery.execute(this.connection, executeInput),
      this.count(),
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

  async getMany(input?: TagQueryInput): Promise<Tag[]> {
    return tagQuery.execute(this.connection, {
      ...input,
      order: input?.order ?? [
        { field: "createdAt", order: "desc" },
        { field: "id", order: "desc" },
      ],
      where: {
        ...input?.where,
        projectId: { _eq: this.storeId },
      },
    });
  }

  // ============ Loader ============

  async getByIds(tagIds: readonly string[]): Promise<Tag[]> {
    return this.connection
      .select()
      .from(tag)
      .where(
        and(
          eq(tag.projectId, this.storeId),
          inArray(tag.id, [...tagIds])
        )
      );
  }

  async getTranslationsByTagIds(
    tagIds: readonly string[]
  ): Promise<TagTranslation[]> {
    return this.connection
      .select()
      .from(tagTranslation)
      .where(
        and(
          eq(tagTranslation.projectId, this.storeId),
          inArray(tagTranslation.tagId, [...tagIds]),
          eq(tagTranslation.locale, this.locale)
        )
      );
  }

  // ============ Product-Tag Relations ============

  async getProductTagLinks(
    productIds: readonly string[]
  ): Promise<ProductTag[]> {
    return this.connection
      .select()
      .from(productTag)
      .where(
        and(
          eq(productTag.projectId, this.storeId),
          inArray(productTag.productId, [...productIds])
        )
      );
  }

  async getTagProductLinks(tagIds: readonly string[]): Promise<ProductTag[]> {
    return this.connection
      .select()
      .from(productTag)
      .where(
        and(
          eq(productTag.projectId, this.storeId),
          inArray(productTag.tagId, [...tagIds])
        )
      );
  }

  async countProductsByTagIds(
    tagIds: readonly string[]
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    for (const tagId of tagIds) {
      const countResult = await this.connection
        .select({ count: count() })
        .from(productTag)
        .where(
          and(
            eq(productTag.projectId, this.storeId),
            eq(productTag.tagId, tagId)
          )
        );
      result.set(tagId, countResult[0]?.count ?? 0);
    }

    return result;
  }

  async getProductIdsByTagId(
    tagId: string,
    options?: { first?: number; offset?: number }
  ): Promise<string[]> {
    const first = options?.first ?? 20;
    const offset = options?.offset ?? 0;

    const results = await this.connection
      .select({ productId: productTag.productId })
      .from(productTag)
      .where(
        and(
          eq(productTag.projectId, this.storeId),
          eq(productTag.tagId, tagId)
        )
      )
      .limit(first)
      .offset(offset);

    return results.map((r) => r.productId);
  }

  async linkProductToTag(productId: string, tagId: string): Promise<ProductTag> {
    const newLink: NewProductTag = {
      projectId: this.storeId,
      productId,
      tagId,
    };

    const result = await this.connection
      .insert(productTag)
      .values(newLink)
      .onConflictDoNothing()
      .returning();

    // If conflict, return existing
    if (result.length === 0) {
      const existing = await this.connection
        .select()
        .from(productTag)
        .where(
          and(
            eq(productTag.projectId, this.storeId),
            eq(productTag.productId, productId),
            eq(productTag.tagId, tagId)
          )
        )
        .limit(1);
      return existing[0];
    }

    return result[0];
  }

  async unlinkProductFromTag(productId: string, tagId: string): Promise<boolean> {
    const result = await this.connection
      .delete(productTag)
      .where(
        and(
          eq(productTag.projectId, this.storeId),
          eq(productTag.productId, productId),
          eq(productTag.tagId, tagId)
        )
      )
      .returning({ productId: productTag.productId });

    return result.length > 0;
  }

  async setProductTags(productId: string, tagIds: string[]): Promise<void> {
    // Remove all existing tags
    await this.connection
      .delete(productTag)
      .where(
        and(
          eq(productTag.projectId, this.storeId),
          eq(productTag.productId, productId)
        )
      );

    // Add new tags
    if (tagIds.length > 0) {
      const links: NewProductTag[] = tagIds.map((tagId) => ({
        projectId: this.storeId,
        productId,
        tagId,
      }));
      await this.connection.insert(productTag).values(links);
    }
  }

  // ============ Translation ============

  async upsertTranslation(data: {
    projectId: string;
    tagId: string;
    locale: string;
    name: string;
  }): Promise<TagTranslation> {
    const result = await this.connection
      .insert(tagTranslation)
      .values({
        projectId: data.projectId,
        tagId: data.tagId,
        locale: data.locale,
        name: data.name,
      })
      .onConflictDoUpdate({
        target: [tagTranslation.tagId, tagTranslation.locale],
        set: { name: data.name },
      })
      .returning();

    return result[0];
  }
}
