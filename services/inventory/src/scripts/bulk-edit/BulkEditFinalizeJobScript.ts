import { BaseScript, type UserError } from "../../kernel/BaseScript.js";

export interface BulkEditFinalizeJobParams {
  readonly jobId: string;
}

export interface BulkEditFinalizeJobResult {
  success: boolean;
  userErrors: UserError[];
}

export class BulkEditFinalizeJobScript extends BaseScript<
  BulkEditFinalizeJobParams,
  BulkEditFinalizeJobResult
> {
  protected async execute(
    params: BulkEditFinalizeJobParams
  ): Promise<BulkEditFinalizeJobResult> {
    const { jobId } = params;

    const job = await this.repository.bulkEditJob.findById(jobId);
    if (!job) {
      return {
        success: false,
        userErrors: [{ message: "Job not found", code: "NOT_FOUND" }],
      };
    }

    const isCancelled = job.status === "CANCELLED";

    // Step 1: PENDING + cancel_requested=true → CANCELLED, reason=USER
    await this.repository.bulkEditItem.cancelUserRequestedItems(jobId);

    // Step 2: Remaining PENDING → CANCELLED
    await this.repository.bulkEditItem.cancelRemainingPendingItems(
      jobId,
      isCancelled ? "USER" : "SYSTEM"
    );

    // Step 3: Finalize job status
    await this.repository.bulkEditJob.finalize(
      jobId,
      isCancelled ? "CANCELLED" : "COMPLETED"
    );

    this.logger.info(
      { jobId, status: isCancelled ? "CANCELLED" : "COMPLETED" },
      "Bulk edit job finalized"
    );

    return { success: true, userErrors: [] };
  }

  protected handleError(_error: unknown): BulkEditFinalizeJobResult {
    return {
      success: false,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
