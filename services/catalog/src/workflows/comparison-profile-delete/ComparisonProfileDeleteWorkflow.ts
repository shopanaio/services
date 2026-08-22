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
import { ComparisonProfileDeleteScript } from "./scripts/index.js";
import type { ComparisonProfileDeleteInput, ComparisonProfileDeleteResult } from "./dto/index.js";

@Injectable()
export class ComparisonProfileDeleteWorkflow extends BrokerWorkflows<
  ComparisonProfileDeleteInput,
  ComparisonProfileDeleteResult
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

  @Workflow("comparisonProfileDelete")
  @Policy<ComparisonProfileDeleteInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: ComparisonProfileDeleteInput): Promise<ComparisonProfileDeleteResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.deleteComparisonProfile(input, context);
      const deletedId = result.deletedProfileId;
      if (!deletedId || result.userErrors.length > 0)
        return { deletedComparisonProfileId: null, userErrors: result.userErrors };
      await this.emitComparisonProfileDeleted(input);
      return { deletedComparisonProfileId: deletedId, userErrors: [] };
    });
  }

  @TransactionalStep()
  private deleteComparisonProfile(input: ComparisonProfileDeleteInput, context: RunScriptContext) {
    return this.kernel.runScript(
      ComparisonProfileDeleteScript,
      { id: input.comparisonProfileId },
      context,
    );
  }

  @ChildWorkflowStep()
  private async emitComparisonProfileDeleted(input: ComparisonProfileDeleteInput): Promise<void> {
    const id = input.comparisonProfileId;
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "comparisonProfileDeleted",
        payload: {
          storeId: input.context.storeId,
          comparisonProfileId: id,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "DELETE",
            command: "comparisonProfileDelete",
            aggregate: { type: "comparisonProfile", id },
            operations: [
              {
                position: 0,
                type: "comparisonProfileDelete",
                action: "DELETE",
                target: { type: "comparisonProfile", id },
                changes: [],
              },
            ],
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "comparisonProfile", id },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `comparisonProfile:${id}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitComparisonProfileDeleted",
        callId: id,
        organizationId: input.context.organizationId,
      },
    );
  }
}
