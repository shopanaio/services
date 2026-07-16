import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  decodeCustomerGlobalId,
  decodeReviewsOwnedGlobalId,
} from "../global-id-where-mappers.js";
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
import type {
  OptimisticMutationResult,
  RepositoryConnectionResult,
} from "../types.js";

export const contentRelayQuery = createRelayQuery(
  createQuery(contentListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeReviewsOwnedGlobalId,
      authorCustomerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "reviewContent", tieBreaker: "id" }
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

export type ContentTranslationPatch = Partial<
  Pick<
    NewContentTranslation,
    | "title"
    | "body"
    | "source"
    | "status"
    | "reviewedByPrincipalId"
    | "reviewedAt"
  >
>;

export type ContentPublicationPatch = Partial<
  Pick<
    NewContentPublication,
    | "channel"
    | "locale"
    | "status"
    | "scheduledAt"
    | "publishedAt"
    | "unpublishedAt"
    | "lastError"
  >
>;

export class ContentRepository extends BaseRepository {
  @ReadOnly()
  async findById(
    id: string,
    options: { includeDeleted?: boolean } = {}
  ): Promise<ContentItem | null> {
    const rows = await this.connection
      .select()
      .from(contentItem)
      .where(
        and(
          eq(contentItem.storeId, this.storeId),
          eq(contentItem.id, id),
          ...(options.includeDeleted ? [] : [isNull(contentItem.deletedAt)])
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByIds(
    ids: readonly string[],
    options: { includeDeleted?: boolean } = {}
  ): Promise<ContentItem[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(contentItem)
      .where(
        and(
          eq(contentItem.storeId, this.storeId),
          inArray(contentItem.id, [...new Set(ids)]),
          ...(options.includeDeleted ? [] : [isNull(contentItem.deletedAt)])
        )
      );
  }

  @ReadOnly()
  async getConnection(
    args: ContentConnectionInput
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, meta, ...pagination } = args;
    const mergedWhere: ContentRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(meta?.includeDeleted ? [] : [{ deletedAt: { _is: null } }]),
        ...(meta?.includeRedacted === false
          ? [{ redactedAt: { _is: null } }]
          : []),
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
    id?: string
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
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create review content");
    return created;
  }

  @Transactional()
  async update(
    id: string,
    expectedRevision: number,
    patch: ContentPatch
  ): Promise<OptimisticMutationResult<ContentItem>> {
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
          eq(contentItem.revision, expectedRevision),
          isNull(contentItem.deletedAt)
        )
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return this.optimisticContentMiss(id);
  }

  @Transactional()
  async delete(input: {
    id: string;
    expectedRevision: number;
    permanent?: boolean;
  }): Promise<OptimisticMutationResult<ContentItem>> {
    const conditions = and(
      eq(contentItem.storeId, this.storeId),
      eq(contentItem.id, input.id),
      eq(contentItem.revision, input.expectedRevision),
      isNull(contentItem.deletedAt)
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
    return this.optimisticContentMiss(input.id);
  }

  @Transactional()
  async redact(
    id: string,
    expectedRevision: number
  ): Promise<OptimisticMutationResult<ContentItem>> {
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
          eq(contentItem.revision, expectedRevision),
          isNull(contentItem.deletedAt)
        )
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return this.optimisticContentMiss(id);
  }

  @ReadOnly()
  async getMetrics(contentId: string): Promise<ContentMetrics | null> {
    const rows = await this.connection
      .select()
      .from(contentMetrics)
      .where(
        and(
          eq(contentMetrics.storeId, this.storeId),
          eq(contentMetrics.contentId, contentId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getTranslations(contentId: string): Promise<ContentTranslation[]> {
    return this.connection
      .select()
      .from(contentTranslation)
      .where(
        and(
          eq(contentTranslation.storeId, this.storeId),
          eq(contentTranslation.contentId, contentId)
        )
      )
      .orderBy(asc(contentTranslation.locale));
  }

  @Transactional()
  async createTranslation(
    input: Omit<
      NewContentTranslation,
      "id" | "storeId" | "revision" | "createdAt" | "updatedAt"
    >
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
  async updateTranslation(
    id: string,
    expectedRevision: number,
    patch: ContentTranslationPatch
  ): Promise<OptimisticMutationResult<ContentTranslation>> {
    const rows = await this.connection
      .update(contentTranslation)
      .set({
        ...patch,
        revision: sql`${contentTranslation.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(contentTranslation.storeId, this.storeId),
          eq(contentTranslation.id, id),
          eq(contentTranslation.revision, expectedRevision)
        )
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    const current = await this.findTranslationById(id);
    return current
      ? { status: "conflict", current }
      : { status: "not_found" };
  }

  @Transactional()
  async deleteTranslation(
    id: string,
    expectedRevision: number
  ): Promise<OptimisticMutationResult<ContentTranslation>> {
    const rows = await this.connection
      .delete(contentTranslation)
      .where(
        and(
          eq(contentTranslation.storeId, this.storeId),
          eq(contentTranslation.id, id),
          eq(contentTranslation.revision, expectedRevision)
        )
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    const current = await this.findTranslationById(id);
    return current
      ? { status: "conflict", current }
      : { status: "not_found" };
  }

  @ReadOnly()
  async getPublications(contentId: string): Promise<ContentPublication[]> {
    return this.connection
      .select()
      .from(contentPublication)
      .where(
        and(
          eq(contentPublication.storeId, this.storeId),
          eq(contentPublication.contentId, contentId)
        )
      )
      .orderBy(asc(contentPublication.channel), asc(contentPublication.locale));
  }

  @Transactional()
  async createPublication(
    input: Omit<
      NewContentPublication,
      "id" | "storeId" | "createdAt" | "updatedAt"
    >
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
  async updatePublication(
    id: string,
    expectedUpdatedAt: string,
    patch: ContentPublicationPatch
  ): Promise<OptimisticMutationResult<ContentPublication>> {
    const rows = await this.connection
      .update(contentPublication)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(contentPublication.storeId, this.storeId),
          eq(contentPublication.id, id),
          eq(contentPublication.updatedAt, expectedUpdatedAt)
        )
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    const current = await this.findPublicationById(id);
    return current
      ? { status: "conflict", current }
      : { status: "not_found" };
  }

  @Transactional()
  async deletePublication(
    id: string,
    expectedUpdatedAt: string
  ): Promise<OptimisticMutationResult<ContentPublication>> {
    const rows = await this.connection
      .delete(contentPublication)
      .where(
        and(
          eq(contentPublication.storeId, this.storeId),
          eq(contentPublication.id, id),
          eq(contentPublication.updatedAt, expectedUpdatedAt)
        )
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    const current = await this.findPublicationById(id);
    return current
      ? { status: "conflict", current }
      : { status: "not_found" };
  }

  private async optimisticContentMiss(
    id: string
  ): Promise<OptimisticMutationResult<ContentItem>> {
    const current = await this.findById(id, { includeDeleted: true });
    return current
      ? { status: "conflict", current }
      : { status: "not_found" };
  }

  @ReadOnly()
  async findTranslationById(
    id: string
  ): Promise<ContentTranslation | null> {
    const rows = await this.connection
      .select()
      .from(contentTranslation)
      .where(
        and(
          eq(contentTranslation.storeId, this.storeId),
          eq(contentTranslation.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findPublicationById(
    id: string
  ): Promise<ContentPublication | null> {
    const rows = await this.connection
      .select()
      .from(contentPublication)
      .where(
        and(
          eq(contentPublication.storeId, this.storeId),
          eq(contentPublication.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }
}
