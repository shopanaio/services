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
import { TransactionalStep } from "../CatalogTransactionalStep.js";
import { TagDeleteScript } from "./scripts/index.js";
import type { TagDeleteInput, TagDeleteResult } from "./dto/index.js";

@Injectable()
export class TagDeleteWorkflow extends BrokerWorkflows<TagDeleteInput, TagDeleteResult> {
  constructor(
    @InjectBroker("catalog") broker: ServiceBroker,
    private readonly kernel: Kernel,
  ) {
    super(broker);
  }
  get transactionKernel(): Kernel {
    return this.kernel;
  }

  @Workflow("tagDelete")
  @Policy<TagDeleteInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: TagDeleteInput): Promise<TagDeleteResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.deleteTag(input, context);
      if (!result.deletedTagId || result.userErrors.length > 0)
        return { deletedTagId: null, userErrors: result.userErrors };
      await this.emitTagDeleted(input);
      await this.emitAffectedProducts(input, result.affectedProductIds);
      return { deletedTagId: result.deletedTagId, userErrors: [] };
    });
  }

  @TransactionalStep()
  private deleteTag(input: TagDeleteInput, context: RunScriptContext) {
    return this.kernel.runScript(TagDeleteScript, { id: input.tagId }, context);
  }

  @ChildWorkflowStep()
  private async emitTagDeleted(input: TagDeleteInput): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "tagDeleted",
        payload: {
          storeId: input.context.storeId,
          tagId: input.tagId,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "DELETE",
            command: "tagDelete",
            aggregate: { type: "tag", id: input.tagId },
            operations: [
              {
                position: 0,
                type: "tagDelete",
                action: "DELETE",
                target: { type: "tag", id: input.tagId },
                changes: [],
              },
            ],
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "tag", id: input.tagId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `tag:${input.tagId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitTagDeleted",
        callId: input.tagId,
        organizationId: input.context.organizationId,
      },
    );
  }

  @ChildWorkflowStep()
  private async emitAffectedProducts(
    input: TagDeleteInput,
    productIds: readonly string[],
  ): Promise<void> {
    for (const productId of new Set(productIds)) {
      await this.broker.runWorkflow(
        "events.emit",
        {
          eventType: "productUpdated",
          payload: { productId, storeId: input.context.storeId, reasons: ["tag"] },
          context: { organizationId: input.context.organizationId, userId: input.context.userId },
          subject: { type: "product", id: productId },
          actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
          emitKey: `product:${productId}`,
        },
        {
          source: "workflow",
          workflowId: DBOS.workflowID!,
          stepId: "emitDeletedTagProductUpdated",
          callId: productId,
          organizationId: input.context.organizationId,
        },
      );
    }
  }
}
