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

/**
 * Child item input for bundled products
 */
export type GetOffersChildItem = {
  lineId: string;
  purchasableId: string;
  quantity: number;
};

/**
 * Item input for getting offers (supports nested children)
 */
export type GetOffersItem = {
  lineId: string;
  purchasableId: string;
  quantity: number;
  children?: GetOffersChildItem[];
};

export class CheckoutService {
  private readonly costService: CheckoutCostService;

  constructor(
    private readonly pricingApi: PricingApiClient,
    private readonly inventory: InventoryApiClient,
  ) {
    this.costService = new CheckoutCostService(pricingApi);
  }

  /**
   * Get offers from inventory with nested children support.
   * Returns offers array (not map) to preserve children structure.
   */
  async getOffers(input: {
    apiKey: string;
    currency: string;
    projectId: string;
    items: GetOffersItem[];
  }): Promise<{
    offers: InventoryOffer[];
  }> {
    const offers = await this.inventory.getOffers({
      ...input,
      projectId: input.projectId,
      apiKey: input.apiKey,
    });
    return { offers };
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
