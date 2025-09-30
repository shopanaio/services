import type { ServiceBroker } from "moleculer";
import type {
  ShippingApiClient,
  GetAllMethodsResponse,
  CreateDeliveryGroupsInput,
  CreateDeliveryGroupsResponse,
  DeliveryGroup,
  GetPaymentMethodsInput,
  GetPaymentMethodsResponse,
} from "./shippingTypes";
import type { ShippingMethod } from "@shopana/plugin-sdk/shipping";
import type { PaymentMethod } from "@shopana/plugin-sdk/payment";

export class ShippingClient implements ShippingApiClient {
  private readonly broker: ServiceBroker;

  constructor(broker: ServiceBroker) {
    this.broker = broker;
  }

  /** @inheritdoc */
  async getProjectMethods(input: {
    projectId: string;
    apiKey: string;
  }): Promise<ShippingMethod[]> {
    const data = (await this.broker.call(
      "shipping.shippingMethods",
      input
    )) as GetAllMethodsResponse;

    return data.methods ?? [];
  }

  /** @inheritdoc */
  async createDeliveryGroups(
    input: CreateDeliveryGroupsInput
  ): Promise<DeliveryGroup[]> {
    const data = (await this.broker.call(
      "shipping.createDeliveryGroups",
      input
    )) as CreateDeliveryGroupsResponse;

    return data.groups ?? [];
  }

  /** @inheritdoc */
  async getPaymentMethods(input: GetPaymentMethodsInput): Promise<PaymentMethod[]> {
    const data = (await this.broker.call(
      "shipping.paymentMethods",
      input
    )) as GetPaymentMethodsResponse;

    return data.methods ?? [];
  }
}
