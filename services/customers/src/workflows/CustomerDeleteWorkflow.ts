import { Injectable } from "@nestjs/common";
import type { CustomerDeletedEvent } from "@shopana/events";
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
import { CustomerDeleteScript } from "../scripts/index.js";
import type {
  CustomerDeleteWorkflowInput,
  CustomerDeleteWorkflowResult,
  CustomerMutationWorkflowContext,
} from "./dto/index.js";

@Injectable()
export class CustomerDeleteWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("customerDelete")
  async run(
    input: CustomerDeleteWorkflowInput
  ): Promise<CustomerDeleteWorkflowResult> {
    const result = await this.stepDelete(input);

    if (
      result.deletedCustomerId &&
      result.revision !== undefined &&
      result.deletedAt &&
      result.userErrors.length === 0
    ) {
      await this.workflowEmitEvent(input, {
        customerId: result.deletedCustomerId,
        revision: result.revision,
        deletedAt: result.deletedAt,
      });
    }

    return result;
  }

  @WorkflowStep()
  private stepDelete(input: CustomerDeleteWorkflowInput) {
    return this.kernel.runScript(
      CustomerDeleteScript,
      input.params,
      toScriptContext(input.context)
    );
  }

  private async workflowEmitEvent(
    input: CustomerDeleteWorkflowInput,
    deleted: { customerId: string; revision: number; deletedAt: string }
  ): Promise<void> {
    const payload: CustomerDeletedEvent["payload"] = {
      ...deleted,
      storeId: input.context.storeId,
    };

    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "customerDeleted",
        payload,
        source: "customers",
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "customer", id: deleted.customerId },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : undefined,
        emitKey: `customer:${deleted.customerId}:deleted`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitCustomerDeleted",
        callId: deleted.customerId,
      }
    );
  }
}

function toScriptContext(
  context: CustomerMutationWorkflowContext
): RunScriptContext {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    locale: context.locale,
    userId: context.userId,
    requestId: context.requestId,
  };
}
