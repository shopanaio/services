import { and, eq, inArray, sql } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { BaseRepository } from "./BaseRepository.js";
import {
  bulkEditJob,
  type BulkEditJob,
  type NewBulkEditJob,
} from "./models/bulkEditJobs";

export const bulkEditJobRelayQuery = createRelayQuery(
  createQuery(bulkEditJob).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "productBulkUpdateJob", tieBreaker: "id" }
);

export type BulkEditJobRelayInput = InferRelayInput<typeof bulkEditJobRelayQuery>;

export interface BulkEditJobConnectionInput {
  first?: BulkEditJobRelayInput["first"] | null;
  after?: BulkEditJobRelayInput["after"] | null;
  statusFilter?: BulkEditJob["status"][] | null;
}

export interface BulkEditJobConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class BulkEditJobRepository extends BaseRepository {
  async create(data: { id: string }): Promise<BulkEditJob> {
    const [job] = await this.connection
      .insert(bulkEditJob)
      .values({
        id: data.id,
        projectId: this.storeId,
        status: "QUEUED",
      } satisfies NewBulkEditJob)
      .returning();

    return job;
  }

  async findById(id: string): Promise<BulkEditJob | null> {
    const [job] = await this.connection
      .select()
      .from(bulkEditJob)
      .where(
        and(eq(bulkEditJob.projectId, this.storeId), eq(bulkEditJob.id, id))
      );

    return job ?? null;
  }

  async getConnection(
    input: BulkEditJobConnectionInput
  ): Promise<BulkEditJobConnectionResult> {
    const statusFilter: NonNullable<BulkEditJobConnectionInput["statusFilter"]> =
      input.statusFilter && input.statusFilter.length > 0
        ? input.statusFilter
        : ["QUEUED", "RUNNING"];

    const where: BulkEditJobRelayInput["where"] = {
      _and: [
        { projectId: { _eq: this.storeId } },
        { status: { _in: statusFilter } },
      ],
    };

    const executeInput: BulkEditJobRelayInput = {
      first: input.first ?? undefined,
      after: input.after ?? undefined,
      where,
      orderBy: [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      bulkEditJobRelayQuery.execute(this.connection, executeInput),
      bulkEditJobRelayQuery.count(this.connection, { where }),
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

  async getByIds(jobIds: readonly string[]): Promise<BulkEditJob[]> {
    if (jobIds.length === 0) return [];

    return this.connection
      .select()
      .from(bulkEditJob)
      .where(
        and(
          eq(bulkEditJob.projectId, this.storeId),
          inArray(bulkEditJob.id, [...jobIds])
        )
      );
  }

  /**
   * Guarded update: QUEUED → RUNNING
   * Returns rows affected (0 = already CANCELLED)
   */
  async tryMarkRunning(jobId: string): Promise<number> {
    const result = await this.connection
      .update(bulkEditJob)
      .set({
        status: "RUNNING",
        startedAt: sql`NOW()`,
      })
      .where(
        and(
          eq(bulkEditJob.projectId, this.storeId),
          eq(bulkEditJob.id, jobId),
          eq(bulkEditJob.status, "QUEUED")
        )
      )
      .returning({ id: bulkEditJob.id });

    return result.length;
  }

  async markCancelled(jobId: string): Promise<number> {
    const result = await this.connection
      .update(bulkEditJob)
      .set({ status: "CANCELLED" })
      .where(
        and(
          eq(bulkEditJob.projectId, this.storeId),
          eq(bulkEditJob.id, jobId),
          inArray(bulkEditJob.status, ["QUEUED", "RUNNING"])
        )
      )
      .returning({ id: bulkEditJob.id });

    return result.length;
  }

  async finalize(jobId: string, status: "COMPLETED" | "CANCELLED"): Promise<void> {
    await this.connection
      .update(bulkEditJob)
      .set({
        status,
        finishedAt: sql`NOW()`,
      })
      .where(
        and(eq(bulkEditJob.projectId, this.storeId), eq(bulkEditJob.id, jobId))
      );
  }
}

export type { BulkEditJob, NewBulkEditJob } from "./models/bulkEditJobs";
