import { App } from "@src/ioc/container";
import type {
  ApiCheckoutQueryCheckoutArgs,
  ApiCheckoutQuery,
} from "@src/interfaces/gql-storefront-api/types";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { decodeGlobalIdByType } from "@src/interfaces/gql-storefront-api/idCodec";

/**
 * checkout(id: ID!): Checkout
 */
export const checkout = async (
  _parent: ApiCheckoutQuery,
  args: ApiCheckoutQueryCheckoutArgs,
  ctx: import("@src/interfaces/gql-storefront-api/context").GraphQLContext,
) => {
  const checkoutId = decodeGlobalIdByType(args.id, GlobalIdEntity.Checkout);
  const read = await App.getInstance().checkoutMutationRepository.load({
    checkoutId,
    storeId: ctx.store.id,
  });
  return read ? mapCommittedCheckoutToApi(read) : null;
};
