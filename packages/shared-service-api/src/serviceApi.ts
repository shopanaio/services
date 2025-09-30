import type { ServiceBroker } from "moleculer";
import { PaymentClient } from "./paymentClient";
import { PricingClient } from "./pricingClient";
import { ShippingClient } from "./shippingClient";
import { InventoryClient } from "./inventoryClient";
import { CheckoutClient } from "./checkoutClient";

import type { PaymentApiClient } from "./paymentTypes";
import type { PricingApiClient } from "./pricingTypes";
import type { ShippingApiClient } from "./shippingTypes";
import type { InventoryApiClient } from "./inventoryTypes";
import type { CheckoutApiClient } from "./checkoutClient";

/**
 * Aggregated access point for platform service API clients.
 * Provides a single entry to interact with checkout, payments, pricing, shipping and inventory services.
 */
export class ServiceApi {
  public readonly checkout: CheckoutApiClient;
  public readonly payment: PaymentApiClient;
  public readonly pricing: PricingApiClient;
  public readonly shipping: ShippingApiClient;
  public readonly inventory: InventoryApiClient;

  /**
   * Create a new aggregated API instance for the provided broker.
   * @param broker - Moleculer service broker used for transport.
   */
  constructor(broker: ServiceBroker) {
    this.checkout = new CheckoutClient(broker);
    this.payment = new PaymentClient(broker);
    this.pricing = new PricingClient(broker);
    this.shipping = new ShippingClient(broker);
    this.inventory = new InventoryClient(broker);
  }
}

/**
 * Factory helper to create {@link ServiceApi}.
 * @param broker - Moleculer service broker
 */
export function createServiceApi(broker: ServiceBroker): ServiceApi {
  return new ServiceApi(broker);
}

export type {
  CheckoutApiClient,
  PaymentApiClient,
  PricingApiClient,
  ShippingApiClient,
  InventoryApiClient
};
