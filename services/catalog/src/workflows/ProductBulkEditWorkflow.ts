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
  ProductBulkUpdateItem,
  BulkEditError,
} from "./dto/BulkEditWorkflowDto.js";
import type { BulkEditItem } from "../repositories/models/index.js";
import type { ProductUpdateWorkflowResult } from "./dto/ProductUpdateWorkflowDto.js";
import {
  BulkEditCreateJobScript,
  BulkEditFinalizeJobScript,
} from "../scripts/bulk-edit/index.js";

interface ProductGroup {
  productId: string;
  expectedRevision?: number;
  items: BulkEditItem[];
}

@Injectable()
export class ProductBulkEditWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("productBulkEdit")
  async run(input: ProductBulkEditInput): Promise<ProductBulkEditResult> {
    const { products, context } = input;

    // 1. Create job with items grouped by product
    const { jobId, productGroups } = await this.stepCreateJob(products);

    // 2. Try QUEUED → RUNNING
    const started = await this.stepTryMarkJobRunning(jobId);
    if (!started) {
      await this.stepFinalizeJob(jobId);
      return { jobId };
    }

    // 3. Execute each product group
    for (const group of productGroups) {
      const cancelled = await this.stepIsJobCancelled(jobId);
      if (cancelled) break;

      await this.executeProductGroup(group, context);
    }

    await this.stepFinalizeJob(jobId);
    return { jobId };
  }

  private async executeProductGroup(
    group: ProductGroup,
    context: ProductBulkEditInput["context"]
  ): Promise<void> {
    const { productId, expectedRevision, items } = group;

    // 1. Mark all items as RUNNING
    await Promise.all(
      items.map((item) => this.stepTryMarkItemRunning(item.id))
    );

    // 2. Build operations from items
    const operations = items.map((item) => item.params as any);

    // 3. Call ProductUpdateWorkflow
    try {
      const result = (await this.broker.runWorkflow(
        "catalog.productUpdate",
        {
          productId,
          expectedRevision,
          operations,
          context,
        },
        {
          source: "workflow",
          workflowId: DBOS.workflowID!,
          stepId: "productUpdate",
          callId: productId,
        }
      )) as ProductUpdateWorkflowResult;

      // 4. Map results back to items
      await this.mapResultsToItems(items, result);
    } catch (error) {
      // Mark all items as failed
      const errorObj: BulkEditError = {
        message: error instanceof Error ? error.message : "Unknown error",
        code: "WORKFLOW_ERROR",
      };
      await Promise.all(
        items.map((item) => this.stepTryMarkItemFailed(item.id, [errorObj]))
      );
    }
  }

  private async mapResultsToItems(
    items: BulkEditItem[],
    result: ProductUpdateWorkflowResult
  ): Promise<void> {
    if (result.operationResults.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const opResult = result.operationResults[i];

        if (!opResult) {
          await this.stepTryMarkItemFailed(item.id, [
            {
              message: "Missing operation result",
              code: "MISSING_OPERATION_RESULT",
            },
          ]);
          continue;
        }

        if (opResult.applied) {
          await this.stepTryMarkItemSucceeded(item.id);
        } else {
          await this.stepTryMarkItemFailed(
            item.id,
            opResult.errors.map(toBulkEditError)
          );
        }
      }
      return;
    }

    // If workflow-level error without per-operation results (e.g., revision conflict)
    if (result.product === null && result.userErrors.length > 0) {
      const errors: BulkEditError[] = result.userErrors.map(toBulkEditError);
      await Promise.all(
        items.map((item) => this.stepTryMarkItemFailed(item.id, errors))
      );
      return;
    }
  }

  @WorkflowStep()
  private async stepCreateJob(
    products: ProductBulkUpdateItem[]
  ): Promise<{ jobId: string; productGroups: ProductGroup[] }> {
    const result = await this.kernel.runScript(BulkEditCreateJobScript, {
      products,
    });

    if (result.userErrors.length > 0 || !result.jobId || !result.items) {
      throw new Error(result.userErrors[0]?.message ?? "Failed to create job");
    }

    // Group items by productId
    const productGroups = groupItemsByProduct(result.items, products);

    return {
      jobId: result.jobId,
      productGroups,
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

function groupItemsByProduct(
  items: BulkEditItem[],
  originalProducts: ProductBulkUpdateItem[]
): ProductGroup[] {
  // Create lookup for expectedRevision by productId
  const revisionLookup = new Map(
    originalProducts.map((p) => [p.productId, p.expectedRevision])
  );

  // Group items by productId
  const groupMap = new Map<string, BulkEditItem[]>();
  for (const item of items) {
    const existing = groupMap.get(item.productId) ?? [];
    existing.push(item);
    groupMap.set(item.productId, existing);
  }

  // Convert to ProductGroup array, sorted by chunkIndex
  const groups: ProductGroup[] = [];
  for (const [productId, groupItems] of groupMap) {
    // Sort items by opIndex within group
    groupItems.sort((a, b) => a.opIndex - b.opIndex);
    groups.push({
      productId,
      expectedRevision: revisionLookup.get(productId),
      items: groupItems,
    });
  }

  // Sort groups by first item's chunkIndex
  groups.sort(
    (a, b) => (a.items[0]?.chunkIndex ?? 0) - (b.items[0]?.chunkIndex ?? 0)
  );

  return groups;
}

function toBulkEditError(error: {
  message: string;
  code?: string;
  field?: string[];
}): BulkEditError {
  return {
    message: error.message,
    code: error.code ?? "UNKNOWN",
    field: error.field,
  };
}
