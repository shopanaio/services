import type {
  ApiCustomer,
  ApiCustomerOrdersArgs,
  ApiOrderConnection,
} from "@src/interfaces/gql-storefront-api/types";

/**
 * Customer.orders: OrderConnection!
 */
export const customerOrders = async (
  _parent: ApiCustomer,
  _args: ApiCustomerOrdersArgs,
): Promise<ApiOrderConnection> => ({
  __typename: "OrderConnection",
  edges: [],
  nodes: [],
  pageInfo: {
    __typename: "PageInfo",
    endCursor: null,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
  },
  totalCount: 0,
});
