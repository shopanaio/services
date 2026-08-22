import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  InjectBroker,
  Policy,
  ServiceBroker,
  type WorkflowExecutionContext,
  DBOS,
} from "@shopana/shared-kernel";
import { Kernel } from "../../kernel/Kernel.js";
import type { RunScriptContext } from "../../kernel/types.js";
import type {
  ProductBulkEditInput,
  ProductBulkEditResult,
  ProductBulkUpdateItem,
  BulkEditError,
} from "./dto/BulkEditWorkflowDto.js";
import type { BulkEditItem } from "../../repositories/models/index.js";
import type { ProductUpdateWorkflowResult } from "../product-update/dto/ProductUpdateWorkflowDto.js";
import {
  BulkEditClaimItemsScript,
  BulkEditCreateJobScript,
  BulkEditFinalizeJobScript,
  BulkEditStateScript,
} from "./scripts/index.js";
import {
  buildProductUpdateQueuePartitionKey,
  CATALOG_AGGREGATE_MUTATIONS_QUEUE,
} from "../productUpdateWorkflowQueue.js";
import { TransactionalStep } from "../CatalogTransactionalStep.js";

interface ProductGroup {
  productId: string;
  items: BulkEditItem[];
}

@Injectable()
export class ProductBulkEditWorkflow extends BrokerWorkflows {
  constructor(
    @InjectBroker("catalog") broker: ServiceBroker,
    private readonly kernel: Kernel,
  ) {
    super(broker);
  }

  get transactionKernel(): Kernel {
    return this.kernel;
  }

  @Workflow("productBulkEdit")
  @Policy<ProductBulkEditInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: ProductBulkEditInput,
    workflowContext?: WorkflowExecutionContext,
  ): Promise<ProductBulkEditResult> {
    if (!workflowContext) {
      throw new Error("Workflow authorization context is required");
    }
    const { products, context } = input;
    const scriptContext: RunScriptContext = { ...context };
    return this.kernel.runWithWorkflowContext(scriptContext, async () => {
      // 1. Create job with items grouped by product
      const { jobId, productGroups } = await this.stepCreateJob(products, scriptContext);

      // 2. Try QUEUED → RUNNING
      const started = await this.stepTryMarkJobRunning(jobId, scriptContext);
      if (!started) {
        await this.stepFinalizeJob(jobId, scriptContext);
        return { jobId };
      }

      // 3. Execute each product group
      for (const group of productGroups) {
        const cancelled = await this.stepIsJobCancelled(jobId, scriptContext);
        if (cancelled) break;

        await this.executeProductGroup(group, context, workflowContext, scriptContext);
      }

      await this.stepFinalizeJob(jobId, scriptContext);
      return { jobId };
    });
  }

  private async executeProductGroup(
    group: ProductGroup,
    context: ProductBulkEditInput["context"],
    workflowContext: WorkflowExecutionContext,
    scriptContext: RunScriptContext,
  ): Promise<void> {
    const { productId, items } = group;

    // 1. Claim only items that still own the current product fence.
    const claimedItemIds = new Set(
      await this.stepClaimItems(
        items.map((item) => item.id),
        scriptContext,
      ),
    );
    const claimedItems = items.filter((item) => claimedItemIds.has(item.id));
    if (claimedItems.length === 0) return;

    // 2. Build operations from items
    const operations = claimedItems.map((item) => item.params as any);

    // 3. Call ProductUpdateWorkflow
    try {
      const result = (await this.broker.runWorkflow(
        "catalog.productUpdate",
        {
          productId,
          operations,
          bulkFence: {
            jobId: claimedItems[0]!.jobId,
            fenceToken: claimedItems[0]!.fenceToken,
          },
          context,
        },
        {
          source: "workflow",
          workflowId: DBOS.workflowID!,
          stepId: "productUpdate",
          callId: productId,
        },
        {
          workflowContext,
          queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
          enqueueOptions: {
            queuePartitionKey: buildProductUpdateQueuePartitionKey({
              storeId: context.storeId,
              productId,
            }),
          },
        },
      )) as ProductUpdateWorkflowResult;

      // 4. Map results back to items
      await this.mapResultsToItems(claimedItems, result, scriptContext);
    } catch (error) {
      // Mark all items as failed
      const errorObj: BulkEditError = {
        message: error instanceof Error ? error.message : "Unknown error",
        code: "WORKFLOW_ERROR",
      };
      await Promise.all(
        claimedItems.map((item) => this.stepTryMarkItemFailed(item.id, [errorObj], scriptContext)),
      );
    }
  }

  private async mapResultsToItems(
    items: BulkEditItem[],
    result: ProductUpdateWorkflowResult,
    scriptContext: RunScriptContext,
  ): Promise<void> {
    if (result.operationResults.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const opResult = result.operationResults[i];

        if (!opResult) {
          await this.stepTryMarkItemFailed(
            item.id,
            [
              {
                message: "Missing operation result",
                code: "MISSING_OPERATION_RESULT",
              },
            ],
            scriptContext,
          );
          continue;
        }

        if (opResult.applied) {
          await this.stepTryMarkItemSucceeded(item.id, scriptContext);
        } else {
          await this.stepTryMarkItemFailed(
            item.id,
            opResult.errors.map(toBulkEditError),
            scriptContext,
          );
        }
      }
      return;
    }

    // If a workflow-level error occurs without per-operation results
    if (result.product === null && result.userErrors.length > 0) {
      const errors: BulkEditError[] = result.userErrors.map(toBulkEditError);
      await Promise.all(
        items.map((item) => this.stepTryMarkItemFailed(item.id, errors, scriptContext)),
      );
      return;
    }
  }

  @TransactionalStep()
  private async stepCreateJob(
    products: ProductBulkUpdateItem[],
    context: RunScriptContext,
  ): Promise<{ jobId: string; productGroups: ProductGroup[] }> {
    const result = await this.kernel.runScript(BulkEditCreateJobScript, { products }, context);

    if (result.userErrors.length > 0 || !result.jobId || !result.items) {
      throw new Error(result.userErrors[0]?.message ?? "Failed to create job");
    }

    // Group items by productId
    const productGroups = groupItemsByProduct(result.items);

    return {
      jobId: result.jobId,
      productGroups,
    };
  }

  @TransactionalStep()
  private async stepTryMarkJobRunning(jobId: string, context: RunScriptContext): Promise<boolean> {
    const result = await this.kernel.runScript(
      BulkEditStateScript,
      { type: "jobTryMarkRunning", jobId },
      context,
    );
    return result.value;
  }

  @TransactionalStep()
  private async stepIsJobCancelled(jobId: string, context: RunScriptContext): Promise<boolean> {
    const result = await this.kernel.runScript(
      BulkEditStateScript,
      { type: "jobIsCancelled", jobId },
      context,
    );
    return result.value;
  }

  @TransactionalStep()
  private async stepClaimItems(
    itemIds: readonly string[],
    context: RunScriptContext,
  ): Promise<readonly string[]> {
    const result = await this.kernel.runScript(BulkEditClaimItemsScript, { itemIds }, context);
    return result.claimedItemIds;
  }

  @TransactionalStep()
  private async stepTryMarkItemSucceeded(itemId: string, context: RunScriptContext): Promise<void> {
    await this.kernel.runScript(
      BulkEditStateScript,
      { type: "itemTryMarkSucceeded", itemId },
      context,
    );
  }

  @TransactionalStep()
  private async stepTryMarkItemFailed(
    itemId: string,
    errors: BulkEditError[],
    context: RunScriptContext,
  ): Promise<void> {
    await this.kernel.runScript(
      BulkEditStateScript,
      { type: "itemTryMarkFailed", itemId, errors },
      context,
    );
  }

  @TransactionalStep()
  private async stepFinalizeJob(jobId: string, context: RunScriptContext): Promise<void> {
    const result = await this.kernel.runScript(BulkEditFinalizeJobScript, { jobId }, context);
    if (!result.success) {
      throw new Error(result.userErrors[0]?.message ?? "Failed to finalize bulk edit job");
    }
  }
}

function groupItemsByProduct(items: BulkEditItem[]): ProductGroup[] {
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
      items: groupItems,
    });
  }

  // Sort groups by first item's chunkIndex
  groups.sort((a, b) => (a.items[0]?.chunkIndex ?? 0) - (b.items[0]?.chunkIndex ?? 0));

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
