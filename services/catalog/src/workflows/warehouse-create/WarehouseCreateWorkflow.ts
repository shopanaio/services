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
import { WarehouseCreateScript } from "./scripts/index.js";
import type { WarehouseCreateInput, WarehouseCreateResult } from "./dto/index.js";

@Injectable()
export class WarehouseCreateWorkflow extends BrokerWorkflows<
  WarehouseCreateInput,
  WarehouseCreateResult
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

  @Workflow("warehouseCreate")
  @Policy<WarehouseCreateInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: WarehouseCreateInput): Promise<WarehouseCreateResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.createWarehouse(input, context);
      const entity = result.warehouse;
      if (!entity || result.userErrors.length > 0)
        return { warehouse: null, userErrors: result.userErrors };
      await this.emitWarehouseCreated(input, entity.id);
      return { warehouse: { id: entity.id }, userErrors: [] };
    });
  }

  @TransactionalStep()
  private createWarehouse(input: WarehouseCreateInput, context: RunScriptContext) {
    return this.kernel.runScript(
      WarehouseCreateScript,
      { code: input.code, name: input.name, isDefault: input.isDefault },
      context,
    );
  }

  @ChildWorkflowStep()
  private async emitWarehouseCreated(
    input: WarehouseCreateInput,
    warehouseId: string,
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "warehouseCreated",
        payload: {
          storeId: input.context.storeId,
          warehouseId,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "CREATE",
            command: "warehouseCreate",
            aggregate: { type: "warehouse", id: warehouseId },
            operations: [
              {
                position: 0,
                type: "warehouseCreate",
                action: "CREATE",
                target: { type: "warehouse", id: warehouseId },
                changes: [],
              },
            ],
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "warehouse", id: warehouseId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `warehouse:${warehouseId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitWarehouseCreated",
        callId: warehouseId,
        organizationId: input.context.organizationId,
      },
    );
  }
}
