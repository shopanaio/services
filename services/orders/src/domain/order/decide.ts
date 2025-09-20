import {
  OrderEventTypes,
  OrderEventsContractVersion,
  type OrderEvent,
} from "./events";
import type { OrderCommand } from "./commands";
import type { OrderState } from "./evolve";

export const orderDecide = (
  command: OrderCommand,
  state: OrderState
): OrderEvent | OrderEvent[] => {
  // Basic existence check
  if (command.type !== "order.create" && !state.exists) {
    throw new Error("Order does not exist");
  }

  switch (command.type) {
    case "order.create": {
      return [
        {
          type: OrderEventTypes.OrderCreated,
          data: command.data,
          metadata: {
            ...command.metadata,
            contractVersion: OrderEventsContractVersion,
          },
        },
      ];
    }

    default:
      return [];
  }
};
