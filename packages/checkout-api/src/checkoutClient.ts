import type { ServiceBroker } from "moleculer";
import { deserializeCheckout } from "@shopana/checkout-sdk";
import type { Checkout, CheckoutDto } from "@shopana/checkout-sdk";

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
    const dto = (await this.broker.call(
      "checkout.getById",
      input
    )) as CheckoutDto;

    return deserializeCheckout(dto);
  }
}
