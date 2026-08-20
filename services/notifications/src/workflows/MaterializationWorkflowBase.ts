import {
  BrokerWorkflows,
  DBOS,
  WorkflowStep,
  type IdempotencyContext,
  type ServiceBroker,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  MaterializeNotificationScript,
  type MaterializeNotificationParams,
  type MaterializeNotificationResult,
} from "../scripts/index.js";
import type { DeliveryWorkflowInput } from "./types.js";

export abstract class MaterializationWorkflowBase extends BrokerWorkflows {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @WorkflowStep({ retriesAllowed: false })
  protected materialize(input: {
    params: MaterializeNotificationParams;
    context: RunScriptContext;
  }): Promise<MaterializeNotificationResult> {
    return this.kernel.runScript(MaterializeNotificationScript, input.params, input.context);
  }

  protected async startDelivery(input: DeliveryWorkflowInput): Promise<string> {
    const workflowId = DBOS.workflowID;
    const idempotency: IdempotencyContext = workflowId
      ? {
          source: "workflow",
          organizationId: input.organizationId,
          workflowId,
          stepId: "notifications.startDelivery",
          callId: input.deliveryId,
        }
      : {
          source: "content",
          organizationId: input.organizationId,
          resourceId: input.deliveryId,
          operation: "notifications.deliver",
          content: input,
        };
    const started = await this.broker.startWorkflow("notifications.deliver", input, idempotency);
    return started.workflowId;
  }
}
