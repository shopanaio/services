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
import { CollectionCreateScript } from "./scripts/index.js";
import type { CollectionResult } from "./dto/CollectionScriptDto.js";
import { TransactionalStep } from "../CatalogTransactionalStep.js";
import type {
  CollectionCreateWorkflowInput,
  CollectionCreateWorkflowResult,
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
export class CollectionCreateWorkflow extends CollectionWorkflowBase<
  CollectionCreateWorkflowInput,
  CollectionCreateWorkflowResult
> {
  constructor(@InjectBroker("catalog") broker: ServiceBroker, kernel: Kernel) {
    super(broker, kernel);
  }

  @Workflow("collectionCreate")
  @Policy<CollectionCreateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: CollectionCreateWorkflowInput): Promise<CollectionCreateWorkflowResult> {
    const context = this.scriptContext(input.context);
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.create(input, context);
      if (!result.collection?.id || result.userErrors.length > 0) {
        return { collection: null, userErrors: result.userErrors };
      }
      await this.emitCreated(input, result.collection.id);
      return { collection: { id: result.collection.id }, userErrors: [] };
    });
  }

  @TransactionalStep()
  private create(
    input: CollectionCreateWorkflowInput,
    context: RunScriptContext,
  ): Promise<CollectionResult> {
    return this.kernel.runScript(CollectionCreateScript, input.params, context);
  }

  @ChildWorkflowStep()
  private emitCreated(input: CollectionCreateWorkflowInput, collectionId: string): Promise<void> {
    return this.emitLifecycle(input.context, collectionId, "CREATE", "collectionCreate", [
      lifecycleAudit("collectionCreate", "CREATE", collectionId),
    ]);
  }

  private async emitLifecycle(
    context: CollectionWorkflowContext,
    collectionId: string,
    action: "CREATE",
    command: string,
    operations: readonly CollectionAuditOperation[],
  ): Promise<void> {
    await emitCollectionLifecycle(this.broker, context, collectionId, action, command, operations);
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
