import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  ChildWorkflowStep,
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
} from "@shopana/shared-kernel";
import { Kernel } from "../../kernel/Kernel.js";
import type { RunScriptContext } from "../../kernel/types.js";
import type { ProductDeleteResult } from "./dto/ProductDeleteDto.js";
import type { BackRefNotifyInput, EntityDeletedNotifyInput } from "../../sagas/index.js";
import { TransactionalStep } from "../CatalogTransactionalStep.js";
import { ProductDeleteScript } from "./scripts/index.js";
import type { ProductDeleteWorkflowInput } from "./dto/ProductDeleteWorkflowInput.js";

@Injectable()
export class ProductDeleteWorkflow extends BrokerWorkflows<
  ProductDeleteWorkflowInput,
  ProductDeleteResult
> {
  constructor(
    @InjectBroker("catalog") broker: ServiceBroker,
    private readonly kernel: Kernel,
  ) {
    super(broker);
  }
  get transactionKernel(): Kernel {
    return this.kernel;
  }

  @Workflow("productDelete")
  @Policy<ProductDeleteWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: ProductDeleteWorkflowInput): Promise<ProductDeleteResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.deleteProduct(input, context);
      if (!result.deletedProductId || result.userErrors.length > 0) return result;
      await this.emitProductDeleted(input, result);
      await this.syncDeletedMedia(input);
      return result;
    });
  }

  @TransactionalStep()
  private deleteProduct(
    input: ProductDeleteWorkflowInput,
    context: RunScriptContext,
  ): Promise<ProductDeleteResult> {
    return this.kernel.runScript(
      ProductDeleteScript,
      { id: input.productId, permanent: input.permanent },
      context,
    );
  }

  @ChildWorkflowStep()
  private async emitProductDeleted(
    input: ProductDeleteWorkflowInput,
    result: ProductDeleteResult,
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "productDeleted",
        payload: {
          productId: input.productId,
          storeId: input.context.storeId,
          categoryIds: [...new Set(result.categoryIds ?? [])],
          deletedAt: result.deletedAt,
          entityType: "product",
          audit: productDeleteAudit(input.productId, input.context.storeId),
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "product", id: input.productId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `product:${input.productId}:deleted`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitProductDeleted",
        callId: input.productId,
        organizationId: input.context.organizationId,
      },
    );
  }

  @ChildWorkflowStep()
  private async syncDeletedMedia(input: ProductDeleteWorkflowInput): Promise<void> {
    if (input.permanent) {
      await this.broker.runSaga<unknown, EntityDeletedNotifyInput>(
        "catalog.entityDeletedNotify",
        { entityRef: { service: "catalog", entityType: "product", entityId: input.productId } },
        {
          source: "workflow",
          workflowId: DBOS.workflowID!,
          stepId: "notifyProductDeleted",
          callId: input.productId,
          organizationId: input.context.organizationId,
        },
      );
      return;
    }
    await this.broker.runSaga<unknown, BackRefNotifyInput>(
      "catalog.backRefNotify",
      {
        entityRef: { service: "catalog", entityType: "product", entityId: input.productId },
        storeId: input.context.storeId,
        fileIds: [],
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "clearProductMediaBackRefs",
        callId: input.productId,
        organizationId: input.context.organizationId,
      },
    );
  }
}
function productDeleteAudit(productId: string, storeId: string) {
  return {
    kind: "aggregate-mutation" as const,
    schemaVersion: 1 as const,
    storeId,
    action: "DELETE" as const,
    command: "productDelete",
    aggregate: { type: "product", id: productId },
    operations: [
      {
        position: 0,
        type: "productDelete",
        action: "DELETE" as const,
        target: { type: "product", id: productId },
        changes: [],
      },
    ],
  };
}
