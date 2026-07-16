import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, isNull } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  decodeContentExternalReferenceGlobalId,
  decodeReviewsOwnedGlobalId,
} from "../global-id-where-mappers.js";
import {
  contentExternalReference,
  type ContentExternalReference,
  type NewContentExternalReference,
} from "../models/index.js";
import type {
  OptimisticMutationResult,
  RepositoryConnectionResult,
} from "../types.js";

export const contentExternalReferenceRelayQuery = createRelayQuery(
  createQuery(contentExternalReference)
    .include(["id"])
    .mapWhereFields({
      id: decodeContentExternalReferenceGlobalId,
      contentId: decodeReviewsOwnedGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "reviewContentExternalReference", tieBreaker: "id" }
);

export type ContentExternalReferenceRelayInput = InferRelayInput<
  typeof contentExternalReferenceRelayQuery
>;
export type ContentExternalReferencePatch = Partial<
  Pick<
    NewContentExternalReference,
    | "externalSystem"
    | "externalType"
    | "externalId"
    | "externalUrl"
    | "direction"
    | "syncStatus"
    | "etag"
    | "contentChecksum"
    | "lastSyncedAt"
    | "lastError"
    | "metadata"
  >
>;

export class ExternalReferenceRepository extends BaseRepository {
  @ReadOnly()
  async findById(
    id: string,
    includeDeleted = false
  ): Promise<ContentExternalReference | null> {
    const rows = await this.connection
      .select()
      .from(contentExternalReference)
      .where(
        and(
          eq(contentExternalReference.storeId, this.storeId),
          eq(contentExternalReference.id, id),
          ...(includeDeleted
            ? []
            : [isNull(contentExternalReference.deletedAt)])
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getConnection(
    args: ContentExternalReferenceRelayInput,
    contentId?: string
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: ContentExternalReferenceRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { deletedAt: { _is: null } },
        ...(contentId ? [{ contentId: { _eq: contentId } }] : []),
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ContentExternalReferenceRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "updatedAt", direction: "asc" },
        { field: "id", direction: "asc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      contentExternalReferenceRelayQuery.execute(this.connection, executeInput),
      contentExternalReferenceRelayQuery.count(this.connection, {
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
    input: Omit<
      NewContentExternalReference,
      "id" | "storeId" | "createdAt" | "updatedAt" | "deletedAt"
    >
  ): Promise<ContentExternalReference> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(contentExternalReference)
      .values({
        ...input,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create content external reference");
    return created;
  }

  @Transactional()
  async update(
    id: string,
    expectedUpdatedAt: string,
    patch: ContentExternalReferencePatch
  ): Promise<OptimisticMutationResult<ContentExternalReference>> {
    const rows = await this.connection
      .update(contentExternalReference)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(contentExternalReference.storeId, this.storeId),
          eq(contentExternalReference.id, id),
          eq(contentExternalReference.updatedAt, expectedUpdatedAt),
          isNull(contentExternalReference.deletedAt)
        )
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return this.optimisticMiss(id);
  }

  @Transactional()
  async delete(input: {
    id: string;
    expectedUpdatedAt: string;
    permanent?: boolean;
  }): Promise<OptimisticMutationResult<ContentExternalReference>> {
    const conditions = and(
      eq(contentExternalReference.storeId, this.storeId),
      eq(contentExternalReference.id, input.id),
      eq(contentExternalReference.updatedAt, input.expectedUpdatedAt),
      isNull(contentExternalReference.deletedAt)
    );
    const rows = input.permanent
      ? await this.connection
          .delete(contentExternalReference)
          .where(conditions)
          .returning()
      : await this.connection
          .update(contentExternalReference)
          .set({
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(conditions)
          .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return this.optimisticMiss(input.id);
  }

  private async optimisticMiss(
    id: string
  ): Promise<OptimisticMutationResult<ContentExternalReference>> {
    const current = await this.findById(id, true);
    return current
      ? { status: "conflict", current }
      : { status: "not_found" };
  }
}
