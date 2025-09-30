import type { ServiceBroker } from "moleculer";
import type { PaymentMethod } from "@shopana/plugin-sdk/payment";
import type {
  PaymentApiClient,
  GetPaymentMethodsInput,
  GetPaymentMethodsResponse
} from "./types";

export class PaymentClient implements PaymentApiClient {
  private readonly broker: ServiceBroker;

  constructor(broker: ServiceBroker) {
    this.broker = broker;
  }

  /** @inheritdoc */
  async getPaymentMethods(input: GetPaymentMethodsInput): Promise<PaymentMethod[]> {
    const data = (await this.broker.call(
      "payments.getPaymentMethods",
      input
    )) as GetPaymentMethodsResponse;

    return data.methods ?? [];
  }
}
