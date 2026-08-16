import { Injectable } from "@nestjs/common";
import type { CustomerUpdatedEvent } from "@shopana/events";
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
  CustomerIamLifecycleScript,
  type CustomerIamLifecycleParams,
  type CustomerIamLifecycleResult,
} from "../scripts/customer/CustomerIamLifecycleScript.js";

export interface CustomerIamLifecycleWorkflowInput {
  readonly params: CustomerIamLifecycleParams;
  readonly context: RunScriptContext;
}

@Injectable()
export class CustomerIamLifecycleWorkflow extends BrokerWorkflows<
  CustomerIamLifecycleWorkflowInput,
  CustomerIamLifecycleResult
> {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerIamLifecycle")
  async run(
    input: CustomerIamLifecycleWorkflowInput,
  ): Promise<CustomerIamLifecycleResult> {
    const result = await this.apply(input);
    if (result.updated && result.customerId) {
      await this.emitUpdated(input, result.customerId);
    }
    return result;
  }

  @WorkflowStep()
  private apply(
    input: CustomerIamLifecycleWorkflowInput,
  ): Promise<CustomerIamLifecycleResult> {
    return Kernel.getInstance().runScript(
      CustomerIamLifecycleScript,
      input.params,
      input.context,
    );
  }

  private async emitUpdated(
    input: CustomerIamLifecycleWorkflowInput,
    customerId: string,
  ): Promise<void> {
    const payload: CustomerUpdatedEvent["payload"] = {
      customerId,
      storeId: input.context.storeId,
      reasons:
        input.params.operation === "DELETED"
          ? ["status", "contact"]
          : ["status"],
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "customerUpdated",
        payload,
        context: { organizationId: input.context.organizationId },
        subject: { type: "customer", id: customerId },
        emitKey: `customer:${customerId}:iam-lifecycle`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitCustomerUpdated",
        callId: customerId,
      },
    );
  }
}
