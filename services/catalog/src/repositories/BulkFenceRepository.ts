import { and, eq, sql } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import { productBulkFence, type NewProductBulkFence } from "./models/productBulkFence";

export class BulkFenceRepository extends BaseRepository {
  async isCurrent(input: {
    productId: string;
    jobId: string;
    fenceToken: string;
  }): Promise<boolean> {
    const [row] = await this.connection
      .select({ productId: productBulkFence.productId })
      .from(productBulkFence)
      .where(
        and(
          eq(productBulkFence.storeId, this.storeId),
          eq(productBulkFence.productId, input.productId),
          eq(productBulkFence.jobId, input.jobId),
          eq(productBulkFence.fenceToken, input.fenceToken),
        ),
      )
      .limit(1);

    return row !== undefined;
  }

  /**
   * Locks the current fence row while the caller performs the protected write.
   * A newer job's upsert must wait for that write to commit, or replace the
   * fence before this check can succeed.
   */
  async isCurrentForUpdate(input: {
    productId: string;
    jobId: string;
    fenceToken: string;
  }): Promise<boolean> {
    const [row] = await this.connection
      .select({ productId: productBulkFence.productId })
      .from(productBulkFence)
      .where(
        and(
          eq(productBulkFence.storeId, this.storeId),
          eq(productBulkFence.productId, input.productId),
          eq(productBulkFence.jobId, input.jobId),
          eq(productBulkFence.fenceToken, input.fenceToken),
        ),
      )
      .limit(1)
      .for("update");

    return row !== undefined;
  }

  /**
   * Upsert fence for product (sorted by productId to prevent deadlocks)
   */
  async upsertFences(
    fences: Array<{ productId: string; fenceToken: string; jobId: string }>,
  ): Promise<void> {
    if (fences.length === 0) return;

    const sorted = [...fences].sort((a, b) => a.productId.localeCompare(b.productId));

    for (const fence of sorted) {
      await this.connection
        .insert(productBulkFence)
        .values({
          storeId: this.storeId,
          productId: fence.productId,
          fenceToken: fence.fenceToken,
          jobId: fence.jobId,
        } satisfies NewProductBulkFence)
        .onConflictDoUpdate({
          target: [productBulkFence.storeId, productBulkFence.productId],
          set: {
            fenceToken: fence.fenceToken,
            jobId: fence.jobId,
            updatedAt: sql`NOW()`,
          },
        });
    }
  }
}
