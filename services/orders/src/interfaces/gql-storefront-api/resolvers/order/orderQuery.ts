import { App } from "@src/ioc/container";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";
import type { ApiOrder } from "@src/interfaces/gql-storefront-api/types";

type OrderQueryArgs = {
  id: string;
};

/**
 * order(id: ID!): Order
 */
export const order = async (
  _parent: unknown,
  args: OrderQueryArgs,
): Promise<ApiOrder | null> => {
  const app = App.getInstance();
  const read = await app.orderReadRepository.findById(args.id);
  return read ? mapOrderReadToApi(read) : null;
};
