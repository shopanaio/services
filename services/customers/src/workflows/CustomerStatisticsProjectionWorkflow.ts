import { Injectable } from "@nestjs/common";
import type { CustomerStatisticsUpdatedEvent } from "@shopana/events";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  CustomerStatisticsProjectionScript,
  type CustomerStatisticsProjectionParams,
  type CustomerStatisticsProjectionResult,
} from "../scripts/statistics/CustomerStatisticsProjectionScript.js";

export interface CustomerStatisticsProjectionWorkflowInput {
  readonly params: CustomerStatisticsProjectionParams;
  readonly context: RunScriptContext;
}

@Injectable()
export class CustomerStatisticsProjectionWorkflow extends BrokerWorkflows<
  CustomerStatisticsProjectionWorkflowInput,
  CustomerStatisticsProjectionResult
> {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerStatisticsProject")
  async run(
    input: CustomerStatisticsProjectionWorkflowInput,
  ): Promise<CustomerStatisticsProjectionResult> {
    const result = await this.project(input);
    if (result.changed) await this.emitUpdated(input, result);
    return result;
  }

  @WorkflowStep()
  private project(
    input: CustomerStatisticsProjectionWorkflowInput,
  ): Promise<CustomerStatisticsProjectionResult> {
    return Kernel.getInstance().runScript(
      CustomerStatisticsProjectionScript,
      input.params,
      input.context,
    );
  }

  private async emitUpdated(
    input: CustomerStatisticsProjectionWorkflowInput,
    result: CustomerStatisticsProjectionResult,
  ): Promise<void> {
    const reason =
      input.params.operation === "ORDER"
        ? "order"
        : input.params.operation === "CHECKOUT"
          ? "checkout"
          : "refund";
    const payload: CustomerStatisticsUpdatedEvent["payload"] = {
      schemaVersion: 1,
      storeId: input.context.storeId,
      customerId: result.customerId,
      reasons: [reason],
      updatedAt: result.updatedAt,
    };
    await this.broker.startWorkflow(
      "events.emit",
      {
        eventType: "customerStatisticsUpdated",
        payload,
        context: { organizationId: input.context.organizationId },
        subject: { type: "customer", id: result.customerId },
        emitKey: `customer:${result.customerId}:statistics`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitCustomerStatisticsUpdated",
        callId: result.customerId,
      },
    );
  }
}
