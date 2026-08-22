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
import { ComparisonProfileCreateScript } from "./scripts/index.js";
import type { ComparisonProfileCreateInput, ComparisonProfileCreateResult } from "./dto/index.js";

@Injectable()
export class ComparisonProfileCreateWorkflow extends BrokerWorkflows<
  ComparisonProfileCreateInput,
  ComparisonProfileCreateResult
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

  @Workflow("comparisonProfileCreate")
  @Policy<ComparisonProfileCreateInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: ComparisonProfileCreateInput): Promise<ComparisonProfileCreateResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.createComparisonProfile(input, context);
      const entity = result.profile;
      if (!entity || result.userErrors.length > 0)
        return { profile: null, userErrors: result.userErrors };
      await this.emitComparisonProfileCreated(input, entity.id);
      return { profile: { id: entity.id }, userErrors: [] };
    });
  }

  @TransactionalStep()
  private createComparisonProfile(input: ComparisonProfileCreateInput, context: RunScriptContext) {
    return this.kernel.runScript(
      ComparisonProfileCreateScript,
      { input: input.definition },
      context,
    );
  }

  @ChildWorkflowStep()
  private async emitComparisonProfileCreated(
    input: ComparisonProfileCreateInput,
    comparisonProfileId: string,
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "comparisonProfileCreated",
        payload: {
          storeId: input.context.storeId,
          comparisonProfileId,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "CREATE",
            command: "comparisonProfileCreate",
            aggregate: { type: "comparisonProfile", id: comparisonProfileId },
            operations: [
              {
                position: 0,
                type: "comparisonProfileCreate",
                action: "CREATE",
                target: { type: "comparisonProfile", id: comparisonProfileId },
                changes: [],
              },
            ],
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "comparisonProfile", id: comparisonProfileId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `comparisonProfile:${comparisonProfileId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitComparisonProfileCreated",
        callId: comparisonProfileId,
        organizationId: input.context.organizationId,
      },
    );
  }
}
