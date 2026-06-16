import { sql } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import { productBulkFence, type NewProductBulkFence } from "./models/productBulkFence";

export class BulkFenceRepository extends BaseRepository {
  /**
   * Upsert fence for product (sorted by productId to prevent deadlocks)
   */
  async upsertFences(
    fences: Array<{ productId: string; fenceToken: string; jobId: string }>
  ): Promise<void> {
    if (fences.length === 0) return;

    const sorted = [...fences].sort((a, b) =>
      a.productId.localeCompare(b.productId)
    );

    for (const fence of sorted) {
      await this.connection
        .insert(productBulkFence)
        .values({
          projectId: this.storeId,
          productId: fence.productId,
          fenceToken: fence.fenceToken,
          jobId: fence.jobId,
        } satisfies NewProductBulkFence)
        .onConflictDoUpdate({
          target: [productBulkFence.projectId, productBulkFence.productId],
          set: {
            fenceToken: fence.fenceToken,
            jobId: fence.jobId,
            updatedAt: sql`NOW()`,
          },
        });
    }
  }
}
