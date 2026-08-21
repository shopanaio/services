import { createQuery, createRelayQuery, type InferRelayInput } from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  decodeContentRevisionGlobalId,
  decodeModerationCaseGlobalId,
  decodeModerationEventGlobalId,
  decodeModerationSignalGlobalId,
  decodeReviewsOwnedGlobalId,
} from "../global-id-where-mappers.js";
import {
  contentRevision,
  moderationCase,
  moderationEvent,
  moderationSignal,
  type ContentRevision,
  type ModerationCase,
  type ModerationEvent,
  type ModerationSignal,
  type NewModerationCase,
  type NewModerationEvent,
  type NewContentRevision,
  type NewModerationSignal,
} from "../models/index.js";
import type { MutationResult, RepositoryConnectionResult } from "../types.js";

export const moderationCaseRelayQuery = createRelayQuery(
  createQuery(moderationCase)
    .include(["id"])
    .mapWhereFields({
      id: decodeModerationCaseGlobalId,
      contentId: decodeReviewsOwnedGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "reviewModerationCase", tieBreaker: "id" },
);

export const moderationEventRelayQuery = createRelayQuery(
  createQuery(moderationEvent)
    .include(["id"])
    .mapWhereFields({
      id: decodeModerationEventGlobalId,
      contentId: decodeReviewsOwnedGlobalId,
      caseId: decodeModerationCaseGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "reviewModerationEvent", tieBreaker: "id" },
);

export const contentRevisionRelayQuery = createRelayQuery(
  createQuery(contentRevision)
    .include(["id"])
    .mapWhereFields({
      id: decodeContentRevisionGlobalId,
      contentId: decodeReviewsOwnedGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "reviewContentRevision", tieBreaker: "id" },
);

export const moderationSignalRelayQuery = createRelayQuery(
  createQuery(moderationSignal)
    .include(["id"])
    .mapWhereFields({
      id: decodeModerationSignalGlobalId,
      contentId: decodeReviewsOwnedGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "reviewModerationSignal", tieBreaker: "id" },
);

export type ModerationCaseRelayInput = InferRelayInput<typeof moderationCaseRelayQuery>;
export type ModerationEventRelayInput = InferRelayInput<typeof moderationEventRelayQuery>;
export type ContentRevisionRelayInput = InferRelayInput<typeof contentRevisionRelayQuery>;
export type ModerationSignalRelayInput = InferRelayInput<typeof moderationSignalRelayQuery>;

export type ModerationCasePatch = Partial<
  Pick<
    NewModerationCase,
    | "status"
    | "priority"
    | "reasonCode"
    | "assignedToPrincipalId"
    | "dueAt"
    | "resolutionCode"
    | "resolutionNote"
    | "resolvedByPrincipalId"
    | "resolvedAt"
  >
>;

export class ModerationRepository extends BaseRepository {
  @ReadOnly()
  async findCaseById(id: string): Promise<ModerationCase | null> {
    const rows = await this.connection
      .select()
      .from(moderationCase)
      .where(and(eq(moderationCase.storeId, this.storeId), eq(moderationCase.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getCasesByIds(ids: readonly string[]): Promise<ModerationCase[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(moderationCase)
      .where(
        and(
          eq(moderationCase.storeId, this.storeId),
          inArray(moderationCase.id, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async findEventById(id: string): Promise<ModerationEvent | null> {
    const rows = await this.connection
      .select()
      .from(moderationEvent)
      .where(and(eq(moderationEvent.storeId, this.storeId), eq(moderationEvent.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getEventsByIds(ids: readonly string[]): Promise<ModerationEvent[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(moderationEvent)
      .where(
        and(
          eq(moderationEvent.storeId, this.storeId),
          inArray(moderationEvent.id, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async findRevisionById(id: string): Promise<ContentRevision | null> {
    const rows = await this.connection
      .select()
      .from(contentRevision)
      .where(and(eq(contentRevision.storeId, this.storeId), eq(contentRevision.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findRevision(contentId: string, revision: number): Promise<ContentRevision | null> {
    const rows = await this.connection
      .select()
      .from(contentRevision)
      .where(
        and(
          eq(contentRevision.storeId, this.storeId),
          eq(contentRevision.contentId, contentId),
          eq(contentRevision.revision, revision),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getRevisionsByIds(ids: readonly string[]): Promise<ContentRevision[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(contentRevision)
      .where(
        and(
          eq(contentRevision.storeId, this.storeId),
          inArray(contentRevision.id, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async findSignalById(id: string): Promise<ModerationSignal | null> {
    const rows = await this.connection
      .select()
      .from(moderationSignal)
      .where(and(eq(moderationSignal.storeId, this.storeId), eq(moderationSignal.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getSignalsByIds(ids: readonly string[]): Promise<ModerationSignal[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(moderationSignal)
      .where(
        and(
          eq(moderationSignal.storeId, this.storeId),
          inArray(moderationSignal.id, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async getCaseConnection(
    args: ModerationCaseRelayInput,
    contentId?: string,
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: ModerationCaseRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(contentId ? [{ contentId: { _eq: contentId } }] : []),
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ModerationCaseRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "priority", direction: "desc" },
        { field: "createdAt", direction: "asc" },
        { field: "id", direction: "asc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      moderationCaseRelayQuery.execute(this.connection, executeInput),
      moderationCaseRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return this.toConnectionResult(result, totalCount);
  }

  @ReadOnly()
  async getEventConnection(
    contentId: string,
    args: ModerationEventRelayInput,
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: ModerationEventRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { contentId: { _eq: contentId } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ModerationEventRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      moderationEventRelayQuery.execute(this.connection, executeInput),
      moderationEventRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return this.toConnectionResult(result, totalCount);
  }

  @ReadOnly()
  async getRevisionConnection(
    contentId: string,
    args: ContentRevisionRelayInput,
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: ContentRevisionRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { contentId: { _eq: contentId } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ContentRevisionRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "revision", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      contentRevisionRelayQuery.execute(this.connection, executeInput),
      contentRevisionRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return this.toConnectionResult(result, totalCount);
  }

  @ReadOnly()
  async getSignalConnection(
    contentId: string,
    args: ModerationSignalRelayInput,
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: ModerationSignalRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { contentId: { _eq: contentId } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ModerationSignalRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      moderationSignalRelayQuery.execute(this.connection, executeInput),
      moderationSignalRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return this.toConnectionResult(result, totalCount);
  }

  @Transactional()
  async createCase(
    input: Omit<NewModerationCase, "id" | "storeId" | "createdAt" | "updatedAt">,
  ): Promise<ModerationCase> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(moderationCase)
      .values({
        ...input,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create moderation case");
    return created;
  }

  @Transactional()
  async updateCase(
    id: string,
    patch: ModerationCasePatch,
  ): Promise<MutationResult<ModerationCase>> {
    const rows = await this.connection
      .update(moderationCase)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(eq(moderationCase.storeId, this.storeId), eq(moderationCase.id, id)))
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return { status: "not_found" };
  }

  @Transactional()
  async appendEvent(
    input: Omit<NewModerationEvent, "id" | "storeId" | "createdAt">,
  ): Promise<ModerationEvent> {
    const rows = await this.connection
      .insert(moderationEvent)
      .values({
        ...input,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        createdAt: new Date().toISOString(),
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to append moderation event");
    return created;
  }

  @Transactional()
  async appendRevision(
    input: Omit<NewContentRevision, "id" | "storeId" | "createdAt">,
  ): Promise<ContentRevision> {
    const rows = await this.connection
      .insert(contentRevision)
      .values({
        ...input,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        createdAt: new Date().toISOString(),
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to append content revision");
    return created;
  }

  @Transactional()
  async appendSignal(
    input: Omit<NewModerationSignal, "id" | "storeId" | "createdAt">,
  ): Promise<ModerationSignal> {
    const rows = await this.connection
      .insert(moderationSignal)
      .values({
        ...input,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        createdAt: new Date().toISOString(),
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to append moderation signal");
    return created;
  }

  private toConnectionResult(
    result: {
      edges: Array<{ cursor: string; node: { id: string } }>;
      pageInfo: RepositoryConnectionResult["pageInfo"];
    },
    totalCount: number,
  ): RepositoryConnectionResult {
    return {
      edges: result.edges.map(({ cursor, node }) => ({
        cursor,
        nodeId: node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }
}
