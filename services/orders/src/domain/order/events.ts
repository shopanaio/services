import type { CreateEventType } from "@event-driven-io/emmett";
import { OrderCommandMetadata } from "@src/domain/order/commands";

export const OrderEventTypes = {
  OrderCreated: "order.created",
} as const;

export const OrderEventsContractVersion = 1 as const;

export type OrderCreatedPayload = Readonly<{
  currencyCode: string;
  idempotencyKey: string;
}>;

export type OrderCreated = CreateEventType<
  typeof OrderEventTypes.OrderCreated,
  OrderCreatedPayload,
  OrderCommandMetadata
>;

export type OrderEvent = OrderCreated;
