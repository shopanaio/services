import type { BrokerLike } from "../broker";
import { deserializeCheckout } from "@shopana/checkout-sdk";
import type { Checkout, CheckoutDto } from "@shopana/checkout-sdk";
import { CheckoutCompletionActions, type Checkout as CheckoutBroker } from "@shopana/broker-types";

export interface CheckoutApiClient {
  getById(checkoutId: string, storeId: string): Promise<Checkout>;
  getCompletion(
    checkoutId: string,
    storeId: string,
  ): Promise<CheckoutBroker.GetCheckoutCompletionResult>;
}

export class CheckoutClient implements CheckoutApiClient {
  private readonly broker: BrokerLike;

  constructor(broker: BrokerLike) {
    this.broker = broker;
  }

  async getById(checkoutId: string, storeId: string): Promise<Checkout> {
    const dto = (await this.broker.call("checkout.getById", {
      checkoutId,
      storeId,
    })) as CheckoutDto;
    try {
      return deserializeCheckout(dto);
    } catch (error) {
      console.error("Error deserializing checkout", error);
      throw error;
    }
  }

  async getCompletion(
    checkoutId: string,
    storeId: string,
  ): Promise<CheckoutBroker.GetCheckoutCompletionResult> {
    return this.broker.call(CheckoutCompletionActions.get, {
      checkoutId,
      storeId,
    }) as Promise<CheckoutBroker.GetCheckoutCompletionResult>;
  }
}
