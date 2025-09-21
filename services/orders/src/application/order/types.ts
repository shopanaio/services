import type { OrderContext } from "@src/context/index.js";

export type { OrderContext };

export type CreateOrderInput = {
  checkoutId: string;
} & OrderContext;
