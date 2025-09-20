import { Money } from "@shopana/shared-money";

export type OrderLineCostSnapshot = Readonly<{
  lineId: string;
  subtotal: Money;
  discount: Money;
  tax: Money;
  total: Money;
}>;

export type OrderTotalsSnapshot = Readonly<{
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
export type OrderCostSnapshot = Readonly<{
  orderLinesCost?: Record<string, OrderLineCostSnapshot>;
  totals: OrderTotalsSnapshot;
}>;
