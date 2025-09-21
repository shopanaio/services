import type { CreateEventType } from "@event-driven-io/emmett";
import { OrderCommandMetadata } from "@src/domain/order/commands";
import type { CheckoutSnapshot } from "@src/domain/order/checkoutSnapshot";
import { Money } from "@shopana/shared-money";

export const OrderEventTypes = {
  OrderCreated: "order.created",
} as const;

export const OrderEventsContractVersion = 1 as const;

export type OrderCreatedPayload = Readonly<{
  // Core identification/context
  currencyCode: string;
  idempotencyKey: string;
  salesChannel: string | null;
  externalSource: string | null;
  externalId: string | null;
  localeCode: string | null;

  // Totals at the moment of order creation
  subtotalAmount: Money;
  totalDiscountAmount: Money;
  totalTaxAmount: Money;
  totalShippingAmount: Money;
  totalAmount: Money;

  // Customer identity slice
  customerEmail: string | null;
  customerPhone: string | null;
  customerId: string | null;
  customerCountryCode: string | null;
  customerNote: string | null;

  // Original checkout snapshot for audit/troubleshooting
  checkoutSnapshot: CheckoutSnapshot;
}>;

export type OrderCreated = CreateEventType<
  typeof OrderEventTypes.OrderCreated,
  OrderCreatedPayload,
  OrderCommandMetadata
>;

export type OrderEvent = OrderCreated;
