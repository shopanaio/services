import type { CreateEventType } from "@event-driven-io/emmett";
import { OrderCommandMetadata } from "@src/domain/order/commands";
import type { CheckoutSnapshot } from "@src/domain/order/checkoutSnapshot";
import { Money } from "@shopana/shared-money";
import type { OrderUnitSnapshot, AppliedDiscount } from "@src/domain/order/evolve";

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

  // Customer identity slice (no PII)
  customerId: string | null;
  customerCountryCode: string | null;

  // Order business state (independent from checkout snapshot)
  lines: ReadonlyArray<{
    lineId: string;
    quantity: number;
    unit: OrderUnitSnapshot;
  }>;
  deliveryGroups: ReadonlyArray<{
    id: string;
    orderLineIds: string[];
    /** Identifier of PII address record stored separately. */
    deliveryAddressId: string | null;
    deliveryCost: {
      amount: Money;
      paymentModel: string;
    } | null;
  }>;
  appliedDiscounts: AppliedDiscount[];

  // Original checkout snapshot for audit/troubleshooting
  checkoutSnapshot: CheckoutSnapshot;
}>;

export type OrderCreated = CreateEventType<
  typeof OrderEventTypes.OrderCreated,
  OrderCreatedPayload,
  OrderCommandMetadata
>;

export type OrderEvent = OrderCreated;
