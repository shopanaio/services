import { and, eq, inArray, sql, ne } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { BaseRepository } from "./BaseRepository.js";
import { bulkEditItem, type BulkEditItem, type NewBulkEditItem } from "./models/bulkEditItems";
import { productBulkFence } from "./models/productBulkFence";

export const bulkEditItemRelayQuery = createRelayQuery(
  createQuery(bulkEditItem).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "bulkUpdateItem", tieBreaker: "id" },
);

export type BulkEditItemRelayInput = InferRelayInput<typeof bulkEditItemRelayQuery>;

export interface BulkEditItemCreateInput {
  id: string;
  jobId: string;
  productId: string;
  variantId: string | null;
  opType: string;
  opIndex: number;
  chunkIndex: number;
  params: unknown;
  fenceToken: string;
}

export interface BulkEditItemConnectionInput {
  jobId: string;
  first?: BulkEditItemRelayInput["first"] | null;
  after?: BulkEditItemRelayInput["after"] | null;
  last?: BulkEditItemRelayInput["last"] | null;
  before?: BulkEditItemRelayInput["before"] | null;
  where?: { status?: BulkEditItem["status"][] | null } | null;
}

export interface BulkEditItemConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface BulkEditJobProgressCounts {
  total: number;
  done: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  superseded: number;
  running: number;
  pending: number;
}

export function emptyProgressCounts(): BulkEditJobProgressCounts {
  return {
    total: 0,
    done: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0,
    superseded: 0,
    running: 0,
    pending: 0,
  };
}

function applyStatusCount(
  counts: BulkEditJobProgressCounts,
  status: BulkEditItem["status"],
  count: number,
): void {
  counts.total += count;

  switch (status) {
    case "SUCCEEDED":
      counts.succeeded += count;
      counts.done += count;
      break;
    case "FAILED":
      counts.failed += count;
      counts.done += count;
      break;
    case "CANCELLED":
      counts.cancelled += count;
      counts.done += count;
      break;
    case "SUPERSEDED":
      counts.superseded += count;
      counts.done += count;
      break;
    case "RUNNING":
      counts.running += count;
      break;
    case "PENDING":
      counts.pending += count;
      break;
  }
}

export class BulkEditItemRepository extends BaseRepository {
  async createMany(items: BulkEditItemCreateInput[]): Promise<void> {
    if (items.length === 0) return;
    await this.connection.insert(bulkEditItem).values(
      items.map(
        (item) =>
          ({
            ...item,
            storeId: this.storeId,
            status: "PENDING" as const,
            cancelRequested: false,
          }) satisfies NewBulkEditItem,
      ),
    );
  }

  async findById(itemId: string): Promise<BulkEditItem | null> {
    const [item] = await this.connection
      .select()
      .from(bulkEditItem)
      .where(and(eq(bulkEditItem.storeId, this.storeId), eq(bulkEditItem.id, itemId)));

    return item ?? null;
  }

  async getByIds(itemIds: readonly string[]): Promise<BulkEditItem[]> {
    if (itemIds.length === 0) return [];

    return this.connection
      .select()
      .from(bulkEditItem)
      .where(and(eq(bulkEditItem.storeId, this.storeId), inArray(bulkEditItem.id, [...itemIds])));
  }

  async findByJobId(jobId: string): Promise<BulkEditItem[]> {
    return this.connection
      .select()
      .from(bulkEditItem)
      .where(and(eq(bulkEditItem.storeId, this.storeId), eq(bulkEditItem.jobId, jobId)))
      .orderBy(bulkEditItem.chunkIndex, bulkEditItem.opIndex);
  }

  /**
   * Supersede active items for products in new job
   */
  async supersedeActiveItems(productIds: string[], newJobId: string): Promise<void> {
    if (productIds.length === 0) return;

    await this.connection
      .update(bulkEditItem)
      .set({
        status: "SUPERSEDED",
        cancelRequested: true,
        cancelReason: "SUPERSEDED",
        supersededByJobId: newJobId,
        finishedAt: sql`COALESCE(finished_at, NOW())`,
      })
      .where(
        and(
          eq(bulkEditItem.storeId, this.storeId),
          inArray(bulkEditItem.productId, productIds),
          inArray(bulkEditItem.status, ["PENDING", "RUNNING"]),
          ne(bulkEditItem.jobId, newJobId),
        ),
      );
  }

  /**
   * Guarded update: PENDING → RUNNING (only if not cancel_requested)
   */
  async tryMarkRunning(itemId: string): Promise<number> {
    const result = await this.connection
      .update(bulkEditItem)
      .set({
        status: "RUNNING",
        startedAt: sql`COALESCE(started_at, NOW())`,
      })
      .where(
        and(
          eq(bulkEditItem.storeId, this.storeId),
          eq(bulkEditItem.id, itemId),
          eq(bulkEditItem.status, "PENDING"),
          eq(bulkEditItem.cancelRequested, false),
          sql`EXISTS (
            SELECT 1
            FROM ${productBulkFence}
            WHERE ${productBulkFence.storeId} = ${bulkEditItem.storeId}
              AND ${productBulkFence.productId} = ${bulkEditItem.productId}
              AND ${productBulkFence.jobId} = ${bulkEditItem.jobId}
              AND ${productBulkFence.fenceToken} = ${bulkEditItem.fenceToken}
          )`,
        ),
      )
      .returning({ id: bulkEditItem.id });

    return result.length;
  }

  /**
   * Guarded update: RUNNING → SUCCEEDED
   */
  async tryMarkSucceeded(itemId: string): Promise<number> {
    const result = await this.connection
      .update(bulkEditItem)
      .set({
        status: "SUCCEEDED",
        finishedAt: sql`NOW()`,
        errors: null,
      })
      .where(
        and(
          eq(bulkEditItem.storeId, this.storeId),
          eq(bulkEditItem.id, itemId),
          eq(bulkEditItem.status, "RUNNING"),
        ),
      )
      .returning({ id: bulkEditItem.id });

    return result.length;
  }

  /**
   * Guarded update: RUNNING → FAILED
   */
  async tryMarkFailed(itemId: string, errors: unknown[]): Promise<number> {
    const result = await this.connection
      .update(bulkEditItem)
      .set({
        status: "FAILED",
        finishedAt: sql`NOW()`,
        errors,
      })
      .where(
        and(
          eq(bulkEditItem.storeId, this.storeId),
          eq(bulkEditItem.id, itemId),
          eq(bulkEditItem.status, "RUNNING"),
        ),
      )
      .returning({ id: bulkEditItem.id });

    return result.length;
  }

  /**
   * Finalize step 1: PENDING + cancel_requested → CANCELLED, reason=USER
   * Used for items explicitly cancelled by user
   */
  async cancelUserRequestedItems(jobId: string): Promise<void> {
    await this.connection
      .update(bulkEditItem)
      .set({
        status: "CANCELLED",
        cancelReason: "USER",
        finishedAt: sql`NOW()`,
      })
      .where(
        and(
          eq(bulkEditItem.storeId, this.storeId),
          eq(bulkEditItem.jobId, jobId),
          eq(bulkEditItem.status, "PENDING"),
          eq(bulkEditItem.cancelRequested, true),
        ),
      );
  }

  /**
   * Finalize step 2: remaining PENDING items → CANCELLED
   * Reason depends on job status
   */
  async cancelRemainingPendingItems(jobId: string, reason: "USER" | "SYSTEM"): Promise<void> {
    await this.connection
      .update(bulkEditItem)
      .set({
        status: "CANCELLED",
        cancelReason: reason,
        finishedAt: sql`NOW()`,
      })
      .where(
        and(
          eq(bulkEditItem.storeId, this.storeId),
          eq(bulkEditItem.jobId, jobId),
          eq(bulkEditItem.status, "PENDING"),
        ),
      );
  }

  /**
   * Count items by status for progress
   */
  async countByStatus(jobId: string): Promise<Record<string, number>> {
    const rows = await this.connection
      .select({
        status: bulkEditItem.status,
        count: sql<number>`count(*)::int`,
      })
      .from(bulkEditItem)
      .where(and(eq(bulkEditItem.storeId, this.storeId), eq(bulkEditItem.jobId, jobId)))
      .groupBy(bulkEditItem.status);

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result;
  }

  async countByStatusForJobs(
    jobIds: readonly string[],
  ): Promise<Map<string, BulkEditJobProgressCounts>> {
    const result = new Map<string, BulkEditJobProgressCounts>();
    if (jobIds.length === 0) return result;

    const rows = await this.connection
      .select({
        jobId: bulkEditItem.jobId,
        status: bulkEditItem.status,
        count: sql<number>`count(*)::int`,
      })
      .from(bulkEditItem)
      .where(and(eq(bulkEditItem.storeId, this.storeId), inArray(bulkEditItem.jobId, [...jobIds])))
      .groupBy(bulkEditItem.jobId, bulkEditItem.status);

    for (const row of rows) {
      const counts = result.get(row.jobId) ?? emptyProgressCounts();
      applyStatusCount(counts, row.status, row.count);
      result.set(row.jobId, counts);
    }

    return result;
  }

  async countDistinctProducts(jobId: string): Promise<number> {
    const [row] = await this.connection
      .select({
        count: sql<number>`count(distinct ${bulkEditItem.productId})::int`,
      })
      .from(bulkEditItem)
      .where(and(eq(bulkEditItem.storeId, this.storeId), eq(bulkEditItem.jobId, jobId)));

    return row?.count ?? 0;
  }

  async countDistinctProductsForJobs(jobIds: readonly string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (jobIds.length === 0) return result;

    const rows = await this.connection
      .select({
        jobId: bulkEditItem.jobId,
        count: sql<number>`count(distinct ${bulkEditItem.productId})::int`,
      })
      .from(bulkEditItem)
      .where(and(eq(bulkEditItem.storeId, this.storeId), inArray(bulkEditItem.jobId, [...jobIds])))
      .groupBy(bulkEditItem.jobId);

    for (const row of rows) {
      result.set(row.jobId, row.count);
    }

    return result;
  }

  async getConnection(input: BulkEditItemConnectionInput): Promise<BulkEditItemConnectionResult> {
    const statusFilter = input.where?.status;
    const where: BulkEditItemRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { jobId: { _eq: input.jobId } },
        ...(statusFilter ? [{ status: { _in: statusFilter } }] : []),
      ],
    };
    const executeInput: BulkEditItemRelayInput = {
      first: input.first ?? undefined,
      after: input.after ?? undefined,
      last: input.last ?? undefined,
      before: input.before ?? undefined,
      where,
      orderBy: [
        { field: "opIndex", direction: "asc" },
        { field: "id", direction: "asc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      bulkEditItemRelayQuery.execute(this.connection, executeInput),
      bulkEditItemRelayQuery.count(this.connection, { where }),
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
}

export type { BulkEditItem, NewBulkEditItem } from "./models/bulkEditItems";
