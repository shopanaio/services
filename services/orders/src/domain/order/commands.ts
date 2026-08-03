import type { OrderCreatedPayload } from "./events";

export type OrderCommandMetadata = Readonly<{
  apiKey: string;
  aggregateId: string;
  contractVersion: number;
  storeId: string;
  userId?: string;
  idempotencyKey?: string;
  now: Date;
}>;

export const OrderCommandTypes = {
  Create: "order.create",
} as const;

export type CreateOrderCommand = Readonly<{
  type: typeof OrderCommandTypes.Create;
  data: OrderCreatedPayload;
  metadata: OrderCommandMetadata;
}>;

export type OrderCommand = CreateOrderCommand;
