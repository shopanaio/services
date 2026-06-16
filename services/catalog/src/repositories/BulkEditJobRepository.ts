import { and, eq, inArray, sql } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import {
  bulkEditJob,
  type BulkEditJob,
  type NewBulkEditJob,
} from "./models/bulkEditJobs";

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
