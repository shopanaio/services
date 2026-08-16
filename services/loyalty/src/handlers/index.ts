import { Injectable } from "@nestjs/common";
import {
  EventHandlers,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";

/**
 * Broker integration point for Loyalty event consumers.
 * Decorated handlers are added when the corresponding domain flows exist.
 */
@Injectable()
export class LoyaltyEventHandlers extends EventHandlers {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }
}

/** Public event-handler bindings and signatures. */
export {
  LoyaltyEventHandlerBindings,
  LoyaltyEventHandlerNames,
} from "../contracts/handlers.js";
export type {
  LoyaltyConsumableEvent,
  LoyaltyEventHandlerContract,
  LoyaltyEventHandlerContracts,
} from "../contracts/events.js";
