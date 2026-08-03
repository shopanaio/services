// TODO(workspace): Remove .js extension from TypeScript imports according to workspace rules
import {
  // Query resolvers
  order,
  orders,
} from "./order/index";

const orderResolvers = {
  Query: {
    orderQuery: (_parent: unknown) => ({}),
  },
  OrderQuery: {
    order,
    orders,
  },
  Order: {
    // Fields totalQuantity and lines are filled in mapper from full read-model
  },
} as any;

export default orderResolvers;
