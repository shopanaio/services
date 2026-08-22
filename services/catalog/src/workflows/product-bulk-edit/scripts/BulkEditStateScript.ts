import { BaseScript, Transactional } from "../../../kernel/BaseScript.js";
import type { BulkEditError } from "../dto/BulkEditWorkflowDto.js";

export type BulkEditStateParams =
  | { readonly type: "jobTryMarkRunning"; readonly jobId: string }
  | { readonly type: "jobIsCancelled"; readonly jobId: string }
  | { readonly type: "itemTryMarkSucceeded"; readonly itemId: string }
  | {
      readonly type: "itemTryMarkFailed";
      readonly itemId: string;
      readonly errors: readonly BulkEditError[];
    };

export interface BulkEditStateResult {
  readonly value: boolean;
}

export class BulkEditStateScript extends BaseScript<BulkEditStateParams, BulkEditStateResult> {
  @Transactional()
  protected async execute(params: BulkEditStateParams): Promise<BulkEditStateResult> {
    switch (params.type) {
      case "jobTryMarkRunning":
        return { value: (await this.repository.bulkEditJob.tryMarkRunning(params.jobId)) > 0 };
      case "jobIsCancelled": {
        const job = await this.repository.bulkEditJob.findById(params.jobId);
        return { value: job?.status === "CANCELLED" };
      }
      case "itemTryMarkSucceeded":
        return { value: (await this.repository.bulkEditItem.tryMarkSucceeded(params.itemId)) > 0 };
      case "itemTryMarkFailed":
        return {
          value:
            (await this.repository.bulkEditItem.tryMarkFailed(params.itemId, [...params.errors])) >
            0,
        };
    }
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
