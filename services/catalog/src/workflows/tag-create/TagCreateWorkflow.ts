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
import { TagCreateScript } from "./scripts/index.js";
import type { TagCreateInput, TagCreateResult } from "./dto/index.js";

@Injectable()
export class TagCreateWorkflow extends BrokerWorkflows<TagCreateInput, TagCreateResult> {
  constructor(
    @InjectBroker("catalog") broker: ServiceBroker,
    private readonly kernel: Kernel,
  ) {
    super(broker);
  }
  get transactionKernel(): Kernel {
    return this.kernel;
  }

  @Workflow("tagCreate")
  @Policy<TagCreateInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: TagCreateInput): Promise<TagCreateResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.createTag(input, context);
      const entity = result.tag;
      if (!entity || result.userErrors.length > 0)
        return { tag: null, userErrors: result.userErrors };
      await this.emitTagCreated(input, entity.id);
      return { tag: { id: entity.id }, userErrors: [] };
    });
  }

  @TransactionalStep()
  private createTag(input: TagCreateInput, context: RunScriptContext) {
    return this.kernel.runScript(
      TagCreateScript,
      { handle: input.handle, name: input.name },
      context,
    );
  }

  @ChildWorkflowStep()
  private async emitTagCreated(input: TagCreateInput, tagId: string): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "tagCreated",
        payload: {
          storeId: input.context.storeId,
          tagId,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "CREATE",
            command: "tagCreate",
            aggregate: { type: "tag", id: tagId },
            operations: [
              {
                position: 0,
                type: "tagCreate",
                action: "CREATE",
                target: { type: "tag", id: tagId },
                changes: [],
              },
            ],
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "tag", id: tagId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `tag:${tagId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitTagCreated",
        callId: tagId,
        organizationId: input.context.organizationId,
      },
    );
  }
}
