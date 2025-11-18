import { App } from "@src/ioc/container";
import type {
  ApiOrderQueryOrderArgs,
  ApiOrderQuery,
} from "@src/interfaces/gql-admin-api/types";
import { mapOrderReadToApi } from "@src/interfaces/gql-admin-api/mapper/order";

/**
 * order(id: ID!): Order
 */
export const order = async (
  _parent: ApiOrderQuery,
  args: ApiOrderQueryOrderArgs
) => {
  const app = App.getInstance();
  const read = await app.orderReadRepository.findById(args.id);
  return read ? mapOrderReadToApi(read) : null;
};
