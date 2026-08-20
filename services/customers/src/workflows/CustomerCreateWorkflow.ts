import { Injectable } from "@nestjs/common";
import type { CustomerCreatedEvent } from "@shopana/events";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import { CustomerCreateScript } from "../scripts/index.js";
import type {
  CustomerCreateWorkflowInput,
  CustomerCreateWorkflowResult,
  CustomerMutationWorkflowContext,
} from "./dto/index.js";

@Injectable()
export class CustomerCreateWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("customerCreate")
  @Policy<CustomerCreateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: CustomerCreateWorkflowInput): Promise<CustomerCreateWorkflowResult> {
    const result = await this.stepCreate(input);

    if (result.customer && result.userErrors.length === 0) {
      await this.workflowEmitEvent(input, result.customer.id);
    }

    return result;
  }

  @WorkflowStep()
  private stepCreate(input: CustomerCreateWorkflowInput) {
    return this.kernel.runScript(
      CustomerCreateScript,
      input.params,
      toScriptContext(input.context),
    );
  }

  private async workflowEmitEvent(
    input: CustomerCreateWorkflowInput,
    customerId: string,
  ): Promise<void> {
    const payload: CustomerCreatedEvent["payload"] = {
      customerId,
      storeId: input.context.storeId,
    };

    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "customerCreated",
        payload,
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "customer", id: customerId },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : undefined,
        emitKey: `customer:${customerId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitCustomerCreated",
        callId: customerId,
      },
    );
  }
}

function toScriptContext(context: CustomerMutationWorkflowContext): RunScriptContext {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    locale: context.locale,
    userId: context.userId,
    requestId: context.requestId,
  };
}
