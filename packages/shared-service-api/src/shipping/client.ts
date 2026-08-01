import type { BrokerLike } from "../broker";
import type {
  ShippingApiClient,
  GetAllMethodsResponse,
  CreateDeliveryGroupsInput,
  CreateDeliveryGroupsResponse,
  DeliveryGroup,
  ShippingMethod,
} from "./types";

export class ShippingClient implements ShippingApiClient {
  private readonly broker: BrokerLike;

  constructor(broker: BrokerLike) {
    this.broker = broker;
  }

  /** @inheritdoc */
  async getProjectMethods(input: {
    storeId: string;
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
