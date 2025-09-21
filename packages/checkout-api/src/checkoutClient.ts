import type { ServiceBroker } from "moleculer";
import type { Checkout } from "@shopana/checkout-sdk";

export interface CheckoutApiClient {
  getByCheckoutId(input: {
    projectId: string;
    checkoutId: string;
    customerId?: string | null;
  }): Promise<Checkout>;
}

export class CheckoutClient implements CheckoutApiClient {
  private readonly broker: ServiceBroker;

  constructor(broker: ServiceBroker) {
    this.broker = broker;
  }

  async getByCheckoutId(input: {
    projectId: string;
    checkoutId: string;
    customerId?: string | null;
  }): Promise<Checkout> {
    return (await this.broker.call(
      "checkout.getById",
      input
    )) as Checkout;
  }
}
