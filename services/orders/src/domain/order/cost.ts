import { Money } from "@shopana/shared-money";

export type OrderLineCostSnapshot = {
  lineId: string;
  subtotal: Money;
  discount: Money;
  tax: Money;
  total: Money;
};

export type OrderTotalsSnapshot = {
  subtotal: Money;
  discountTotal: Money;
  taxTotal: Money;
  shippingTotal: Money;
  grandTotal: Money;
};

/**
 * Universal cost snapshot that is attached to the payload of commands/events
 * that change prices. Allows evolve/projection to apply calculated values
 * without knowledge of business rules.
 */
export type OrderCostSnapshot = {
  orderLinesCost?: Record<string, OrderLineCostSnapshot>;
  totals: OrderTotalsSnapshot;
};
