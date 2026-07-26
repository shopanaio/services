// TODO(workspace): Remove .js extension from TypeScript imports according to workspace rules
import {
  // Query resolvers
  order,
  // Mutation resolvers
  orderCreate,
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
  Mutation: {
    orderMutation: (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      requireStorefrontPermission(
        context.storefrontAccess,
        STOREFRONT_PERMISSIONS.ORDER_WRITE,
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
  OrderMutation: {
    orderCreate,
  },
} as any;

export default orderResolvers;
