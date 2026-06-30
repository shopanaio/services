import { and, eq, inArray, sql, ne, or, gt } from "drizzle-orm";
import type { PageInfo } from "@shopana/drizzle-query";
import { BaseRepository } from "./BaseRepository.js";
import {
  bulkEditItem,
  type BulkEditItem,
  type NewBulkEditItem,
} from "./models/bulkEditItems";

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
  first?: number | null;
  after?: string | null;
  statusFilter?: Array<
    "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "SUPERSEDED"
  > | null;
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

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class BulkEditItemRepository extends BaseRepository {
  async createMany(items: BulkEditItemCreateInput[]): Promise<void> {
    if (items.length === 0) return;
    await this.connection.insert(bulkEditItem).values(
      items.map(
        (item) =>
          ({
            ...item,
            projectId: this.storeId,
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
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.id, itemId),
        ),
      );

    return item ?? null;
  }

  async getByIds(itemIds: readonly string[]): Promise<BulkEditItem[]> {
    if (itemIds.length === 0) return [];

    return this.connection
      .select()
      .from(bulkEditItem)
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          inArray(bulkEditItem.id, [...itemIds]),
        ),
      );
  }

  async findByJobId(jobId: string): Promise<BulkEditItem[]> {
    return this.connection
      .select()
      .from(bulkEditItem)
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.jobId, jobId),
        ),
      )
      .orderBy(bulkEditItem.chunkIndex, bulkEditItem.opIndex);
  }

  /**
   * Supersede active items for products in new job
   */
  async supersedeActiveItems(
    productIds: string[],
    newJobId: string,
  ): Promise<void> {
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
          eq(bulkEditItem.projectId, this.storeId),
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
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.id, itemId),
          eq(bulkEditItem.status, "PENDING"),
          eq(bulkEditItem.cancelRequested, false),
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
          eq(bulkEditItem.projectId, this.storeId),
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
          eq(bulkEditItem.projectId, this.storeId),
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
          eq(bulkEditItem.projectId, this.storeId),
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
  async cancelRemainingPendingItems(
    jobId: string,
    reason: "USER" | "SYSTEM",
  ): Promise<void> {
    await this.connection
      .update(bulkEditItem)
      .set({
        status: "CANCELLED",
        cancelReason: reason,
        finishedAt: sql`NOW()`,
      })
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
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
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.jobId, jobId),
        ),
      )
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
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          inArray(bulkEditItem.jobId, [...jobIds]),
        ),
      )
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
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.jobId, jobId),
        ),
      );

    return row?.count ?? 0;
  }

  async countDistinctProductsForJobs(
    jobIds: readonly string[],
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (jobIds.length === 0) return result;

    const rows = await this.connection
      .select({
        jobId: bulkEditItem.jobId,
        count: sql<number>`count(distinct ${bulkEditItem.productId})::int`,
      })
      .from(bulkEditItem)
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          inArray(bulkEditItem.jobId, [...jobIds]),
        ),
      )
      .groupBy(bulkEditItem.jobId);

    for (const row of rows) {
      result.set(row.jobId, row.count);
    }

    return result;
  }

  async getConnection(
    input: BulkEditItemConnectionInput,
  ): Promise<BulkEditItemConnectionResult> {
    const limit = Math.min(
      Math.max(input.first ?? DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );

    const baseFilters = [
      eq(bulkEditItem.projectId, this.storeId),
      eq(bulkEditItem.jobId, input.jobId),
    ];

    if (input.statusFilter && input.statusFilter.length > 0) {
      baseFilters.push(inArray(bulkEditItem.status, input.statusFilter));
    }

    const cursor = decodeCursor(input.after ?? undefined);
    const cursorCondition = cursor
      ? or(
          gt(bulkEditItem.opIndex, cursor.opIndex),
          and(
            eq(bulkEditItem.opIndex, cursor.opIndex),
            gt(bulkEditItem.id, cursor.id),
          ),
        )
      : null;
    const filters = cursorCondition
      ? [...baseFilters, cursorCondition]
      : baseFilters;

    const rows = await this.connection
      .select({ id: bulkEditItem.id, opIndex: bulkEditItem.opIndex })
      .from(bulkEditItem)
      .where(and(...filters))
      .orderBy(bulkEditItem.opIndex, bulkEditItem.id)
      .limit(limit + 1);

    const hasNextPage = rows.length > limit;
    const slice = hasNextPage ? rows.slice(0, limit) : rows;

    const edges = slice.map((row) => ({
      cursor: encodeCursor(row.opIndex, row.id),
      nodeId: row.id,
    }));

    const pageInfo: PageInfo = {
      hasNextPage,
      hasPreviousPage: Boolean(input.after),
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    };

    const [totalRow] = await this.connection
      .select({ count: sql<number>`count(*)::int` })
      .from(bulkEditItem)
      .where(and(...baseFilters));

    return {
      edges,
      pageInfo,
      totalCount: totalRow?.count ?? 0,
    };
  }
}

export type { BulkEditItem, NewBulkEditItem } from "./models/bulkEditItems";

function encodeCursor(opIndex: number, id: string): string {
  return Buffer.from(`${opIndex}:${id}`).toString("base64");
}

function decodeCursor(cursor?: string): { opIndex: number; id: string } | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf8");
    const [opIndexStr, id] = decoded.split(":");
    const opIndex = Number(opIndexStr);
    if (!id || Number.isNaN(opIndex)) return null;
    return { opIndex, id };
  } catch {
    return null;
  }
}
