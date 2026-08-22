import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  ChildWorkflowStep,
  DBOS,
  InjectBroker,
  ServiceBroker,
  Workflow,
  type ContextualWorkflowInput,
} from "@shopana/shared-kernel";
import { Kernel } from "../../kernel/Kernel.js";
import type { RunScriptContext } from "../../kernel/types.js";
import { TransactionalStep } from "../CatalogTransactionalStep.js";
import {
  CollectionProductSyncPageScript,
  type CollectionProductSyncPageResult,
} from "./scripts/index.js";
import type { CollectionProductSyncWorkflowInput, CollectionWorkflowContext } from "./dto/index.js";
abstract class CollectionWorkflowBase<
  TInput extends ContextualWorkflowInput,
  TOutput,
> extends BrokerWorkflows<TInput, TOutput> {
  protected constructor(
    broker: ServiceBroker,
    protected readonly kernel: Kernel,
  ) {
    super(broker);
  }

  get transactionKernel(): Kernel {
    return this.kernel;
  }

  protected scriptContext(context: CollectionWorkflowContext): RunScriptContext {
    return {
      storeId: context.storeId,
      organizationId: context.organizationId,
      requestId: context.requestId,
      userId: context.userId,
      locale: context.locale,
      defaultLocale: context.defaultLocale,
      defaultCurrency: context.defaultCurrency,
      locales: [...context.locales],
      currencies: [...context.currencies],
    };
  }
}

@Injectable()
export class CollectionProductSyncWorkflow extends CollectionWorkflowBase<
  CollectionProductSyncWorkflowInput,
  { operationId: string; emittedCount: number }
> {
  constructor(@InjectBroker("catalog") broker: ServiceBroker, kernel: Kernel) {
    super(broker, kernel);
  }

  @Workflow("collectionProductSync")
  async run(input: CollectionProductSyncWorkflowInput) {
    const context = this.scriptContext(input.context);
    return this.kernel.runWithWorkflowContext(context, async () => {
      let emittedCount = 0;
      while (true) {
        const page = await this.page(input, "next", undefined, context);
        if (page.productIds.length === 0) return { operationId: input.operationId, emittedCount };
        for (const productId of page.productIds) await this.emitProductUpdated(input, productId);
        await this.page(input, "mark", page.productIds, context);
        emittedCount += page.productIds.length;
      }
    });
  }

  @TransactionalStep()
  private page(
    input: CollectionProductSyncWorkflowInput,
    action: "next" | "mark",
    productIds: readonly string[] | undefined,
    context: RunScriptContext,
  ): Promise<CollectionProductSyncPageResult> {
    return this.kernel.runScript(
      CollectionProductSyncPageScript,
      action === "next"
        ? { action: "next", operationId: input.operationId }
        : { action: "mark", operationId: input.operationId, productIds: [...(productIds ?? [])] },
      context,
    );
  }

  @ChildWorkflowStep()
  private async emitProductUpdated(
    input: CollectionProductSyncWorkflowInput,
    productId: string,
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "productUpdated",
        payload: { productId, storeId: input.context.storeId, reasons: ["collection"] },
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "product", id: productId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `collection:${input.operationId}:product:${productId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitCollectionProductUpdated",
        callId: `${input.operationId}:${productId}`,
        organizationId: input.context.organizationId,
      },
    );
  }
}
