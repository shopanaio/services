import type { ServiceBroker } from "moleculer";
import { deserializeCheckout } from "@shopana/checkout-sdk";
import type { Checkout, CheckoutDto } from "@shopana/checkout-sdk";

export interface CheckoutApiClient {
  getById(checkoutId: string, projectId: string): Promise<Checkout>;
}

export class CheckoutClient implements CheckoutApiClient {
  private readonly broker: ServiceBroker;

  constructor(broker: ServiceBroker) {
    this.broker = broker;
  }

  async getById(checkoutId: string, projectId: string): Promise<Checkout> {
    const dto = (await this.broker.call("checkout.getById", {
      checkoutId,
      projectId,
    })) as CheckoutDto;
    try {
      return deserializeCheckout(dto);
    } catch (error) {
      console.error("Error deserializing checkout", error);
      throw error;
    }
  }
}
