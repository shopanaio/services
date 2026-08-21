import { createQuery, createRelayQuery, type InferRelayInput } from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import { decodeCustomerGlobalId, decodeReviewsOwnedGlobalId } from "../global-id-where-mappers.js";
import {
  contentItem,
  contentListView,
  contentMetrics,
  contentPublication,
  contentTranslation,
  type ContentItem,
  type ContentMetrics,
  type ContentPublication,
  type ContentTranslation,
  type NewContentItem,
  type NewContentPublication,
  type NewContentTranslation,
} from "../models/index.js";
import type { MutationResult, RepositoryConnectionResult } from "../types.js";

export const contentRelayQuery = createRelayQuery(
  createQuery(contentListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeReviewsOwnedGlobalId,
      authorCustomerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "reviewContent", tieBreaker: "id" },
);

export type ContentRelayInput = InferRelayInput<typeof contentRelayQuery>;
export interface ContentConnectionMetaInput {
  includeDeleted?: boolean;
  includeRedacted?: boolean;
}
export type ContentConnectionInput = ContentRelayInput & {
  meta?: ContentConnectionMetaInput;
};

export type ContentPatch = Partial<
  Pick<
    NewContentItem,
    | "title"
    | "body"
    | "locale"
    | "authorType"
    | "authorCustomerId"
    | "authorPrincipalId"
    | "authorDisplayName"
    | "authorEmail"
    | "sourceChannel"
    | "sourceMetadata"
    | "idempotencyKey"
    | "status"
    | "moderationNote"
    | "moderatedByPrincipalId"
    | "moderatedAt"
    | "publishedAt"
    | "unpublishedAt"
  >
>;

export type ContentRestorePatch = ContentPatch & {
  redactedAt: string | null;
};

export type ContentTranslationPatch = Partial<
  Pick<
    NewContentTranslation,
    "title" | "body" | "source" | "status" | "reviewedByPrincipalId" | "reviewedAt"
  >
>;

export type ContentPublicationPatch = Partial<
  Pick<
    NewContentPublication,
    "channel" | "locale" | "status" | "scheduledAt" | "publishedAt" | "unpublishedAt" | "lastError"
  >
>;

export class ContentRepository extends BaseRepository {
  @ReadOnly()
  async findByIdempotencyKey(
    sourceChannel: string,
    idempotencyKey: string,
  ): Promise<ContentItem | null> {
    const rows = await this.connection
      .select()
      .from(contentItem)
      .where(
        and(
          eq(contentItem.storeId, this.storeId),
          eq(contentItem.sourceChannel, sourceChannel),
          eq(contentItem.idempotencyKey, idempotencyKey),
          isNull(contentItem.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findById(
    id: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<ContentItem | null> {
    const rows = await this.connection
      .select()
      .from(contentItem)
      .where(
        and(
          eq(contentItem.storeId, this.storeId),
          eq(contentItem.id, id),
          ...(options.includeDeleted ? [] : [isNull(contentItem.deletedAt)]),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByIds(
    ids: readonly string[],
    options: { includeDeleted?: boolean } = {},
  ): Promise<ContentItem[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(contentItem)
      .where(
        and(
          eq(contentItem.storeId, this.storeId),
          inArray(contentItem.id, [...new Set(ids)]),
          ...(options.includeDeleted ? [] : [isNull(contentItem.deletedAt)]),
        ),
      );
  }

  @ReadOnly()
  async getConnection(args: ContentConnectionInput): Promise<RepositoryConnectionResult> {
    const { where, orderBy, meta, ...pagination } = args;
    const mergedWhere: ContentRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(meta?.includeDeleted ? [] : [{ deletedAt: { _is: null } }]),
        ...(meta?.includeRedacted === false ? [{ redactedAt: { _is: null } }] : []),
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ContentRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      contentRelayQuery.execute(this.connection, executeInput),
      contentRelayQuery.count(this.connection, { where: mergedWhere }),
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
    input: Omit<
      NewContentItem,
      "id" | "storeId" | "revision" | "createdAt" | "updatedAt" | "deletedAt" | "redactedAt"
    >,
    id?: string,
  ): Promise<ContentItem> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(contentItem)
      .values({
        ...input,
        id: id ?? (await this.generateUuidV7()),
        storeId: this.storeId,
        revision: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        redactedAt: null,
        publishedAt: input.status === "PUBLISHED" ? now : input.publishedAt,
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create review content");
    return created;
  }

  @Transactional()
  async update(
    id: string,

    patch: ContentPatch,
  ): Promise<MutationResult<ContentItem>> {
    const rows = await this.connection
      .update(contentItem)
      .set({
        ...patch,
        revision: sql`${contentItem.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(contentItem.storeId, this.storeId),
          eq(contentItem.id, id),
          isNull(contentItem.deletedAt),
        ),
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return { status: "not_found" };
  }

  @Transactional()
  async updateFields(id: string, patch: ContentPatch): Promise<ContentItem | null> {
    const rows = await this.connection
      .update(contentItem)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(contentItem.storeId, this.storeId),
          eq(contentItem.id, id),
          isNull(contentItem.deletedAt),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  @Transactional()
  async delete(input: {
    id: string;

    permanent?: boolean;
  }): Promise<MutationResult<ContentItem>> {
    const conditions = and(
      eq(contentItem.storeId, this.storeId),
      eq(contentItem.id, input.id),
      isNull(contentItem.deletedAt),
    );
    const now = new Date().toISOString();
    const rows = input.permanent
      ? await this.connection.delete(contentItem).where(conditions).returning()
      : await this.connection
          .update(contentItem)
          .set({
            deletedAt: now,
            updatedAt: now,
            revision: sql`${contentItem.revision} + 1`,
          })
          .where(conditions)
          .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return { status: "not_found" };
  }

  @Transactional()
  async redact(id: string): Promise<MutationResult<ContentItem>> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .update(contentItem)
      .set({
        title: null,
        body: "Content redacted by privacy workflow.",
        authorCustomerId: null,
        authorPrincipalId: null,
        authorDisplayName: "Redacted author",
        authorEmail: null,
        sourceMetadata: {},
        idempotencyKey: null,
        redactedAt: now,
        updatedAt: now,
        revision: sql`${contentItem.revision} + 1`,
      })
      .where(
        and(
          eq(contentItem.storeId, this.storeId),
          eq(contentItem.id, id),
          isNull(contentItem.deletedAt),
        ),
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return { status: "not_found" };
  }

  @Transactional()
  async restore(
    id: string,

    patch: ContentRestorePatch,
  ): Promise<MutationResult<ContentItem>> {
    const rows = await this.connection
      .update(contentItem)
      .set({
        ...patch,
        revision: sql`${contentItem.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(contentItem.storeId, this.storeId),
          eq(contentItem.id, id),
          isNull(contentItem.deletedAt),
        ),
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return { status: "not_found" };
  }

  @ReadOnly()
  async getMetrics(contentId: string): Promise<ContentMetrics | null> {
    const rows = await this.connection
      .select()
      .from(contentMetrics)
      .where(and(eq(contentMetrics.storeId, this.storeId), eq(contentMetrics.contentId, contentId)))
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getMetricsByContentIds(contentIds: readonly string[]): Promise<ContentMetrics[]> {
    if (contentIds.length === 0) return [];
    return this.connection
      .select()
      .from(contentMetrics)
      .where(
        and(
          eq(contentMetrics.storeId, this.storeId),
          inArray(contentMetrics.contentId, [...new Set(contentIds)]),
        ),
      );
  }

  @ReadOnly()
  async getTranslations(contentId: string): Promise<ContentTranslation[]> {
    return this.connection
      .select()
      .from(contentTranslation)
      .where(
        and(
          eq(contentTranslation.storeId, this.storeId),
          eq(contentTranslation.contentId, contentId),
        ),
      )
      .orderBy(asc(contentTranslation.locale));
  }

  @ReadOnly()
  async getTranslationsByContentIds(contentIds: readonly string[]): Promise<ContentTranslation[]> {
    if (contentIds.length === 0) return [];
    return this.connection
      .select()
      .from(contentTranslation)
      .where(
        and(
          eq(contentTranslation.storeId, this.storeId),
          inArray(contentTranslation.contentId, [...new Set(contentIds)]),
        ),
      )
      .orderBy(asc(contentTranslation.contentId), asc(contentTranslation.locale));
  }

  @ReadOnly()
  async getTranslationsByIds(ids: readonly string[]): Promise<ContentTranslation[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(contentTranslation)
      .where(
        and(
          eq(contentTranslation.storeId, this.storeId),
          inArray(contentTranslation.id, [...new Set(ids)]),
        ),
      );
  }

  @Transactional()
  async createTranslation(
    input: Omit<NewContentTranslation, "id" | "storeId" | "revision" | "createdAt" | "updatedAt">,
  ): Promise<ContentTranslation> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(contentTranslation)
      .values({
        ...input,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create content translation");
    return created;
  }

  @Transactional()
  async replaceTranslations(
    contentId: string,
    items: readonly Omit<
      NewContentTranslation,
      "id" | "storeId" | "contentId" | "revision" | "createdAt" | "updatedAt"
    >[],
  ): Promise<ContentTranslation[]> {
    await this.connection
      .delete(contentTranslation)
      .where(
        and(
          eq(contentTranslation.storeId, this.storeId),
          eq(contentTranslation.contentId, contentId),
        ),
      );
    if (items.length === 0) return [];

    const ids = await this.generateUuidV7s(items.length);
    const now = new Date().toISOString();
    return this.connection
      .insert(contentTranslation)
      .values(
        items.map((item, index) => ({
          ...item,
          id: ids[index]!,
          storeId: this.storeId,
          contentId,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .returning();
  }

  @Transactional()
  async updateTranslation(
    id: string,

    patch: ContentTranslationPatch,
  ): Promise<MutationResult<ContentTranslation>> {
    const rows = await this.connection
      .update(contentTranslation)
      .set({
        ...patch,
        revision: sql`${contentTranslation.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(contentTranslation.storeId, this.storeId), eq(contentTranslation.id, id)))
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return { status: "not_found" };
  }

  @Transactional()
  async deleteTranslation(id: string): Promise<MutationResult<ContentTranslation>> {
    const rows = await this.connection
      .delete(contentTranslation)
      .where(and(eq(contentTranslation.storeId, this.storeId), eq(contentTranslation.id, id)))
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return { status: "not_found" };
  }

  @ReadOnly()
  async getPublications(contentId: string): Promise<ContentPublication[]> {
    return this.connection
      .select()
      .from(contentPublication)
      .where(
        and(
          eq(contentPublication.storeId, this.storeId),
          eq(contentPublication.contentId, contentId),
        ),
      )
      .orderBy(asc(contentPublication.channel), asc(contentPublication.locale));
  }

  @ReadOnly()
  async getPublicationsByContentIds(contentIds: readonly string[]): Promise<ContentPublication[]> {
    if (contentIds.length === 0) return [];
    return this.connection
      .select()
      .from(contentPublication)
      .where(
        and(
          eq(contentPublication.storeId, this.storeId),
          inArray(contentPublication.contentId, [...new Set(contentIds)]),
        ),
      )
      .orderBy(
        asc(contentPublication.contentId),
        asc(contentPublication.channel),
        asc(contentPublication.locale),
      );
  }

  @ReadOnly()
  async getPublicationsByIds(ids: readonly string[]): Promise<ContentPublication[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(contentPublication)
      .where(
        and(
          eq(contentPublication.storeId, this.storeId),
          inArray(contentPublication.id, [...new Set(ids)]),
        ),
      );
  }

  @Transactional()
  async createPublication(
    input: Omit<NewContentPublication, "id" | "storeId" | "createdAt" | "updatedAt">,
  ): Promise<ContentPublication> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(contentPublication)
      .values({
        ...input,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create content publication");
    return created;
  }

  @Transactional()
  async replacePublications(
    contentId: string,
    items: readonly Omit<
      NewContentPublication,
      "id" | "storeId" | "contentId" | "createdAt" | "updatedAt"
    >[],
  ): Promise<ContentPublication[]> {
    await this.connection
      .delete(contentPublication)
      .where(
        and(
          eq(contentPublication.storeId, this.storeId),
          eq(contentPublication.contentId, contentId),
        ),
      );
    if (items.length === 0) return [];

    const ids = await this.generateUuidV7s(items.length);
    const now = new Date().toISOString();
    return this.connection
      .insert(contentPublication)
      .values(
        items.map((item, index) => ({
          ...item,
          id: ids[index]!,
          storeId: this.storeId,
          contentId,
          publishedAt: item.status === "PUBLISHED" ? now : item.publishedAt,
          unpublishedAt: item.status === "UNPUBLISHED" ? now : item.unpublishedAt,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .returning();
  }

  @Transactional()
  async updatePublication(
    id: string,
    patch: ContentPublicationPatch,
  ): Promise<MutationResult<ContentPublication>> {
    const rows = await this.connection
      .update(contentPublication)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(eq(contentPublication.storeId, this.storeId), eq(contentPublication.id, id)))
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return { status: "not_found" };
  }

  @Transactional()
  async deletePublication(id: string): Promise<MutationResult<ContentPublication>> {
    const rows = await this.connection
      .delete(contentPublication)
      .where(and(eq(contentPublication.storeId, this.storeId), eq(contentPublication.id, id)))
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return { status: "not_found" };
  }

  @ReadOnly()
  async findTranslationById(id: string): Promise<ContentTranslation | null> {
    const rows = await this.connection
      .select()
      .from(contentTranslation)
      .where(and(eq(contentTranslation.storeId, this.storeId), eq(contentTranslation.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findPublicationById(id: string): Promise<ContentPublication | null> {
    const rows = await this.connection
      .select()
      .from(contentPublication)
      .where(and(eq(contentPublication.storeId, this.storeId), eq(contentPublication.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }
}
