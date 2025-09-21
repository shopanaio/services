import type { Discount, PricingApiClient } from "@shopana/pricing-api";
import type { OrderLineItemState } from "@src/domain/order/evolve";
import {
  OrderCostService,
  type OrderLineItemCost,
  type OrderCost,
} from "./orderCostService";
import { InventoryApiClient, InventoryOffer } from "@shopana/inventory-api";

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
    projectId: string;
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
      projectId: input.projectId,
      apiKey: input.apiKey,
    });
    const map: Map<string, InventoryOffer> = new Map(
      offers.map((offer) => [offer.purchasableId, offer]),
    );
    return { offers: map };
  }

  async computeTotals(input: {
    projectId: string;
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
