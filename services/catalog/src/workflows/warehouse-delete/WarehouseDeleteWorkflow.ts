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
import { WarehouseDeleteScript } from "./scripts/index.js";
import type { WarehouseDeleteInput, WarehouseDeleteResult } from "./dto/index.js";

@Injectable()
export class WarehouseDeleteWorkflow extends BrokerWorkflows<
  WarehouseDeleteInput,
  WarehouseDeleteResult
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

  @Workflow("warehouseDelete")
  @Policy<WarehouseDeleteInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: WarehouseDeleteInput): Promise<WarehouseDeleteResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.deleteWarehouse(input, context);
      const deletedId = result.deletedWarehouseId;
      if (!deletedId || result.userErrors.length > 0)
        return { deletedWarehouseId: null, userErrors: result.userErrors };
      await this.emitWarehouseDeleted(input);
      return { deletedWarehouseId: deletedId, userErrors: [] };
    });
  }

  @TransactionalStep()
  private deleteWarehouse(input: WarehouseDeleteInput, context: RunScriptContext) {
    return this.kernel.runScript(WarehouseDeleteScript, { id: input.warehouseId }, context);
  }

  @ChildWorkflowStep()
  private async emitWarehouseDeleted(input: WarehouseDeleteInput): Promise<void> {
    const id = input.warehouseId;
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "warehouseDeleted",
        payload: {
          storeId: input.context.storeId,
          warehouseId: id,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "DELETE",
            command: "warehouseDelete",
            aggregate: { type: "warehouse", id },
            operations: [
              {
                position: 0,
                type: "warehouseDelete",
                action: "DELETE",
                target: { type: "warehouse", id },
                changes: [],
              },
            ],
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "warehouse", id },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `warehouse:${id}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitWarehouseDeleted",
        callId: id,
        organizationId: input.context.organizationId,
      },
    );
  }
}
