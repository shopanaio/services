import { createQuery, createRelayQuery, type InferRelayInput } from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  decodeContentReportGlobalId,
  decodeCustomerGlobalId,
  decodeReviewContentVoteGlobalId,
  decodeReviewsOwnedGlobalId,
} from "../global-id-where-mappers.js";
import {
  contentReport,
  contentMetrics,
  contentVote,
  contentItem,
  questionAnswer,
  reviewMedia,
  reviewReply,
  type ContentReport,
  type ContentVote,
  type NewContentReport,
  type NewContentVote,
} from "../models/index.js";
import type { MutationResult, RepositoryConnectionResult } from "../types.js";

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
  { name: "reviewContentReport", tieBreaker: "id" },
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
  { name: "reviewContentVote", tieBreaker: "id" },
);

export type ContentReportRelayInput = InferRelayInput<typeof contentReportRelayQuery>;
export type ContentVoteRelayInput = InferRelayInput<typeof contentVoteRelayQuery>;
export type ContentReportPatch = Partial<
  Pick<
    NewContentReport,
    "status" | "assignedToPrincipalId" | "resolutionNote" | "resolvedByPrincipalId" | "resolvedAt"
  >
>;

export class EngagementRepository extends BaseRepository {
  @ReadOnly()
  async findVoteByViewer(contentId: string, voterKey: string): Promise<ContentVote | null> {
    const rows = await this.connection
      .select()
      .from(contentVote)
      .where(
        and(
          eq(contentVote.storeId, this.storeId),
          eq(contentVote.contentId, contentId),
          eq(contentVote.voterKey, voterKey),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findActiveReportByViewer(
    contentId: string,
    reporterKey: string,
  ): Promise<ContentReport | null> {
    const rows = await this.connection
      .select()
      .from(contentReport)
      .where(
        and(
          eq(contentReport.storeId, this.storeId),
          eq(contentReport.contentId, contentId),
          eq(contentReport.reporterKey, reporterKey),
          or(eq(contentReport.status, "OPEN"), eq(contentReport.status, "UNDER_REVIEW")),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }
  @ReadOnly()
  async findVoteById(id: string): Promise<ContentVote | null> {
    const rows = await this.connection
      .select()
      .from(contentVote)
      .where(and(eq(contentVote.storeId, this.storeId), eq(contentVote.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getVotesByIds(ids: readonly string[]): Promise<ContentVote[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(contentVote)
      .where(
        and(eq(contentVote.storeId, this.storeId), inArray(contentVote.id, [...new Set(ids)])),
      );
  }

  @ReadOnly()
  async findReportById(id: string): Promise<ContentReport | null> {
    const rows = await this.connection
      .select()
      .from(contentReport)
      .where(and(eq(contentReport.storeId, this.storeId), eq(contentReport.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getReportsByIds(ids: readonly string[]): Promise<ContentReport[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(contentReport)
      .where(
        and(eq(contentReport.storeId, this.storeId), inArray(contentReport.id, [...new Set(ids)])),
      );
  }

  @ReadOnly()
  async getReportConnection(
    args: ContentReportRelayInput,
    contentId?: string,
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
    args: ContentVoteRelayInput,
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
    input: Omit<NewContentReport, "id" | "storeId" | "createdAt" | "updatedAt">,
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
    patch: ContentReportPatch,
  ): Promise<MutationResult<ContentReport>> {
    const rows = await this.connection
      .update(contentReport)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(eq(contentReport.storeId, this.storeId), eq(contentReport.id, id)))
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return { status: "not_found" };
  }

  @Transactional()
  async upsertVote(
    input: Omit<NewContentVote, "id" | "storeId" | "createdAt" | "updatedAt">,
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

  @Transactional()
  async deleteVote(contentId: string, voterKey: string): Promise<ContentVote | null> {
    const rows = await this.connection
      .delete(contentVote)
      .where(
        and(
          eq(contentVote.storeId, this.storeId),
          eq(contentVote.contentId, contentId),
          eq(contentVote.voterKey, voterKey),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  @Transactional()
  async refreshContentMetrics(contentId: string): Promise<void> {
    await this.connection.execute(sql`
      INSERT INTO ${contentMetrics} (
        content_id, store_id, like_count, dislike_count,
        report_count, open_report_count, media_count, child_count,
        official_child_count, accepted_child_count, last_child_at, updated_at
      )
      SELECT
        ${contentId}, ${this.storeId},
        (SELECT count(*)::int FROM ${contentVote}
          WHERE ${contentVote.storeId} = ${this.storeId}
            AND ${contentVote.contentId} = ${contentId}
            AND ${contentVote.type} = 'LIKE'),
        (SELECT count(*)::int FROM ${contentVote}
          WHERE ${contentVote.storeId} = ${this.storeId}
            AND ${contentVote.contentId} = ${contentId}
            AND ${contentVote.type} = 'DISLIKE'),
        (SELECT count(*)::int FROM ${contentReport}
          WHERE ${contentReport.storeId} = ${this.storeId}
            AND ${contentReport.contentId} = ${contentId}),
        (SELECT count(*)::int FROM ${contentReport}
          WHERE ${contentReport.storeId} = ${this.storeId}
            AND ${contentReport.contentId} = ${contentId}
            AND ${contentReport.status} IN ('OPEN', 'UNDER_REVIEW')),
        (SELECT count(*)::int FROM ${reviewMedia}
          WHERE ${reviewMedia.storeId} = ${this.storeId}
            AND ${reviewMedia.reviewId} = ${contentId}
            AND ${reviewMedia.status} = 'PUBLISHED'),
        (SELECT count(*)::int FROM (
          SELECT child.id FROM ${reviewReply} child
          INNER JOIN ${contentItem} child_content ON child_content.id = child.id
          WHERE child.store_id = ${this.storeId}
            AND child.review_id = ${contentId}
            AND child_content.status = 'PUBLISHED'
            AND child_content.deleted_at IS NULL
          UNION ALL
          SELECT child.id FROM ${questionAnswer} child
          INNER JOIN ${contentItem} child_content ON child_content.id = child.id
          WHERE child.store_id = ${this.storeId}
            AND child.question_id = ${contentId}
            AND child_content.status = 'PUBLISHED'
            AND child_content.deleted_at IS NULL
        ) children),
        (SELECT count(*)::int FROM ${reviewReply} child
          INNER JOIN ${contentItem} child_content ON child_content.id = child.id
          WHERE child.store_id = ${this.storeId}
            AND child.review_id = ${contentId}
            AND child.is_official = true
            AND child_content.status = 'PUBLISHED'
            AND child_content.deleted_at IS NULL)
          +
        (SELECT count(*)::int FROM ${questionAnswer} child
          INNER JOIN ${contentItem} child_content ON child_content.id = child.id
          WHERE child.store_id = ${this.storeId}
            AND child.question_id = ${contentId}
            AND child.is_official = true
            AND child_content.status = 'PUBLISHED'
            AND child_content.deleted_at IS NULL),
        (SELECT count(*)::int FROM ${questionAnswer} child
          INNER JOIN ${contentItem} child_content ON child_content.id = child.id
          WHERE child.store_id = ${this.storeId}
            AND child.question_id = ${contentId}
            AND child.is_accepted = true
            AND child_content.status = 'PUBLISHED'
            AND child_content.deleted_at IS NULL),
        (SELECT max(child_content.created_at) FROM ${contentItem} child_content
          WHERE child_content.store_id = ${this.storeId}
            AND child_content.deleted_at IS NULL
            AND child_content.status = 'PUBLISHED'
            AND child_content.id IN (
              SELECT child.id FROM ${reviewReply} child WHERE child.review_id = ${contentId}
              UNION ALL
              SELECT child.id FROM ${questionAnswer} child WHERE child.question_id = ${contentId}
            )),
        now()
      ON CONFLICT (${contentMetrics.contentId}) DO UPDATE SET
        like_count = EXCLUDED.like_count,
        dislike_count = EXCLUDED.dislike_count,
        report_count = EXCLUDED.report_count,
        open_report_count = EXCLUDED.open_report_count,
        media_count = EXCLUDED.media_count,
        child_count = EXCLUDED.child_count,
        official_child_count = EXCLUDED.official_child_count,
        accepted_child_count = EXCLUDED.accepted_child_count,
        last_child_at = EXCLUDED.last_child_at,
        updated_at = EXCLUDED.updated_at
    `);
  }
}
