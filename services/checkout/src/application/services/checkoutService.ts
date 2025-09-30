import type { Discount, PricingApiClient } from "@shopana/shared-service-api";
import { CheckoutLineItemState } from "@src/domain/checkout/types";
import {
  CheckoutCostService,
  type CheckoutLineItemCost,
  type CheckoutCost,
} from "./checkoutCostService";
import type { InventoryApiClient, InventoryOffer } from "@shopana/shared-service-api";

// Re-export types for backward compatibility
export type { CheckoutLineItemCost, CheckoutCost };

export class CheckoutService {
  private readonly costService: CheckoutCostService;

  constructor(
    private readonly pricingApi: PricingApiClient,
    private readonly inventory: InventoryApiClient,
  ) {
    this.costService = new CheckoutCostService(pricingApi);
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
    checkoutLines: CheckoutLineItemState[];
    appliedDiscounts?: Discount[] | null;
    currency: string;
  }): Promise<{
    checkoutCost: CheckoutCost;
    checkoutLinesCost: Record<string, CheckoutLineItemCost>;
    appliedDiscounts: Discount[];
  }> {
    return this.costService.computeTotals(input);
  }
}
