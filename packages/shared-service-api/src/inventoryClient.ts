import type { ServiceBroker } from "moleculer";
import type { InventoryApiClient, GetOffersResponse } from "./inventoryTypes";
import type {
  GetOffersInput,
  InventoryOffer,
} from "@shopana/plugin-sdk/inventory";

export class InventoryClient implements InventoryApiClient {
  private readonly broker: ServiceBroker;

  constructor(broker: ServiceBroker) {
    this.broker = broker;
  }

  /** @inheritdoc */
  async getOffers(input: GetOffersInput): Promise<InventoryOffer[]> {
    const data = (await this.broker.call(
      "inventory.getOffers",
      input
    )) as GetOffersResponse;
    return data.offers ?? [];
  }
}
