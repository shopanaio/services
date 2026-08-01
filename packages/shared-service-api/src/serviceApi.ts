import type { Broker } from "./broker";
import { CheckoutClient } from "./checkout/client";

import type { CheckoutApiClient } from "./checkout/client";

/**
 * Aggregated access point for platform service API clients.
 * Provides access to service API clients with active broker contracts.
 */
export class ServiceApi {
  public readonly checkout: CheckoutApiClient;

  /**
   * Create a new aggregated API instance for the provided broker.
   * @param broker - Moleculer or NestJS broker used for transport.
   */
  constructor(broker: Broker) {
    this.checkout = new CheckoutClient(broker);
  }
}

/**
 * Factory helper to create {@link ServiceApi}.
 * @param broker - Moleculer or NestJS orchestrator broker
 */
export function createServiceApi(broker: Broker): ServiceApi {
  return new ServiceApi(broker);
}

export type { CheckoutApiClient };
