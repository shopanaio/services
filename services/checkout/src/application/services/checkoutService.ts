import type { Discount } from "@shopana/shared-service-api";
import { CheckoutLineItemState } from "@src/domain/checkout/types";
import {
  CheckoutCostService,
  type CheckoutLineItemCost,
  type CheckoutCost,
} from "./checkoutCostService";

// Re-export types for backward compatibility
export type { CheckoutLineItemCost, CheckoutCost };

export class CheckoutService {
  private readonly costService: CheckoutCostService;

  constructor() {
    this.costService = new CheckoutCostService();
  }

  async computeTotals(input: {
    storeId: string;
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
