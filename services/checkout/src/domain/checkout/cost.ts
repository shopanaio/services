import { Money } from "@shopana/money";

export type CheckoutLineCostSnapshot = Readonly<{
  lineId: string;
  subtotal: Money;
  discount: Money;
  tax: Money;
  total: Money;
}>;

export type CheckoutTotalsSnapshot = Readonly<{
  subtotal: Money;
  discountTotal: Money;
  taxTotal: Money;
  shippingTotal: Money;
  grandTotal: Money;
  totalQuantity: number;
}>;

/**
 * Universal cost snapshot that is attached to the payload of commands/events
 * that change prices. Allows evolve/projection to apply calculated values
 * without knowledge of business rules.
 */
export type CheckoutCostSnapshot = Readonly<{
  checkoutLinesCost?: Record<string, CheckoutLineCostSnapshot>;
  totals: CheckoutTotalsSnapshot;
}>;
