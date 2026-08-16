import { Injectable } from "@nestjs/common";
import type {
  ApplicationUserCreatedEvent,
  ApplicationUserDeletedEvent,
  ApplicationUserStatusChangedEvent,
  ApplicationUserUpdatedEvent,
} from "@shopana/events";
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

export interface ApplicationUserUpdatedEventWorkflowInput
  extends ApplicationUserCreatedEventWorkflowInput {
  readonly changedFields: ApplicationUserUpdatedEvent["payload"]["changedFields"];
  readonly updatedAt: string;
}

export interface ApplicationUserStatusChangedEventWorkflowInput
  extends ApplicationUserCreatedEventWorkflowInput {
  readonly previousStatus: "active" | "blocked";
  readonly status: "active" | "blocked";
  readonly changedAt: string;
}

export interface ApplicationUserDeletedEventWorkflowInput
  extends ApplicationUserCreatedEventWorkflowInput {
  readonly deletedAt: string;
}

abstract class ApplicationUserEventWorkflow extends BrokerWorkflows {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected emit<TType extends string, TPayload>(input: {
    eventType: TType;
    payload: TPayload;
    source: ApplicationUserCreatedEventWorkflowInput;
  }): Promise<unknown> {
    return this.broker.runWorkflow(
      "events.emit",
      {
        eventType: input.eventType,
        payload: input.payload,
        context: { organizationId: input.source.organizationId },
        subject: {
          type: "applicationUser",
          id: input.source.applicationUserId,
        },
        emitKey: `application-user:${input.source.applicationId}:${input.source.applicationUserId}:${input.eventType}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: `emit:${input.eventType}`,
        callId: input.source.applicationUserId,
      },
    );
  }
}

@Injectable()
export class ApplicationUserCreatedEventWorkflow extends ApplicationUserEventWorkflow {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("applicationUserCreatedEvent")
  async run(input: ApplicationUserCreatedEventWorkflowInput): Promise<void> {
    const payload: ApplicationUserCreatedEvent["payload"] = {
      applicationId: input.applicationId,
      applicationUserId: input.applicationUserId,
    };

    await this.emit({ eventType: "applicationUserCreated", payload, source: input });
  }
}

@Injectable()
export class ApplicationUserUpdatedEventWorkflow extends ApplicationUserEventWorkflow {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("applicationUserUpdatedEvent")
  async run(input: ApplicationUserUpdatedEventWorkflowInput): Promise<void> {
    const payload: ApplicationUserUpdatedEvent["payload"] = {
      applicationId: input.applicationId,
      applicationUserId: input.applicationUserId,
      changedFields: input.changedFields,
      updatedAt: input.updatedAt,
    };
    await this.emit({ eventType: "applicationUserUpdated", payload, source: input });
  }
}

@Injectable()
export class ApplicationUserStatusChangedEventWorkflow extends ApplicationUserEventWorkflow {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("applicationUserStatusChangedEvent")
  async run(input: ApplicationUserStatusChangedEventWorkflowInput): Promise<void> {
    const payload: ApplicationUserStatusChangedEvent["payload"] = {
      applicationId: input.applicationId,
      applicationUserId: input.applicationUserId,
      previousStatus: input.previousStatus,
      status: input.status,
      changedAt: input.changedAt,
    };
    await this.emit({
      eventType: "applicationUserStatusChanged",
      payload,
      source: input,
    });
  }
}

@Injectable()
export class ApplicationUserDeletedEventWorkflow extends ApplicationUserEventWorkflow {
  constructor(@InjectBroker("iam") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("applicationUserDeletedEvent")
  async run(input: ApplicationUserDeletedEventWorkflowInput): Promise<void> {
    const payload: ApplicationUserDeletedEvent["payload"] = {
      applicationId: input.applicationId,
      applicationUserId: input.applicationUserId,
      deletedAt: input.deletedAt,
    };
    await this.emit({ eventType: "applicationUserDeleted", payload, source: input });
  }
}
