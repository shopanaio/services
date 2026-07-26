import { Injectable } from "@nestjs/common";
import type { IAM } from "@shopana/broker-types";
import type {
  ApplicationUserCreatedEvent,
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
import type {
  CustomerProvisionFromIamWorkflowInput,
} from "../workflows/CustomerProvisionFromIamWorkflow.js";

@Injectable()
export class ApplicationUserEventHandlers extends EventHandlers {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("applicationUserCreated", { retry: { maxAttempts: 5 } })
  async handleApplicationUserCreated(params: {
    event: ApplicationUserCreatedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ customerId: string }>> {
    const { event } = params;
    try {
      const configuration =
        await Kernel.getInstance().repository.storefrontAuth.findByApplicationId(
          event.payload.applicationId,
        );
      if (
        !configuration ||
        configuration.organizationId !== event.context.organizationId
      ) {
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
      if (!identity.found || identity.user.status !== "active") {
        return { success: true };
      }

      const input: CustomerProvisionFromIamWorkflowInput = {
        params: {
          iamPrincipalId: identity.user.id,
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
        contentHash: hashContent({
          eventId: event.eventId,
          identity: input.params,
        }),
      });

      return {
        success: true,
        data: { customerId: result.customerId },
      };
    } catch (error) {
      const details = provisioningErrorDetails(error);
      this.logger.error(
        {
          eventId: event.eventId,
          applicationId: event.payload.applicationId,
          applicationUserId: event.payload.applicationUserId,
          error: details.message,
        },
        "Failed to provision customer from application user",
      );
      return {
        success: false,
        error: details,
      };
    }
  }
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
          : "Customer provisioning failed",
      ...(typeof value.code === "string" ? { code: value.code } : {}),
      retryable:
        typeof value.retryable === "boolean" ? value.retryable : true,
    };
  }
  return {
    message: String(error),
    retryable: true,
  };
}
