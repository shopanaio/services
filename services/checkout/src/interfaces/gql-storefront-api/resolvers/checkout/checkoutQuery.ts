import { App } from "@src/ioc/container";
import type {
  ApiCheckoutQueryCheckoutArgs,
  ApiCheckoutQuery,
} from "@src/interfaces/gql-storefront-api/types";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";

/**
 * checkout(id: ID!): Checkout
 */
export const checkout = async (
  _parent: ApiCheckoutQuery,
  args: ApiCheckoutQueryCheckoutArgs
) => {
  const read = await App.getInstance().checkoutReadRepository.findById(args.id);
  return read ? mapCheckoutReadToApi(read) : null;
};
