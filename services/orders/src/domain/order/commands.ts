import type {
  CreateCommandType,
  DefaultCommandMetadata,
} from "@event-driven-io/emmett";

import type { OrderCreatedPayload } from "./events";

export type OrderCommandMetadata = DefaultCommandMetadata & {
  apiKey: string;
  aggregateId: string;
  contractVersion: number;
  projectId: string;
  userId?: string;
  now: Date;
};

export const OrderCommandTypes = {
  Create: "order.create",
} as const;

export type CreateOrderCommand = CreateCommandType<
  typeof OrderCommandTypes.Create,
  OrderCreatedPayload,
  OrderCommandMetadata
>;

export type OrderCommand = CreateOrderCommand;
