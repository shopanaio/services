import { Decider } from "@event-driven-io/emmett";
import type { OrderEvent } from "./events";
import type { OrderCommand } from "./commands";
import { orderEvolve, OrderState, orderInitialState } from "./evolve";
import { orderDecide } from "./decide";

// Re-export types for convenience
export type { OrderState } from "./evolve";

// Re-export functions
export { orderEvolve, orderInitialState } from "./evolve";
export { orderDecide } from "./decide";

export const orderDecider: Decider<
  OrderState,
  OrderCommand,
  OrderEvent
> = {
  decide: orderDecide,
  evolve: orderEvolve,
  initialState: orderInitialState,
};
