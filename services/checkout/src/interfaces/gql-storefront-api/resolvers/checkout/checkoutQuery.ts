import { App } from "@src/ioc/container";
import type {
  ApiCheckoutQueryCheckoutArgs,
  ApiCheckoutQuery,
} from "@src/interfaces/gql-storefront-api/types";
import { mapCheckoutReadToApi } from "@src/interfaces/gql-storefront-api/mapper/checkout";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { decodeGlobalIdByType } from "@src/interfaces/gql-storefront-api/idCodec";

/**
 * checkout(id: ID!): Checkout
 */
export const checkout = async (
  _parent: ApiCheckoutQuery,
  args: ApiCheckoutQueryCheckoutArgs
) => {
  const checkoutId = decodeGlobalIdByType(args.id, GlobalIdEntity.Checkout);
  const read = await App.getInstance().checkoutReadRepository.findById(checkoutId);
  return read ? mapCheckoutReadToApi(read) : null;
};
