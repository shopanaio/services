import { Injectable } from "@nestjs/common";
import type { ApplicationUserCreatedEvent } from "@shopana/events";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  ServiceBroker,
  Workflow,
} from "@shopana/shared-kernel";

export interface ApplicationUserCreatedEventWorkflowInput {
  readonly applicationId: string;
  readonly organizationId: string;
  readonly applicationUserId: string;
}

@Injectable()
export class ApplicationUserCreatedEventWorkflow extends BrokerWorkflows<
  ApplicationUserCreatedEventWorkflowInput,
  void
> {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("applicationUserCreatedEvent")
  async run(input: ApplicationUserCreatedEventWorkflowInput): Promise<void> {
    const payload: ApplicationUserCreatedEvent["payload"] = {
      applicationId: input.applicationId,
      applicationUserId: input.applicationUserId,
    };

    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "applicationUserCreated",
        payload,
        context: {
          organizationId: input.organizationId,
        },
        subject: {
          type: "applicationUser",
          id: input.applicationUserId,
        },
        emitKey: `application-user:${input.applicationId}:${input.applicationUserId}:created`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitApplicationUserCreated",
        callId: input.applicationUserId,
      },
    );
  }
}
