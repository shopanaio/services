import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  ChildWorkflowStep,
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  type ContextualWorkflowInput,
} from "@shopana/shared-kernel";
import { Kernel } from "../../kernel/Kernel.js";
import type { RunScriptContext } from "../../kernel/types.js";
import { CollectionDeleteScript } from "./scripts/index.js";
import type { CollectionDeleteResult } from "./dto/CollectionScriptDto.js";
import { TransactionalStep } from "../CatalogTransactionalStep.js";
import type {
  CollectionDeleteWorkflowInput,
  CollectionDeleteWorkflowResult,
  CollectionWorkflowContext,
} from "./dto/index.js";
interface CollectionAuditOperation {
  readonly position: number;
  readonly type: string;
  readonly action: "CREATE" | "UPDATE" | "DELETE";
  readonly target: { readonly type: string; readonly id: string };
  readonly changes: readonly unknown[];
}
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
export class CollectionDeleteWorkflow extends CollectionWorkflowBase<
  CollectionDeleteWorkflowInput,
  CollectionDeleteWorkflowResult
> {
  constructor(@InjectBroker("catalog") broker: ServiceBroker, kernel: Kernel) {
    super(broker, kernel);
  }

  @Workflow("collectionDelete")
  @Policy<CollectionDeleteWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: CollectionDeleteWorkflowInput): Promise<CollectionDeleteWorkflowResult> {
    const context = this.scriptContext(input.context);
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.remove(input, context);
      if (!result.deletedCollectionId || result.userErrors.length > 0) {
        return { deletedCollectionId: null, userErrors: result.userErrors };
      }
      await this.emitDeleted(input, result);
      if (result.syncOperationId) {
        await this.startProductSync(input, result.syncOperationId);
      }
      return { deletedCollectionId: result.deletedCollectionId, userErrors: [] };
    });
  }

  @TransactionalStep()
  private remove(
    input: CollectionDeleteWorkflowInput,
    context: RunScriptContext,
  ): Promise<CollectionDeleteResult> {
    return this.kernel.runScript(CollectionDeleteScript, { id: input.collectionId }, context);
  }

  @ChildWorkflowStep()
  private emitDeleted(
    input: CollectionDeleteWorkflowInput,
    result: CollectionDeleteResult,
  ): Promise<void> {
    return emitCollectionLifecycle(
      this.broker,
      input.context,
      input.collectionId,
      "DELETE",
      "collectionDelete",
      [lifecycleAudit("collectionDelete", "DELETE", input.collectionId)],
      [],
      result.deletedAt,
    );
  }

  @ChildWorkflowStep()
  private async startProductSync(
    input: CollectionDeleteWorkflowInput,
    operationId: string,
  ): Promise<void> {
    await this.broker.startWorkflow(
      "catalog.collectionProductSync",
      { operationId, collectionId: input.collectionId, context: input.context },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "startCollectionProductSync",
        callId: operationId,
        organizationId: input.context.organizationId,
      },
      {
        queueName: "catalog_collection_product_sync",
        enqueueOptions: {
          queuePartitionKey: `${input.context.storeId}:collection:${input.collectionId}`,
        },
        timeoutMS: 600_000,
      },
    );
  }
}

function lifecycleAudit(
  type: string,
  action: "CREATE" | "DELETE",
  collectionId: string,
): CollectionAuditOperation {
  return {
    position: 0,
    type,
    action,
    target: { type: "collection", id: collectionId },
    changes: [],
  };
}

async function emitCollectionLifecycle(
  broker: ServiceBroker,
  context: CollectionWorkflowContext,
  collectionId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  command: string,
  operations: readonly CollectionAuditOperation[],
  reasons: readonly string[] = [],
  deletedAt?: string,
): Promise<void> {
  const suffix = action === "CREATE" ? "Created" : action === "UPDATE" ? "Updated" : "Deleted";
  await broker.runWorkflow(
    "events.emit",
    {
      eventType: `collection${suffix}`,
      payload: {
        storeId: context.storeId,
        collectionId,
        reasons: [...new Set(reasons)],
        ...(deletedAt ? { deletedAt } : {}),
        audit: {
          kind: "aggregate-mutation",
          schemaVersion: 1,
          storeId: context.storeId,
          action,
          command,
          aggregate: { type: "collection", id: collectionId },
          operations,
        },
      },
      context: { organizationId: context.organizationId, userId: context.userId },
      subject: { type: "collection", id: collectionId },
      actor: context.userId ? { type: "user", id: context.userId } : undefined,
      emitKey: `collection:${collectionId}`,
    },
    {
      source: "workflow",
      workflowId: DBOS.workflowID!,
      stepId: `emitCollection${suffix}`,
      callId: collectionId,
      organizationId: context.organizationId,
    },
  );
}
