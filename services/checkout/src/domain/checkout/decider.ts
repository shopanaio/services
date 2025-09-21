import { Decider } from "@event-driven-io/emmett";
import type { CheckoutEvent } from "./events";
import type { CheckoutCommand } from "./commands";
import { checkoutEvolve, CheckoutState, checkoutInitialState } from "./evolve";
import { checkoutDecide } from "./decide";

// Re-export types for convenience
export type {
  CheckoutState,
  CheckoutLineItemState,
  CheckoutDeliveryAddress,
  CheckoutDeliveryProvider,
  CheckoutDeliveryMethod,
  CheckoutDeliveryGroup,
} from "./evolve";

// Re-export functions
export { checkoutEvolve, checkoutInitialState } from "./evolve";
export { checkoutDecide } from "./decide";

export const checkoutDecider: Decider<
  CheckoutState,
  CheckoutCommand,
  CheckoutEvent
> = {
  decide: checkoutDecide,
  evolve: checkoutEvolve,
  initialState: checkoutInitialState,
};
