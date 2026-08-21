import { Injectable } from "@nestjs/common";
import { EventHandler, EventHandlers, InjectBroker, ServiceBroker } from "@shopana/shared-kernel";
import type { EventHandlerResponse, StoreCreatedEvent } from "@shopana/events";
import { Kernel } from "../kernel/Kernel.js";
import type { SearchSettingsValueInput } from "../repositories/search/searchRepositoryTypes.js";
import { SearchFieldRegistry } from "../search/planner/SearchFieldRegistry.js";

@Injectable()
export class ListingStoreEventHandlers extends EventHandlers {
  private readonly searchFields = new SearchFieldRegistry();

  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("storeCreated", { retry: { maxAttempts: 5 } })
  async handleStoreCreated(params: { event: StoreCreatedEvent }): Promise<EventHandlerResponse> {
    const { event } = params;

    this.logger.debug(
      {
        eventId: event.eventId,
        storeId: event.payload.storeId,
        organizationId: event.payload.organizationId,
      },
      "Received storeCreated event",
    );

    try {
      const result = await Kernel.getInstance().repository.searchSettings.initialize({
        storeId: event.payload.storeId,
        values: this.defaultSearchSettings(),
      });

      if (result.status === "applied" && result.initialized) {
        this.logger.log(
          {
            eventId: event.eventId,
            storeId: event.payload.storeId,
          },
          "Created default listing search settings",
        );
      } else if (result.status === "applied") {
        this.logger.debug(
          {
            eventId: event.eventId,
            storeId: event.payload.storeId,
          },
          "Listing search settings are already initialized",
        );
      } else {
        throw new Error("Failed to initialize listing search settings");
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        {
          error: message,
          eventId: event.eventId,
          storeId: event.payload.storeId,
        },
        "Failed to initialize listing search settings",
      );

      return {
        success: false,
        error: {
          message,
          retryable: true,
        },
      };
    }
  }

  private defaultSearchSettings(): SearchSettingsValueInput {
    return {
      enabledFields: this.searchFields.list().map(({ field }) => field),
      fieldWeights: this.searchFields.defaultWeights(),
      typoToleranceEnabled: false,
      outOfStockPolicy: "SHOW",
    };
  }
}
