import { Injectable } from "@nestjs/common";
import type { CustomerCreatedEvent, CustomerUpdatedEvent } from "@shopana/events";
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
  CustomerProvisionFromIamScript,
  type CustomerProvisionFromIamParams,
  type CustomerProvisionFromIamResult,
} from "../scripts/customer/CustomerProvisionFromIamScript.js";

export interface CustomerProvisionFromIamWorkflowInput {
  readonly params: CustomerProvisionFromIamParams;
  readonly context: RunScriptContext;
}

@Injectable()
export class CustomerProvisionFromIamWorkflow extends BrokerWorkflows<
  CustomerProvisionFromIamWorkflowInput,
  CustomerProvisionFromIamResult
> {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("customerProvisionFromIam")
  async run(input: CustomerProvisionFromIamWorkflowInput): Promise<CustomerProvisionFromIamResult> {
    const result = await this.provision(input);
    if (result.created) {
      await this.emitCreated(input, result.customerId);
    } else if (result.updated) {
      await this.emitUpdated(input, result.customerId);
    }
    return result;
  }

  @WorkflowStep()
  private provision(
    input: CustomerProvisionFromIamWorkflowInput,
  ): Promise<CustomerProvisionFromIamResult> {
    return Kernel.getInstance().runScript(
      CustomerProvisionFromIamScript,
      input.params,
      input.context,
    );
  }

  private async emitCreated(
    input: CustomerProvisionFromIamWorkflowInput,
    customerId: string,
  ): Promise<void> {
    const payload: CustomerCreatedEvent["payload"] = {
      customerId,
      storeId: input.context.storeId,
    };
    await this.emit("customerCreated", payload, input, customerId);
  }

  private async emitUpdated(
    input: CustomerProvisionFromIamWorkflowInput,
    customerId: string,
  ): Promise<void> {
    const payload: CustomerUpdatedEvent["payload"] = {
      customerId,
      storeId: input.context.storeId,
      reasons: ["status", "contact", "profile"],
    };
    await this.emit("customerUpdated", payload, input, customerId);
  }

  private async emit(
    eventType: "customerCreated" | "customerUpdated",
    payload: CustomerCreatedEvent["payload"] | CustomerUpdatedEvent["payload"],
    input: CustomerProvisionFromIamWorkflowInput,
    customerId: string,
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType,
        payload,
        context: {
          organizationId: input.context.organizationId,
        },
        subject: { type: "customer", id: customerId },
        emitKey: `customer:${customerId}:iam-provision:${eventType}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: `emit:${eventType}`,
        callId: customerId,
      },
    );
  }
}
