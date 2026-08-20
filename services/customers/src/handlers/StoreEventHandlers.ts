import { Injectable } from "@nestjs/common";
import type {
  EventHandlerDelivery,
  EventHandlerResponse,
  StoreCreatedEvent,
  StoreConfigurationUpdatedEvent,
  StoreDeletedEvent,
} from "@shopana/events";
import {
  EventHandler,
  EventHandlers,
  hashContent,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import { CustomerSegmentStoreContextUpdateScript } from "../scripts/classification/index.js";
import type {
  StorefrontAuthProvisionInput,
  StorefrontAuthProvisionOutput,
} from "../workflows/StorefrontAuthProvisionWorkflow.js";
import type { StorefrontAuthDeprovisionInput } from "../workflows/StorefrontAuthDeprovisionWorkflow.js";

@Injectable()
export class StoreEventHandlers extends EventHandlers {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("storeConfigurationUpdated", { retry: { maxAttempts: 10 } })
  async handleStoreConfigurationUpdated(params: {
    event: StoreConfigurationUpdatedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<{ readonly applied: boolean }>> {
    const { event, delivery } = params;
    const input = event.payload;
    try {
      const result = await Kernel.getInstance().runScript(
        CustomerSegmentStoreContextUpdateScript,
        input,
        {
          storeId: input.storeId,
          organizationId: event.context.organizationId,
          requestId: delivery.idempotencyKey,
          segmentStoreContext: {
            timeZone: input.timeZone,
            currencyCode: input.currencyCode,
            configurationRevision: input.configurationRevision,
          },
        },
      );
      // Starting maintenance for an already-projected duplicate is intentional:
      // it closes the crash window between the projection transaction commit and
      // the original workflow dispatch.
      await this.broker.startWorkflow(
        "customers.customerSegmentMaintenance",
        {
          context: {
            storeId: input.storeId,
            organizationId: event.context.organizationId,
            requestId: delivery.idempotencyKey,
          },
        },
        {
          source: "content",
          resourceId: input.storeId,
          operation: "customerSegmentStoreConfigurationMaintenance",
          contentHash: `${input.configurationRevision}:${input.timeZone}`,
        },
      );
      return { success: true, data: { applied: result.applied } };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: "STORE_SEGMENT_CONTEXT_PROJECTION_FAILED",
          retryable: true,
        },
      };
    }
  }

  @EventHandler("storeCreated", { retry: { maxAttempts: 5 } })
  async handleStoreCreated(params: {
    event: StoreCreatedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse<StorefrontAuthProvisionOutput>> {
    const { event, delivery } = params;
    const userId = event.context.userId;
    if (!userId) {
      return {
        success: false,
        error: {
          message: "storeCreated event requires a userId to provision IAM",
          code: "STORE_CREATED_USER_REQUIRED",
          retryable: false,
        },
      };
    }

    const input: StorefrontAuthProvisionInput = {
      storeId: event.payload.storeId,
      organizationId: event.payload.organizationId,
      userId,
      name: event.payload.name,
      displayName: event.payload.displayName,
      defaultLocale: event.payload.defaultLocale,
    };

    try {
      const data = await this.broker.runWorkflow<
        StorefrontAuthProvisionOutput,
        StorefrontAuthProvisionInput
      >("customers.storefrontAuthProvision", input, {
        source: "content",
        resourceId: event.payload.storeId,
        operation: "storefrontAuthProvision",
        contentHash: hashContent({
          eventId: event.eventId,
          attempt: delivery.attempt,
        }),
      });

      this.logger.log(
        {
          eventId: event.eventId,
          storeId: event.payload.storeId,
          applicationId: data.applicationId,
        },
        "Provisioned storefront IAM application",
      );
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        {
          eventId: event.eventId,
          storeId: event.payload.storeId,
          error: message,
        },
        "Failed to provision storefront IAM application",
      );
      return {
        success: false,
        error: { message, retryable: true },
      };
    }
  }

  @EventHandler("storeDeleted", { retry: { maxAttempts: 5 } })
  async handleStoreDeleted(params: {
    event: StoreDeletedEvent;
    delivery: EventHandlerDelivery;
  }): Promise<EventHandlerResponse> {
    const { event, delivery } = params;
    const input: StorefrontAuthDeprovisionInput = {
      storeId: event.payload.storeId,
      organizationId: event.payload.organizationId,
    };

    try {
      await this.broker.runWorkflow<void, StorefrontAuthDeprovisionInput>(
        "customers.storefrontAuthDeprovision",
        input,
        {
          source: "content",
          resourceId: event.payload.storeId,
          operation: "storefrontAuthDeprovision",
          contentHash: hashContent({
            eventId: event.eventId,
            attempt: delivery.attempt,
          }),
        },
      );

      this.logger.log(
        { eventId: event.eventId, storeId: event.payload.storeId },
        "Deprovisioned storefront IAM application",
      );
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { eventId: event.eventId, storeId: event.payload.storeId, error: message },
        "Failed to deprovision storefront IAM application",
      );
      return {
        success: false,
        error: { message, retryable: true },
      };
    }
  }
}
