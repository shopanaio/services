import type { ServiceBroker } from "moleculer";
import type { ShippingApiClient, GetAllMethodsResponse } from "./types";
import type {
  CreateDeliveryGroupsInput,
  CreateDeliveryGroupsResponse,
  DeliveryGroup,
} from "./types";
import { ShippingMethod } from "@shopana/shipping-plugin-sdk";

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
}
