import { Injectable } from "@nestjs/common";
import type { IAM } from "@shopana/broker-types";
import type {
  ApplicationUserCreatedEvent,
  ApplicationUserDeletedEvent,
  ApplicationUserStatusChangedEvent,
  ApplicationUserUpdatedEvent,
  EventHandlerDelivery,
  EventHandlerResponse,
} from "@shopana/events";
import {
  EventHandler,
  EventHandlers,
  hashContent,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { CustomerIamLifecycleWorkflowInput } from "../workflows/CustomerIamLifecycleWorkflow.js";
import type { CustomerProvisionFromIamWorkflowInput } from "../workflows/CustomerProvisionFromIamWorkflow.js";

type ApplicationUserProjectionEvent =
  | ApplicationUserCreatedEvent
  | ApplicationUserUpdatedEvent;

@Injectable()
export class ApplicationUserEventHandlers extends EventHandlers {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("applicationUserCreated", { retry: { maxAttempts: 5 } })
  handleApplicationUserCreated(params: {
    event: ApplicationUserCreatedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ customerId: string }>> {
    return this.synchronizeProjection(params.event);
  }

  @EventHandler("applicationUserUpdated", { retry: { maxAttempts: 5 } })
  handleApplicationUserUpdated(params: {
    event: ApplicationUserUpdatedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ customerId: string }>> {
    return this.synchronizeProjection(params.event);
  }

  @EventHandler("applicationUserStatusChanged", { retry: { maxAttempts: 5 } })
  handleApplicationUserStatusChanged(params: {
    event: ApplicationUserStatusChangedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ customerId: string | null }>> {
    return this.applyLifecycle(params.event, {
      operation: "STATUS_CHANGED",
      iamPrincipalId: params.event.payload.applicationUserId,
      status: params.event.payload.status,
    });
  }

  @EventHandler("applicationUserDeleted", { retry: { maxAttempts: 5 } })
  handleApplicationUserDeleted(params: {
    event: ApplicationUserDeletedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ customerId: string | null }>> {
    return this.applyLifecycle(params.event, {
      operation: "DELETED",
      iamPrincipalId: params.event.payload.applicationUserId,
    });
  }

  private async synchronizeProjection(
    event: ApplicationUserProjectionEvent,
  ): Promise<EventHandlerResponse<{ customerId: string }>> {
    try {
      const configuration = await this.getConfiguration(event);
      if (!configuration) return configurationNotFound();

      const identity = await this.broker.call<
        IAM.GetServiceLinkedApplicationUserResult,
        IAM.GetServiceLinkedApplicationUserParams
      >("iam.getServiceLinkedApplicationUser", {
        applicationId: configuration.applicationId,
        organizationId: configuration.organizationId,
        linkedOwner: {
          linkedOwnerType: "store",
          linkedOwnerId: configuration.storeId,
        },
        userId: event.payload.applicationUserId,
      });
      if (!identity.found) return { success: true };

      const input: CustomerProvisionFromIamWorkflowInput = {
        params: {
          iamPrincipalId: identity.user.id,
          iamStatus: identity.user.status,
          email: identity.user.email,
          emailVerified: identity.user.emailVerified,
          firstName: identity.user.firstName,
          lastName: identity.user.lastName,
        },
        context: {
          storeId: configuration.storeId,
          organizationId: configuration.organizationId,
          requestId: `event-${event.eventId}`,
        },
      };
      const result = await this.broker.runWorkflow<
        { customerId: string },
        CustomerProvisionFromIamWorkflowInput
      >("customers.customerProvisionFromIam", input, {
        source: "content",
        resourceId: `${configuration.storeId}:${identity.user.id}`,
        operation: "customerProvisionFromIam",
        contentHash: hashContent({ eventId: event.eventId, identity: input.params }),
      });
      return { success: true, data: { customerId: result.customerId } };
    } catch (error) {
      return this.failure(event, error, "Failed to synchronize customer from IAM");
    }
  }

  private async applyLifecycle(
    event: ApplicationUserStatusChangedEvent | ApplicationUserDeletedEvent,
    params: CustomerIamLifecycleWorkflowInput["params"],
  ): Promise<EventHandlerResponse<{ customerId: string | null }>> {
    try {
      const configuration = await this.getConfiguration(event);
      if (!configuration) return configurationNotFound();
      const input: CustomerIamLifecycleWorkflowInput = {
        params,
        context: {
          storeId: configuration.storeId,
          organizationId: configuration.organizationId,
          requestId: `event-${event.eventId}`,
        },
      };
      const result = await this.broker.runWorkflow<
        { customerId: string | null; updated: boolean },
        CustomerIamLifecycleWorkflowInput
      >("customers.customerIamLifecycle", input, {
        source: "content",
        resourceId: `${configuration.storeId}:${event.payload.applicationUserId}`,
        operation: "customerIamLifecycle",
        contentHash: hashContent({ eventId: event.eventId, params }),
      });
      return { success: true, data: { customerId: result.customerId } };
    } catch (error) {
      return this.failure(event, error, "Failed to apply IAM customer lifecycle");
    }
  }

  private async getConfiguration(event: {
    context: { organizationId: string };
    payload: { applicationId: string };
  }) {
    const configuration =
      await Kernel.getInstance().repository.storefrontAuth.findByApplicationId(
        event.payload.applicationId,
      );
    return configuration?.organizationId === event.context.organizationId
      ? configuration
      : null;
  }

  private failure(
    event:
      | ApplicationUserProjectionEvent
      | ApplicationUserStatusChangedEvent
      | ApplicationUserDeletedEvent,
    error: unknown,
    message: string,
  ): EventHandlerResponse<never> {
    const details = provisioningErrorDetails(error);
    this.logger.error(
      {
        eventId: event.eventId,
        applicationId: event.payload.applicationId,
        applicationUserId: event.payload.applicationUserId,
        error: details.message,
      },
      message,
    );
    return { success: false, error: details };
  }
}

function configurationNotFound(): EventHandlerResponse<never> {
  return {
    success: false,
    error: {
      message:
        "Application user event has no matching storefront auth configuration",
      code: "STOREFRONT_AUTH_CONFIGURATION_NOT_FOUND",
      retryable: false,
    },
  };
}

function provisioningErrorDetails(error: unknown): {
  message: string;
  code?: string;
  retryable: boolean;
} {
  if (error && typeof error === "object") {
    const value = error as {
      message?: unknown;
      code?: unknown;
      retryable?: unknown;
    };
    return {
      message:
        typeof value.message === "string"
          ? value.message
          : "Customer IAM synchronization failed",
      ...(typeof value.code === "string" ? { code: value.code } : {}),
      retryable:
        typeof value.retryable === "boolean" ? value.retryable : true,
    };
  }
  return { message: String(error), retryable: true };
}
