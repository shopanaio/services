// TODO(workspace): Remove .js extension from TypeScript imports according to workspace rules
import {
  // Query resolvers
  order,
  orders,
  // Mutation resolvers
  orderCreate,
  orderAdminNoteUpdate,
  orderCommentAdd,
  orderCancel,
  orderClose,
} from "./order/index";

const orderResolvers = {
  Query: {
    orderQuery: (_parent: unknown) => ({}),
  },
  Mutation: {
    orderMutation: (_parent: unknown) => ({}),
  },
  OrderQuery: {
    order,
    orders,
  },
  Order: {
    // Fields totalQuantity and lines are filled in mapper from full read-model
  },
  OrderMutation: {
    orderCreate,
    orderAdminNoteUpdate,
    orderCommentAdd,
    orderCancel,
    orderClose,
  },
} as any;

export default orderResolvers;
