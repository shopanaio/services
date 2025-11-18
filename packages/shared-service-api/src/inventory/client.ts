import type { BrokerLike } from "../broker";
import type { InventoryApiClient, GetOffersResponse } from "./types";
import type {
  GetOffersInput,
  InventoryOffer,
} from "@shopana/plugin-sdk/inventory";

export class InventoryClient implements InventoryApiClient {
  private readonly broker: BrokerLike;

  constructor(broker: BrokerLike) {
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
