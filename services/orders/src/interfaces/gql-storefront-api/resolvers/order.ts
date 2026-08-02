// TODO(workspace): Remove .js extension from TypeScript imports according to workspace rules
import {
  // Query resolvers
  order,
  // Field resolvers
  userOrders,
} from "./order/index";
import {
  requireStorefrontPermission,
  STOREFRONT_PERMISSIONS,
} from "@shopana/shared-context";
import type { GraphQLContext } from "../context";

const orderResolvers = {
  Query: {
    orderQuery: (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      requireStorefrontPermission(
        context.storefrontAccess,
        STOREFRONT_PERMISSIONS.ORDER_READ,
      );
      return {};
    },
  },
  OrderQuery: {
    order,
  },
  Order: {
    // Fields totalQuantity and lines are filled in mapper from full read-model
  },
  User: {
    orders: userOrders,
  },
} as any;

export default orderResolvers;
