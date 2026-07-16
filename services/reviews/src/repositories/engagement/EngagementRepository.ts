import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  decodeContentReportGlobalId,
  decodeCustomerGlobalId,
  decodeReviewContentVoteGlobalId,
  decodeReviewsOwnedGlobalId,
} from "../global-id-where-mappers.js";
import {
  contentReport,
  contentVote,
  type ContentReport,
  type ContentVote,
  type NewContentReport,
  type NewContentVote,
} from "../models/index.js";
import type {
  OptimisticMutationResult,
  RepositoryConnectionResult,
} from "../types.js";

export const contentReportRelayQuery = createRelayQuery(
  createQuery(contentReport)
    .include(["id"])
    .mapWhereFields({
      id: decodeContentReportGlobalId,
      contentId: decodeReviewsOwnedGlobalId,
      reporterCustomerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "reviewContentReport", tieBreaker: "id" }
);

export const contentVoteRelayQuery = createRelayQuery(
  createQuery(contentVote)
    .include(["id"])
    .mapWhereFields({
      id: decodeReviewContentVoteGlobalId,
      contentId: decodeReviewsOwnedGlobalId,
      voterCustomerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "reviewContentVote", tieBreaker: "id" }
);

export type ContentReportRelayInput = InferRelayInput<
  typeof contentReportRelayQuery
>;
export type ContentVoteRelayInput = InferRelayInput<
  typeof contentVoteRelayQuery
>;
export type ContentReportPatch = Partial<
  Pick<
    NewContentReport,
    | "status"
    | "assignedToPrincipalId"
    | "resolutionNote"
    | "resolvedByPrincipalId"
    | "resolvedAt"
  >
>;

export class EngagementRepository extends BaseRepository {
  @ReadOnly()
  async findVoteById(id: string): Promise<ContentVote | null> {
    const rows = await this.connection
      .select()
      .from(contentVote)
      .where(
        and(
          eq(contentVote.storeId, this.storeId),
          eq(contentVote.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findReportById(id: string): Promise<ContentReport | null> {
    const rows = await this.connection
      .select()
      .from(contentReport)
      .where(
        and(
          eq(contentReport.storeId, this.storeId),
          eq(contentReport.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getReportConnection(
    args: ContentReportRelayInput,
    contentId?: string
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: ContentReportRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(contentId ? [{ contentId: { _eq: contentId } }] : []),
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ContentReportRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "asc" },
        { field: "id", direction: "asc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      contentReportRelayQuery.execute(this.connection, executeInput),
      contentReportRelayQuery.count(this.connection, { where: mergedWhere }),
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

  @ReadOnly()
  async getVoteConnection(
    contentId: string,
    args: ContentVoteRelayInput
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: ContentVoteRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { contentId: { _eq: contentId } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: ContentVoteRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      contentVoteRelayQuery.execute(this.connection, executeInput),
      contentVoteRelayQuery.count(this.connection, { where: mergedWhere }),
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
  async createReport(
    input: Omit<NewContentReport, "id" | "storeId" | "createdAt" | "updatedAt">
  ): Promise<ContentReport> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(contentReport)
      .values({
        ...input,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create content report");
    return created;
  }

  @Transactional()
  async updateReport(
    id: string,
    expectedUpdatedAt: string,
    patch: ContentReportPatch
  ): Promise<OptimisticMutationResult<ContentReport>> {
    const rows = await this.connection
      .update(contentReport)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(contentReport.storeId, this.storeId),
          eq(contentReport.id, id),
          eq(contentReport.updatedAt, expectedUpdatedAt)
        )
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    const current = await this.findReportById(id);
    return current
      ? { status: "conflict", current }
      : { status: "not_found" };
  }

  @Transactional()
  async upsertVote(
    input: Omit<NewContentVote, "id" | "storeId" | "createdAt" | "updatedAt">
  ): Promise<ContentVote> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(contentVote)
      .values({
        ...input,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [contentVote.contentId, contentVote.voterKey],
        set: { type: input.type, updatedAt: now },
      })
      .returning();
    const value = rows[0];
    if (!value) throw new Error("Failed to upsert content vote");
    return value;
  }
}
