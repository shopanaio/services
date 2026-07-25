import { Injectable } from "@nestjs/common";
import type {
  EventHandlerResponse,
  StoreCreatedEvent,
  StoreDeletedEvent,
} from "@shopana/events";
import {
  EventHandler,
  EventHandlers,
  hashContent,
  InjectBroker,
  type ServiceBroker,
} from "@shopana/shared-kernel";
import type { OnlineStoreBootstrapInput } from "./OnlineStoreBootstrapWorkflow.js";

@Injectable()
export class OnlineStoreEventHandlers extends EventHandlers {
  constructor(@InjectBroker("apps") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("storeCreated", { retry: { maxAttempts: 5 } })
  async storeCreated(params: {
    event: StoreCreatedEvent;
  }): Promise<EventHandlerResponse> {
    const input: OnlineStoreBootstrapInput = {
      storeId: params.event.payload.storeId,
      organizationId: params.event.payload.organizationId,
    };
    try {
      await this.broker.runWorkflow(
        "apps.onlineStoreBootstrap",
        input,
        {
          source: "content",
          organizationId: input.organizationId,
          resourceId: input.storeId,
          operation: "apps.online-store.bootstrap",
          contentHash: hashContent({ eventId: params.event.eventId }),
        },
        { workflowId: `apps:bootstrap:online-store:${input.storeId}` },
      );
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
      };
    }
  }

  @EventHandler("storeDeleted", { retry: { maxAttempts: 5 } })
  async storeDeleted(params: {
    event: StoreDeletedEvent;
  }): Promise<EventHandlerResponse> {
    try {
      await this.broker.runWorkflow(
        "apps.onlineStoreDeprovision",
        {
          storeId: params.event.payload.storeId,
          organizationId: params.event.payload.organizationId,
        },
        {
          source: "content",
          organizationId: params.event.payload.organizationId,
          resourceId: params.event.payload.storeId,
          operation: "apps.online-store.deprovision",
          contentHash: hashContent({ eventId: params.event.eventId }),
        },
        {
          workflowId: `apps:deprovision:online-store:${params.event.payload.storeId}`,
        },
      );
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
      };
    }
  }
}
