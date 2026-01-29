import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  WorkflowStep,
  InjectBroker,
  ServiceBroker,
  DBOS,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type {
  ProductBulkEditInput,
  ProductBulkEditResult,
  FlatOperation,
  BulkEditError,
} from "./dto/BulkEditWorkflowDto.js";
import type { BulkEditItem } from "../repositories/models/index.js";
import {
  BulkEditCreateJobScript,
  BulkEditFinalizeJobScript,
} from "../scripts/bulk-edit/index.js";

@Injectable()
export class ProductBulkEditWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("productBulkEdit")
  async run(input: ProductBulkEditInput): Promise<ProductBulkEditResult> {
    const { operations } = input;

    // 1. Create job (atomic, idempotent via DBOS)
    const { jobId, chunks } = await this.stepCreateJob(operations);

    // 2. Try QUEUED → RUNNING (guarded)
    const started = await this.stepTryMarkJobRunning(jobId);
    if (!started) {
      await this.stepFinalizeJob(jobId);
      return { jobId };
    }

    // 3. Execute chunks
    await this.executeChunks(jobId, chunks);
    await this.stepFinalizeJob(jobId);

    return { jobId };
  }

  private async executeChunks(jobId: string, chunks: BulkEditItem[][]): Promise<void> {
    for (const chunk of chunks) {
      const cancelled = await this.stepIsJobCancelled(jobId);
      if (cancelled) break;

      await Promise.allSettled(chunk.map((item) => this.executeItem(item)));
    }
  }

  private async executeItem(item: BulkEditItem): Promise<void> {
    // 1. Try PENDING → RUNNING (guarded)
    const started = await this.stepTryMarkItemRunning(item.id);
    if (!started) return;

    // 2. Run child workflow
    try {
      const result = await this.runOperationWorkflow(item);

      // 3. Record result (guarded — won't overwrite SUPERSEDED)
      if (result.errors.length > 0) {
        await this.stepTryMarkItemFailed(item.id, result.errors);
      } else {
        await this.stepTryMarkItemSucceeded(item.id);
      }
    } catch (error) {
      await this.stepTryMarkItemFailed(item.id, [
        {
          message: error instanceof Error ? error.message : "Unknown error",
          code: "WORKFLOW_ERROR",
        },
      ]);
    }
  }

  private async runOperationWorkflow(
    item: BulkEditItem
  ): Promise<{ errors: BulkEditError[] }> {
    const result = await this.broker.runWorkflow(
      "inventory.bulkEditOperation",
      { itemId: item.id },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: item.opType,
        callId: item.id,
      }
    );

    return result as { errors: BulkEditError[] };
  }

  @WorkflowStep()
  private async stepCreateJob(
    operations: FlatOperation[]
  ): Promise<{ jobId: string; chunks: BulkEditItem[][] }> {
    const result = await this.kernel.runScript(BulkEditCreateJobScript, {
      operations,
    });

    if (result.userErrors.length > 0 || !result.jobId || !result.items) {
      throw new Error(result.userErrors[0]?.message ?? "Failed to create job");
    }

    return {
      jobId: result.jobId,
      chunks: groupByChunkIndex(result.items),
    };
  }

  @WorkflowStep()
  private async stepTryMarkJobRunning(jobId: string): Promise<boolean> {
    const rows = await this.kernel.repository.bulkEditJob.tryMarkRunning(jobId);
    return rows > 0;
  }

  @WorkflowStep()
  private async stepIsJobCancelled(jobId: string): Promise<boolean> {
    const job = await this.kernel.repository.bulkEditJob.findById(jobId);
    return job?.status === "CANCELLED";
  }

  @WorkflowStep()
  private async stepTryMarkItemRunning(itemId: string): Promise<boolean> {
    const rows = await this.kernel.repository.bulkEditItem.tryMarkRunning(itemId);
    return rows > 0;
  }

  @WorkflowStep()
  private async stepTryMarkItemSucceeded(itemId: string): Promise<void> {
    await this.kernel.repository.bulkEditItem.tryMarkSucceeded(itemId);
  }

  @WorkflowStep()
  private async stepTryMarkItemFailed(
    itemId: string,
    errors: BulkEditError[]
  ): Promise<void> {
    await this.kernel.repository.bulkEditItem.tryMarkFailed(itemId, errors);
  }

  @WorkflowStep()
  private async stepFinalizeJob(jobId: string): Promise<void> {
    await this.kernel.runScript(BulkEditFinalizeJobScript, { jobId });
  }
}

function groupByChunkIndex(items: BulkEditItem[]): BulkEditItem[][] {
  const map = new Map<number, BulkEditItem[]>();
  for (const item of items) {
    const list = map.get(item.chunkIndex) ?? [];
    list.push(item);
    map.set(item.chunkIndex, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, chunkItems]) => chunkItems);
}
