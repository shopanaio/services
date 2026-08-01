import { Money } from "@shopana/shared-money";
import type { Discount } from "@shopana/shared-service-api";
import { DiscountType } from "@shopana/shared-service-api";
import { CheckoutLineItemState } from "@src/domain/checkout/types";

export type CheckoutLineItemCost = Readonly<{
  lineId: string;
  quantity: number;
  unitPrice: Money;
  unitCompareAtPrice: Money | null;
  subtotal: Money;
  discount: Money;
  tax: Money;
  total: Money;
}>;

export type CheckoutCost = Readonly<{
  subtotal: Money;
  discountTotal: Money;
  taxTotal: Money;
  shippingTotal: Money;
  grandTotal: Money;
  totalQuantity: number;
}>;

type ComputeTotalsInput = {
  storeId: string;
  checkoutLines: CheckoutLineItemState[];
  appliedDiscounts?: Discount[] | null;
  currency: string;
};

type ComputeTotalsResult = {
  checkoutCost: CheckoutCost;
  checkoutLinesCost: Record<string, CheckoutLineItemCost>;
  appliedDiscounts: Discount[];
};

/**
 * Service for calculating cart cost and applying discounts.
 *
 * Responsible for:
 * - Calculating base cost of items in cart
 * - Getting and applying discounts from pricing service
 * - Proportional distribution of cart-level discounts
 * - Calculating final totals
 */
export class CheckoutCostService {
  /**
   * Calculates the full cost of the cart taking into account all discounts.
   *
   * Main service method that coordinates the entire calculation process:
   * 1. Creates base cart items with initial prices
   * 2. Gets discounts from pricing service (with fallback to provided discounts)
   * 3. Applies discounts at individual item level
   * 4. Applies cart-level discounts with proportional distribution
   * 5. Calculates final totals
   *
   * @param input - Input data for calculation
   * @param input.checkoutLines - List of items in cart
   * @param input.appliedDiscounts - Fallback discounts (used if pricing service is unavailable)
   * @param input.currency - Currency for calculations
   * @returns Calculation result with item breakdown and total cost
   */
  async computeTotals(input: ComputeTotalsInput): Promise<ComputeTotalsResult> {
    const baseLineItems = this.buildBaseLineItems(input.checkoutLines);
    const discountsResult = await this.resolveDiscounts(input);

    // Line-level discounts are not supported yet, so we skip this step

    // Checkout-level discounts are applied without distribution across items
    const checkoutCost = this.calculateCheckoutCostWithDiscounts(
      baseLineItems,
      input.checkoutLines,
      discountsResult.aggregatedDiscounts
    );
    const checkoutLinesCost = this.buildLinesCostMap(baseLineItems);

    return {
      checkoutCost,
      checkoutLinesCost,
      appliedDiscounts: discountsResult.aggregatedDiscounts,
    };
  }

  /**
   * Creates base cost elements for each item in the cart.
   *
   * Converts cart item states into structures for cost calculation.
   * At this stage, discounts and taxes are zero, and total cost equals subtotal.
   *
   * @param checkoutLines - List of items in cart with their state
   * @returns List of base cost elements without applied discounts
   */
  private buildBaseLineItems(
    checkoutLines: CheckoutLineItemState[]
  ): CheckoutLineItemCost[] {
    return checkoutLines.map((line) => {
      const lineSubtotal = line.unit.price.multiply(line.quantity);
      return {
        lineId: line.lineId,
        quantity: line.quantity,
        unitPrice: line.unit.price,
        unitCompareAtPrice: line.unit.compareAtPrice,
        subtotal: lineSubtotal,
        discount: Money.zero(),
        tax: Money.zero(),
        total: lineSubtotal,
      };
    });
  }

  /**
   * Determines the source of discounts and retrieves their list.
   *
   * Attempts to get discounts from pricing service. In case of error (service unavailability,
   * network issues, etc.) uses provided discounts as fallback source.
   *
   * @param input - Input data with items and fallback discounts
   * @returns Object with cart-level discounts and discounts for individual items
   * @private
   */
  private async resolveDiscounts(input: ComputeTotalsInput): Promise<{
    aggregatedDiscounts: Discount[];
    lineDiscounts: Record<string, Discount[]>;
  }> {
    void input;
    // TODO(checkout-rewrite): use pricing.calculateQuote and its immutable
    // discount allocations instead of this temporary placeholder.
    return {
      aggregatedDiscounts: [],
      lineDiscounts: {},
    };
  }

  /**
   * Calculates the total discount amount for a given amount and list of discounts.
   *
   * Supports both percentage and fixed discounts. For each discount, the amount is calculated
   * and summed with others.
   *
   * @param amount - Base amount to which discounts are applied
   * @param discounts - List of discounts to apply
   * @returns Total discount amount
   * @private
   */
  private calculateDiscountAmount(amount: Money, discounts: Discount[]): Money {
    return discounts.reduce((total, discount) => {
      switch (discount.type) {
        case DiscountType.PERCENTAGE: {
          if (typeof discount.value !== "number") {
            throw new Error("Percentage discount value must be a number");
          }
          const amountMinor = amount.amountMinor();
          const discountMinor = (amountMinor * BigInt(discount.value)) / 100n;
          return total.add(
            Money.fromMinor(discountMinor, amount.currency().code)
          );
        }
        case DiscountType.FIXED: {
          if (typeof discount.value !== "number") {
            throw new Error("Fixed discount value must be a number");
          }
          return total.add(
            Money.fromMinor(BigInt(discount.value), amount.currency().code)
          );
        }
        default:
          return total;
      }
    }, Money.zero());
  }

  /**
   * Calculates the final cart cost with checkout-level discounts applied.
   *
   * Simplified logic without distributing discounts across items:
   * 1. Calculates subtotal of all items (parents + children)
   * 2. Applies checkout-level discounts to the total amount
   * 3. Returns final cost indicators
   *
   * Note: Total quantity counts only parent items (children are part of parent bundles).
   * Children prices are already adjusted by their priceConfig.
   *
   * @param lineItems - Base items without discounts
   * @param checkoutLines - Original checkout lines for parent/child detection
   * @param aggregatedDiscounts - Aggregated discounts from pricing service
   * @returns Final cart cost indicators
   * @private
   */
  private calculateCheckoutCostWithDiscounts(
    lineItems: CheckoutLineItemCost[],
    checkoutLines: CheckoutLineItemState[],
    aggregatedDiscounts: Discount[]
  ): CheckoutCost {
    const subtotal = lineItems.reduce(
      (total, line) => total.add(line.subtotal),
      Money.zero()
    );

    // Count quantity only for parent items (children are part of parent)
    const parentLines = checkoutLines.filter((line) => !line.parentLineId);
    const totalQuantity = parentLines.reduce(
      (total, line) => total + line.quantity,
      0
    );

    // Apply checkout-level discounts to total amount
    const discountTotal = this.calculateDiscountAmount(
      subtotal,
      aggregatedDiscounts
    );
    const grandTotal = subtotal.subtract(discountTotal);

    return {
      subtotal,
      discountTotal,
      taxTotal: Money.zero(),
      shippingTotal: Money.zero(),
      grandTotal,
      totalQuantity,
    };
  }

  /**
   * Converts array of items to map for fast access by ID.
   *
   * Creates a dictionary object where the key is the item ID and the value is
   * complete information about the item cost. Used for convenient
   * access to specific item cost data.
   *
   * @param lineItems - Array of items with their cost
   * @returns Dictionary of items indexed by lineId
   * @private
   */
  private buildLinesCostMap(
    lineItems: CheckoutLineItemCost[]
  ): Record<string, CheckoutLineItemCost> {
    return lineItems.reduce(
      (map, line) => ({ ...map, [line.lineId]: line }),
      {} as Record<string, CheckoutLineItemCost>
    );
  }

}
