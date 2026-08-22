import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  type WorkflowExecutionContext,
} from "@shopana/shared-kernel";
import type { WarehouseUpdateResult } from "../warehouse-update/dto/index.js";
import type { WarehouseBulkUpdateInput, WarehouseBulkUpdateResult } from "./dto/index.js";

@Injectable()
export class WarehouseBulkUpdateWorkflow extends BrokerWorkflows<
  WarehouseBulkUpdateInput,
  WarehouseBulkUpdateResult
> {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("warehouseBulkUpdate")
  @Policy<WarehouseBulkUpdateInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: WarehouseBulkUpdateInput,
    workflowContext?: WorkflowExecutionContext,
  ): Promise<WarehouseBulkUpdateResult> {
    if (!workflowContext) throw new Error("Workflow authorization context is required");
    const grouped = new Map<string, Array<{ itemIndex: number; operationCount: number }>>();
    const streams = new Map<
      string,
      WarehouseBulkUpdateInput["items"][number]["operations"][number][]
    >();
    input.items.forEach((item, itemIndex) => {
      grouped.set(item.warehouseId, [
        ...(grouped.get(item.warehouseId) ?? []),
        { itemIndex, operationCount: item.operations.length },
      ]);
      streams.set(item.warehouseId, [...(streams.get(item.warehouseId) ?? []), ...item.operations]);
    });

    const itemResults: Array<WarehouseUpdateResult | undefined> = new Array(input.items.length);
    for (const [warehouseId, operations] of streams) {
      const result = (await this.broker.runWorkflow(
        "catalog.warehouseUpdate",
        { warehouseId, operations, context: input.context },
        {
          source: "workflow",
          workflowId: DBOS.workflowID!,
          stepId: "warehouseUpdate",
          callId: warehouseId,
          organizationId: input.context.organizationId,
        },
        {
          workflowContext,
          queueName: "catalog_aggregate_mutations",
          enqueueOptions: {
            queuePartitionKey: `${input.context.storeId}:warehouse:${warehouseId}`,
          },
        },
      )) as WarehouseUpdateResult;
      let offset = 0;
      for (const item of grouped.get(warehouseId) ?? []) {
        const operationResults = result.operationResults.slice(
          offset,
          offset + item.operationCount,
        );
        offset += item.operationCount;
        itemResults[item.itemIndex] = {
          warehouse: operationResults.some((operation) => operation.applied)
            ? { id: warehouseId }
            : null,
          operationResults,
          userErrors: operationResults.flatMap((operation) => operation.errors),
        };
      }
    }
    return {
      results: input.items.map((item, index) => ({
        warehouseId: item.warehouseId,
        result: itemResults[index]!,
      })),
    };
  }
}
