import type { Discount, PricingApiClient } from "@shopana/shared-service-api";
import type { OrderLineItemState } from "@src/domain/order/evolve";
import {
  OrderCostService,
  type OrderLineItemCost,
  type OrderCost,
} from "./orderCostService";
import type { InventoryApiClient, InventoryOffer } from "@shopana/shared-service-api";

// Re-export types for backward compatibility
export type { OrderLineItemCost, OrderCost };

export class OrderService {
  private readonly costService: OrderCostService;

  constructor(
    private readonly pricingApi: PricingApiClient,
    private readonly inventory: InventoryApiClient,
  ) {
    this.costService = new OrderCostService(pricingApi);
  }

  async getOffers(input: {
    apiKey: string;
    currency: string;
    storeId: string;
    items: Array<{
      lineId: string;
      purchasableId: string;
      quantity: number;
    }>;
  }): Promise<{
    offers: Map<string, InventoryOffer>;
  }> {
    const offers = await this.inventory.getOffers({
      ...input,
      storeId: input.storeId,
      apiKey: input.apiKey,
    });
    const map: Map<string, InventoryOffer> = new Map(
      offers.map((offer) => [offer.purchasableId, offer]),
    );
    return { offers: map };
  }

  async computeTotals(input: {
    storeId: string;
    orderLines: OrderLineItemState[];
    appliedDiscounts?: Discount[] | null;
    currency: string;
  }): Promise<{
    orderCost: OrderCost;
    orderLinesCost: Record<string, OrderLineItemCost>;
    appliedDiscounts: Discount[];
  }> {
    return this.costService.computeTotals(input);
  }
}
