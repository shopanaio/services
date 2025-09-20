import { App } from "@src/ioc/container";
import type {
  ApiOrderQueryOrderArgs,
  ApiOrderQuery,
} from "@src/interfaces/gql-storefront-api/types";
import { mapOrderReadToApi } from "@src/interfaces/gql-storefront-api/mapper/order";

/**
 * order(id: ID!): Order
 */
export const order = async (
  _parent: ApiOrderQuery,
  args: ApiOrderQueryOrderArgs
) => {
  const read = await App.getInstance().orderReadRepository.findById(args.id);
  return read ? mapOrderReadToApi(read) : null;
};
